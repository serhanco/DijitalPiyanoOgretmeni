package io.github.serhanco.piyano;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.view.WindowManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * MIDI for the Android app: the WebView has no Web MIDI, so the web code's
 * nativeMidi.ts shim talks to Android's MIDI service (USB and Bluetooth LE
 * MIDI) through this plugin. Incoming bytes go to JavaScript as "message"
 * events with how long ago they arrived, so the game clock can place them.
 */
@CapacitorPlugin(
    name = "NativeMidi",
    permissions = {
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class NativeMidiPlugin extends Plugin {

    /** The standard Bluetooth LE MIDI service. */
    private static final ParcelUuid MIDI_SERVICE = ParcelUuid.fromString("03B80E5A-EDE8-4B33-A751-6CE34EC4C700");

    private MidiManager midi;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<Integer, MidiDevice> opened = new HashMap<>();
    private final Map<Integer, MidiInputPort> inputs = new HashMap<>();
    private final List<MidiOutputPort> outputs = new ArrayList<>();
    private final Set<Integer> opening = Collections.synchronizedSet(new HashSet<>());
    private ScanCallback scan;

    @Override
    public void load() {
        midi = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
        if (midi == null) return;
        midi.registerDeviceCallback(
            new MidiManager.DeviceCallback() {
                @Override
                public void onDeviceAdded(MidiDeviceInfo info) {
                    open(info);
                    notifyListeners("devices", new JSObject());
                }

                @Override
                public void onDeviceRemoved(MidiDeviceInfo info) {
                    close(info.getId());
                    notifyListeners("devices", new JSObject());
                }
            },
            main
        );
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        JSArray list = new JSArray();
        if (midi != null) {
            for (MidiDeviceInfo info : devices()) {
                open(info);
                list.put(describe(info));
            }
        }
        JSObject ret = new JSObject();
        ret.put("available", midi != null);
        ret.put("devices", list);
        call.resolve(ret);
    }

    @PluginMethod
    public void send(PluginCall call) {
        Integer id = call.getInt("id");
        JSArray data = call.getArray("data");
        MidiInputPort port = id == null ? null : inputs.get(id);
        if (port == null || data == null) {
            call.resolve();
            return;
        }
        try {
            byte[] bytes = new byte[data.length()];
            for (int i = 0; i < bytes.length; i++) bytes[i] = (byte) data.getInt(i);
            port.send(bytes, 0, bytes.length);
            call.resolve();
        } catch (Exception e) {
            call.reject("send failed", e);
        }
    }

    /** Look for Bluetooth LE MIDI instruments for `seconds`; each found one comes as a "bluetoothFound" event. */
    @PluginMethod
    public void scanBluetooth(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "bluetooth" : "location";
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "scanAfterPermission");
            return;
        }
        startScan(call);
    }

    @PermissionCallback
    private void scanAfterPermission(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "bluetooth" : "location";
        if (getPermissionState(alias) == PermissionState.GRANTED) startScan(call);
        else call.reject("Bluetooth izni verilmedi");
    }

    @SuppressLint("MissingPermission")
    private void startScan(PluginCall call) {
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth kapalı");
            return;
        }
        BluetoothLeScanner scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            call.reject("Bluetooth LE yok");
            return;
        }
        stopScanning();
        scan = new ScanCallback() {
            @Override
            public void onScanResult(int type, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                JSObject found = new JSObject();
                found.put("address", device.getAddress());
                String name = device.getName();
                found.put("name", name != null ? name : device.getAddress());
                notifyListeners("bluetoothFound", found);
            }
        };
        List<ScanFilter> filters = new ArrayList<>();
        filters.add(new ScanFilter.Builder().setServiceUuid(MIDI_SERVICE).build());
        ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        scanner.startScan(filters, settings, scan);
        int seconds = call.getInt("seconds", 10);
        main.postDelayed(this::stopScanning, seconds * 1000L);
        call.resolve();
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        stopScanning();
        call.resolve();
    }

    @SuppressLint("MissingPermission")
    private void stopScanning() {
        if (scan == null) return;
        BluetoothAdapter adapter = adapter();
        if (adapter != null && adapter.getBluetoothLeScanner() != null) adapter.getBluetoothLeScanner().stopScan(scan);
        scan = null;
    }

    /** Connect a Bluetooth LE MIDI instrument found by the scan; it then shows up among the devices. */
    @PluginMethod
    public void connectBluetooth(PluginCall call) {
        String address = call.getString("address");
        BluetoothAdapter adapter = adapter();
        if (midi == null || adapter == null || address == null) {
            call.reject("Bluetooth MIDI kullanılamıyor");
            return;
        }
        stopScanning();
        BluetoothDevice device = adapter.getRemoteDevice(address);
        midi.openBluetoothDevice(
            device,
            (opened) -> {
                if (opened == null) {
                    call.reject("Bağlanamadı");
                    return;
                }
                attach(opened);
                notifyListeners("devices", new JSObject());
                call.resolve();
            },
            main
        );
    }

    /** Keep the screen on while a lesson runs (the learner's hands are on the keys, not the screen). */
    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
        call.resolve();
    }

    private BluetoothAdapter adapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    @SuppressWarnings("deprecation")
    private MidiDeviceInfo[] devices() {
        return midi.getDevices();
    }

    private JSObject describe(MidiDeviceInfo info) {
        Bundle p = info.getProperties();
        JSObject d = new JSObject();
        d.put("id", info.getId());
        String name = p.getString(MidiDeviceInfo.PROPERTY_NAME);
        if (name == null) name = p.getString(MidiDeviceInfo.PROPERTY_PRODUCT);
        d.put("name", name != null ? name : "MIDI klavye");
        String maker = p.getString(MidiDeviceInfo.PROPERTY_MANUFACTURER);
        d.put("manufacturer", maker != null ? maker : "");
        d.put("inputs", info.getInputPortCount());
        d.put("outputs", info.getOutputPortCount());
        d.put("bluetooth", info.getType() == MidiDeviceInfo.TYPE_BLUETOOTH);
        return d;
    }

    private void open(MidiDeviceInfo info) {
        int id = info.getId();
        if (opened.containsKey(id) || !opening.add(id)) return;
        midi.openDevice(
            info,
            (device) -> {
                opening.remove(id);
                if (device != null) attach(device);
            },
            main
        );
    }

    private void attach(MidiDevice device) {
        MidiDeviceInfo info = device.getInfo();
        int id = info.getId();
        if (opened.containsKey(id)) return;
        opened.put(id, device);
        // The instrument's output ports carry its keys to us.
        for (int i = 0; i < info.getOutputPortCount(); i++) {
            MidiOutputPort port = device.openOutputPort(i);
            if (port == null) continue;
            port.connect(new Forward(id));
            outputs.add(port);
        }
        // Its first input port takes our notes (the example notes on the piano).
        if (info.getInputPortCount() > 0) {
            MidiInputPort in = device.openInputPort(0);
            if (in != null) inputs.put(id, in);
        }
    }

    private void close(int id) {
        MidiDevice device = opened.remove(id);
        MidiInputPort in = inputs.remove(id);
        try {
            if (in != null) in.close();
            if (device != null) device.close();
        } catch (IOException ignored) {}
    }

    private class Forward extends MidiReceiver {

        private final int id;

        Forward(int id) {
            this.id = id;
        }

        @Override
        public void onSend(byte[] msg, int offset, int count, long timestamp) {
            JSArray data = new JSArray();
            for (int i = 0; i < count; i++) data.put(msg[offset + i] & 0xff);
            JSObject e = new JSObject();
            e.put("id", id);
            e.put("data", data);
            // How long ago the bytes arrived; timestamps are on System.nanoTime().
            e.put("ageMs", Math.max(0, (System.nanoTime() - timestamp) / 1e6));
            notifyListeners("message", e);
        }
    }
}
