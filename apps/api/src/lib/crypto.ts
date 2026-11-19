import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
export const sha256 = (input: string | Buffer) => createHash('sha256').update(input).digest('hex');
export const hmac = (secret: string, input: string) => createHmac('sha256', secret).update(input).digest('base64url');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
/** Uniformly random numeric code with a fixed number of digits. */
export const randomDigits = (length: number) => String(randomInt(0, 10 ** length)).padStart(length, '0');
export function safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
}
