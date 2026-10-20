// Android hands MIDI bytes over in buffers that can hold several messages and
// use running status (a message without its status byte repeats the last one);
// the web code parses one message at a time.

/** Data bytes that follow a status byte; -1 for system exclusive (until 0xF7). */
function dataLength(status: number): number {
  if (status < 0xf0) return (status & 0xe0) === 0xc0 ? 1 : 2 // program change and channel pressure take 1
  if (status === 0xf0) return -1
  if (status === 0xf1 || status === 0xf3) return 1
  if (status === 0xf2) return 2
  return 0
}

/** Split a buffer into whole messages. `running` is the last channel status, carried between buffers. */
export function splitMidi(bytes: ArrayLike<number>, running = { status: 0 }): number[][] {
  const out: number[][] = []
  let i = 0
  while (i < bytes.length) {
    let status = bytes[i]
    if (status < 0x80) {
      // Running status: reuse the last channel message's status.
      if (!running.status) {
        i++
        continue
      }
      status = running.status
    } else {
      i++
      if (status >= 0xf8) {
        out.push([status]) // real-time bytes stand alone, even in the middle of a message
        continue
      }
      running.status = status < 0xf0 ? status : 0
    }
    const n = dataLength(status)
    if (n < 0) {
      const end = Array.prototype.indexOf.call(bytes, 0xf7, i)
      i = end < 0 ? bytes.length : end + 1
      continue // system exclusive is not used
    }
    const msg = [status]
    const realtime: number[][] = []
    while (msg.length <= n && i < bytes.length) {
      const b = bytes[i++]
      if (b >= 0xf8) realtime.push([b])
      else msg.push(b)
    }
    out.push(...realtime)
    if (msg.length === n + 1) out.push(msg)
  }
  return out
}
