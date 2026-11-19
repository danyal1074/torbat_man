import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const source=resolve('.');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('A committed source revision is required.');
const root=join(source,'.release',sha);
await mkdir(dirname(root),{recursive:true});
await mkdir(root,{recursive:false});
const pkg=JSON.parse(await readFile('apps/api/package.json','utf8'));
const require=createRequire(join(source,'apps/api/package.json'));
const dependencies={};
for(const name of Object.keys(pkg.dependencies).filter(n=>!n.startsWith('@torbat/'))){
 let folder=dirname(require.resolve(name));
 while(true){
  const found=await readFile(join(folder,'package.json'),'utf8').then(JSON.parse).catch(()=>null);
  if(found?.name===name){dependencies[name]=found.version;break;}
  const parent=dirname(folder);if(parent===folder)throw new Error('Cannot pin '+name);folder=parent;
 }
}
await mkdir(join(root,'api'));
await writeFile(join(root,'api/package.json'),JSON.stringify({name:'torbat-man-runtime',version:'0.1.0',private:true,type:'module',engines:{node:'>=22'},dependencies},null,2));
await cp('apps/api/dist',join(root,'api/dist'),{recursive:true});
await cp('apps/api/drizzle',join(root,'api/drizzle'),{recursive:true});
await cp('apps/citizen-web/dist',join(root,'web'),{recursive:true});
await cp('infra',join(root,'infra'),{recursive:true});
await writeFile(join(root,'release.json'),JSON.stringify({commit:sha,builtAt:new Date().toISOString(),environment:'private-demo'},null,2));
console.log(root);
