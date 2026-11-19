/** Allowed upload types, detected from file content (magic bytes), never from the client's claim. */
export type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp';
export function sniffImageType(buf: Buffer): AllowedMime | null {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
        return 'image/jpeg';
    if (buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a)
        return 'image/png';
    if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
        return 'image/webp';
    return null;
}
/**
 * Remove APP1 (Exif/XMP) and APP13 (IPTC) segments from a JPEG so GPS coordinates,
 * device serials and timestamps embedded by phones are not stored.
 * Returns the original buffer if the structure is not a well-formed JPEG.
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8)
        return buf;
    const parts: Buffer[] = [buf.subarray(0, 2)];
    let i = 2;
    while (i < buf.length) {
        if (buf[i] !== 0xff)
            return buf; // malformed
        const marker = buf[i + 1]!;
        // Start of scan: the rest is entropy-coded image data.
        if (marker === 0xda) {
            parts.push(buf.subarray(i));
            return Buffer.concat(parts);
        }
        // Standalone markers without length.
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
            parts.push(buf.subarray(i, i + 2));
            i += 2;
            continue;
        }
        if (i + 4 > buf.length)
            return buf;
        const len = buf.readUInt16BE(i + 2);
        const end = i + 2 + len;
        if (end > buf.length)
            return buf;
        const isMetadata = marker === 0xe1 || marker === 0xed;
        if (!isMetadata)
            parts.push(buf.subarray(i, end));
        i = end;
    }
    return Buffer.concat(parts);
}
