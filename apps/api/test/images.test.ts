import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { normalizeUpload } from '../src/files/normalize';
describe('Private image normalization',()=>{
 for(const format of ['jpeg','png','webp'] as const){
  it(`decodes ${format}, strips EXIF and re-encodes as static WebP`,async()=>{
   const input=await sharp({create:{width:12,height:8,channels:3,background:'#6f248e'}}).withExif({IFD0:{Artist:'private-personal-marker'}}).toFormat(format).toBuffer();
   expect((await sharp(input).metadata()).exif).toBeDefined();
   const result=await normalizeUpload(input);const metadata=await sharp(result.data).metadata();
   expect(result.mimeType).toBe('image/webp');expect(metadata.format).toBe('webp');expect(metadata.exif).toBeUndefined();expect(metadata.xmp).toBeUndefined();expect(metadata.width).toBe(12);expect(metadata.height).toBe(8);
  });
 }
 it('rejects forged headers, truncated images and unsupported SVG',async()=>{
  for(const input of [Buffer.from([0xff,0xd8,0xff,0,0]),Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')])await expect(normalizeUpload(input)).rejects.toMatchObject({status:400});
 });
 it('refuses images above the pixel budget before decoding them',async()=>{
  const input=await sharp({create:{width:5000,height:4001,channels:3,background:'#fff'}}).png().toBuffer();
  await expect(normalizeUpload(input)).rejects.toMatchObject({status:400,code:'INVALID_IMAGE'});
 });
 it('limits the output dimensions for an accepted large photograph',async()=>{
  const input=await sharp({create:{width:3000,height:1500,channels:3,background:'#fff'}}).jpeg().toBuffer();
  const result=await normalizeUpload(input);const metadata=await sharp(result.data).metadata();expect(metadata.width).toBe(2560);expect(metadata.height).toBe(1280);
 });
});
