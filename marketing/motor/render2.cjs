const {chromium}=require('playwright');const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
const R=path.resolve(__dirname,'../..');
const [,,cfgFile,out]=process.argv;const cfg=JSON.parse(fs.readFileSync(cfgFile,'utf8'));
cfg.logo=fs.readFileSync(R+'/marca/viwai-logo-web.svg','utf8').replace(/currentColor/g,'#FFFFFF').replace(/var\(--wave\)/g,'#B9A8FF').replace('height="40"','height="150"');
const pos=JSON.parse(fs.readFileSync('pos.json','utf8'));
if(!fs.existsSync(cfg.hook.foto))fs.copyFileSync(R+'/web/img/fotos/'+cfg.hook.foto,cfg.hook.foto);
fs.writeFileSync('_gen.html',fs.readFileSync(__dirname+'/gen.html','utf8').replace(/__FUENTES__/g,'file://'+R+'/marketing/redes/fuentes').replace('__ICONOS__','file://'+R+'/diseno/iconos.js'));cfg.app.shots.forEach(s=>{if(typeof s.tap==='string')s.tap=pos[s.tap]});
const appD=cfg.app.shots.reduce((a,s)=>a+s.d,0);
const SC=[['H',3.6],['P',3.4],['A',appD],['F',5]];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+path.resolve('_gen.html'));await p.evaluate(c=>setup(c),cfg);await p.waitForTimeout(1500);
const parts=[];
for(const [s,dur] of SC){const f=`${out}_${s}.mp4`;parts.push(f);
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-r','30',f]);
 const n=Math.round(dur*30);for(let i=0;i<n;i++){await p.evaluate(([s,t])=>render(s,t),[s,i/30]);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r))}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));console.log(s,'ok')}
await b.close();fs.writeFileSync(out+'_list.txt',parts.map(f=>`file '${f}'`).join('\n'));})();
