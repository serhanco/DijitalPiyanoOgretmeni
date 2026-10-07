# Dijital Piyano Öğretmeni

Duolingo tarzı ilerleme ve oyunlarla, Bluetooth/USB MIDI klavye üzerinden piyano öğreten bir uygulama.

Yol haritası: [docs/PLAN.md](docs/PLAN.md)

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm test         # birim testleri
npm run build    # üretim derlemesi (dist/)
```

MIDI için Chrome ya da Edge kullan (Android, Windows, Mac, Linux). Web MIDI yalnızca HTTPS ya da `localhost` üzerinde çalışır.
Klavye yoksa ekran klavyesi ya da bilgisayar klavyesi (A S D F G H J K…, Z/X oktav) kullanılabilir.

## Yapı

| Klasör                          | İçerik                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `src/music`                     | Nota adları, porte konumları                                                   |
| `src/midi`                      | Web MIDI bağlantısı ve mesaj çözümleme                                         |
| `src/input`                     | Tüm girişleri (MIDI, ekran, bilgisayar klavyesi) tek akışta toplayan olay yolu |
| `src/audio`                     | Tone.js ile piyano sesi                                                        |
| `src/games`                     | Oyun mantığı (React'ten bağımsız, test edilebilir)                             |
| `src/components`, `src/screens` | Arayüz                                                                         |
