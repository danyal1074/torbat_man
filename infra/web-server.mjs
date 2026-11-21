import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve(process.env.STATIC_DIR??'../web');
const target=new URL(process.env.API_TARGET??'http://127.0.0.1:4181');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.map':'application/json'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 if(req.url?.startsWith('/v1/')||['/health','/openapi.json','/docs'].includes(req.url?.split('?')[0])){
  const headers={...req.headers,host:target.host};
  delete headers['x-forwarded-for'];delete headers['x-forwarded-host'];
  const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers,timeout:30000},response=>{
   res.writeHead(response.statusCode??502,{...response.headers,'cache-control':'no-store'});response.pipe(res);
  });
  upstream.on('timeout',()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'ارتباط با سرور برقرار نشد.'}}));});
  req.on('aborted',()=>upstream.destroy());req.pipe(upstream);return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let filename=resolve(root,'.'+pathname);
  if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let info=await stat(filename).catch(()=>null);
  if(!info?.isFile()){
   if(extname(pathname)){res.writeHead(404);res.end();return;}
   if(pathname.startsWith('/admin')){
     const adminFallback=resolve(root,'admin/index.html');
     const adminInfo=await stat(adminFallback).catch(()=>null);
     if(adminInfo?.isFile()){filename=adminFallback;info=adminInfo;}
     else{filename=resolve(root,'index.html');info=await stat(filename);}
   } else {
     filename=resolve(root,'index.html');info=await stat(filename);
   }
  }
  res.setHeader('Content-Type',types[extname(filename)]??'application/octet-stream');
  res.setHeader('Content-Length',info.size);
  res.setHeader('Cache-Control',pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.openstreetmap.org; frame-src 'self' https://www.openstreetmap.org; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  res.writeHead(200);if(req.method==='HEAD'){res.end();return;}createReadStream(filename).pipe(res);
 }catch{if(!res.headersSent)res.writeHead(400);res.end();}
});
server.listen(Number(process.env.PORT??4180),'127.0.0.1');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
