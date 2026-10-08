import { describe, expect, it } from 'vitest'
import { crc32, makeZip } from './zip'

describe('zip', () => {
  it('computes CRC-32', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686)
  })

  it('writes local headers, a central directory and the end record', () => {
    const data = new TextEncoder().encode('# Test notları\n')
    const zip = makeZip([
      { name: 'notlar.md', data },
      { name: 'ekranlar/1.jpg', data: new Uint8Array([0xff, 0xd8, 0xff]) },
    ])
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(14, true)).toBe(crc32(data))
    const end = zip.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    const centralAt = view.getUint32(end + 16, true)
    expect(view.getUint32(centralAt, true)).toBe(0x02014b50)
    expect(new TextDecoder().decode(zip.subarray(30, 39))).toBe('notlar.md')
  })
})
