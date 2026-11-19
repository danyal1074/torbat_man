import sharp from 'sharp';
import { sniffImageType } from './image';
import { AppError, badRequest } from '../lib/errors';
sharp.concurrency(1);
sharp.cache({memory:8,files:0,items:8});
let active=0;
const MAX_PIXELS=20_000_000;
/** Decode untrusted pixels, orient and re-encode. Metadata is deliberately not retained. */
export async function normalizeUpload(raw:Buffer){
 if(!sniffImageType(raw))throw badRequest('UNSUPPORTED_FILE','فقط تصویر JPG، PNG یا WebP پذیرفته می‌شود.');
 if(active>=2)throw new AppError(429,'IMAGE_BUSY','پردازش تصویر دیگری در حال انجام است؛ کمی بعد دوباره تلاش کنید.');
 active++;
 try{
  const image=sharp(raw,{limitInputPixels:MAX_PIXELS,failOn:'warning',animated:false});
  const meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format??'')||!meta.width||!meta.height)throw badRequest('INVALID_IMAGE','فایل تصویر معتبر نیست.');
  if((meta.pages??1)>1)throw badRequest('ANIMATED_IMAGE','تصویر متحرک پشتیبانی نمی‌شود؛ یک عکس ثابت انتخاب کنید.');
  const data=await image.rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:3}).timeout({seconds:8}).toBuffer();
  if(data.length>5*1024*1024)throw badRequest('IMAGE_TOO_LARGE','تصویر پس از پردازش هم بزرگ است؛ عکس کوچک‌تری انتخاب کنید.');
  return {data,mimeType:'image/webp' as const};
 }catch(error){
  if(error instanceof AppError)throw error;
  throw badRequest('INVALID_IMAGE','تصویر ناقص، بسیار بزرگ یا غیرقابل پردازش است. عکس دیگری انتخاب کنید.');
 }finally{active--;}
}
