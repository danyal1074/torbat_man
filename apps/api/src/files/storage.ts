import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { hmac, randomToken, safeEqual } from '../lib/crypto';
/**
 * Private object storage abstraction. Phase 1 ships a local-disk driver;
 * an S3-compatible driver implements the same interface in deployment.
 */
export interface FileStorage {
    put(key: string, data: Buffer): Promise<void>;
    get(key: string): Promise<Buffer | null>;
    delete(key: string): Promise<void>;
    newKey(ext: string): string;
    signUrl(attachmentId: string, ttlSec?: number): string;
    verifySignature(attachmentId: string, exp: string, sig: string): boolean;
}
export function createLocalStorage(dir: string, signingSecret: string): FileStorage {
    const root = resolve(dir);
    const sign = (id: string, exp: number) => hmac(signingSecret, `${id}.${exp}`);
    return {
        async put(key, data) {
            const path = join(root, key);
            await mkdir(join(path, '..'), { recursive: true });
            await writeFile(path, data, { flag: 'wx' });
        },
        async get(key) {
            // Keys are generated server-side (random); still refuse anything that could escape the root.
            if (!/^[a-z0-9/_-]+\.[a-z]+$/i.test(key) || key.includes('..'))
                return null;
            try {
                return await readFile(join(root, key));
            }
            catch {
                return null;
            }
        },
        async delete(key){
            if(!/^[a-z0-9/_-]+\.[a-z]+$/i.test(key)||key.includes('..'))throw new Error('Invalid storage key');
            await rm(join(root,key),{force:true});
        },
        newKey(ext) {
            const d = new Date();
            const prefix = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            return `${prefix}/${randomToken(18)}.${ext}`;
        },
        signUrl(attachmentId, ttlSec = 600) {
            const exp = Math.floor(Date.now() / 1000) + ttlSec;
            return `/v1/files/${attachmentId}?exp=${exp}&sig=${sign(attachmentId, exp)}`;
        },
        verifySignature(attachmentId, exp, sig) {
            const expNum = Number(exp);
            if (!Number.isFinite(expNum) || expNum < Date.now() / 1000)
                return false;
            return safeEqual(sign(attachmentId, expNum), sig);
        },
    };
}
