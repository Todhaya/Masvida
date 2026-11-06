// Capturas a tamaño de pantalla (800x1406) y posición de los toques, para vídeos de funciones
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:400,height:703},deviceScaleFactor:2});
await p.goto('file://'+__dirname+'/../paga-justo.html');await p.waitForTimeout(1200);await p.addStyleTag({content:'.tabs,.demo{display:none!important}'});
const ctr=async sel=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round((r.left+r.width/2)*2),Math.round((r.top+r.height/2)*2)]},sel);
const scrollTo=async(sel,off=120)=>{await p.evaluate(([s,o])=>{const e=document.querySelector(s);window.scrollTo(0,e.getBoundingClientRect().top+scrollY-o)},[sel,off]);await p.waitForTimeout(500)};
const shot=async n=>{await p.waitForTimeout(500);await p.screenshot({path:n+'.jpg',type:'jpeg',quality:92})};
const J={};const limpia=()=>p.evaluate(()=>{document.querySelectorAll('#v-facturas *').forEach(e=>{if(e.children.length===0&&/En el prototipo/.test(e.textContent))e.style.display='none'})});
// FACTURAS
await p.evaluate(()=>{go('facturas');scrollTo(0,0)});await p.waitForTimeout(600);J.f1tap=await ctr('[data-type="luz"]');await shot('f1');
await p.click('[data-type="luz"]');await p.waitForTimeout(400);await limpia();await scrollTo('#step-up',140);J.f2tap=await ctr('#step-up .file, #step-up .btn.pri, #step-up .btn');await shot('f2');
await p.evaluate(()=>{cur='luz';result()});await p.waitForTimeout(400);await limpia();await scrollTo('#step-res .hero',60);J.f3tap=await ctr('#step-res .opt.best .btn.pri');await shot('f3');
// MENU
await p.evaluate(()=>{go('menu');scrollTo(0,0)});await p.waitForTimeout(600);await shot('m1');
J.m2tap=await ctr('[data-mn="semana"]');await p.click('[data-mn="semana"]');await p.evaluate(()=>scrollTo(0,0));await shot('m2');
const comp=await p.evaluate(()=>{const e=[...document.querySelectorAll('#v-menu button')].find(x=>/^Compra$/.test(x.textContent.trim()));if(!e)return null;const r=e.getBoundingClientRect();return [Math.round((r.left+r.width/2)*2),Math.round((r.top+r.height/2)*2)]});
J.m3tap=comp;await p.evaluate(()=>{const e=[...document.querySelectorAll('#v-menu button')].find(x=>/^Compra$/.test(x.textContent.trim()));e.click();scrollTo(0,0)});await shot('m3');
fs.writeFileSync('pos.json',JSON.stringify(J));console.log(JSON.stringify(J));await b.close()})();
