"use strict";
const particles=[];
function spawnParticle(o){
  if(particles.length>520) particles.shift();
  particles.push(Object.assign({
    x:0,y:0,vx:0,vy:0,life:0.5,max:0.5,size:3,color:'#fff',
    grav:0,fade:true,add:true,shrink:true,spin:0,rot:0,kind:'dot'
  },o));
}
function burst(x,y,n,opt={}){
  for(let i=0;i<n;i++){
    const a=rand(0,TAU), s=rand(opt.smin||40,opt.smax||260);
    spawnParticle(Object.assign({
      x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s - (opt.up||0),
      life:rand(opt.lmin||0.25,opt.lmax||0.7), max:0.7,
      size:rand(opt.szmin||2,opt.szmax||5),
      color:opt.colors?pick(opt.colors):'#ffd27a',
      grav:opt.grav||0, add:opt.add!==false
    },opt.extra||{}));
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.life-=dt;
    if(p.life<=0){ particles.splice(i,1); continue; }
    p.vy+=p.grav*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.spin*dt;
  }
}
function drawParticles(){
  ctx.save();
  for(const p of particles){
    const t=p.life/p.max, a=p.fade?clamp(t,0,1):1;
    ctx.globalAlpha=a;
    if(p.add) ctx.globalCompositeOperation='lighter';
    else ctx.globalCompositeOperation='source-over';
    const sz=p.shrink? p.size*clamp(t,0.2,1):p.size;
    ctx.fillStyle=p.color;
    if(p.kind==='spark'){
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx));
      ctx.fillRect(0,-sz*0.3, sz*2.4, sz*0.6); ctx.restore();
    }else{
      ctx.beginPath(); ctx.arc(p.x,p.y,sz,0,TAU); ctx.fill();
    }
  }
  ctx.restore(); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
}

// ------------------------------ Всплыв. текст ------------------------
const floaters=[];
function floatText(x,y,text,opt={}){
  floaters.push({x,y,text,life:opt.life||0.9,max:opt.life||0.9,
    color:opt.color||'#ffd27a',size:opt.size||18,vy:opt.vy||-46,vx:opt.vx||0,
    font:opt.font||'body',weight:opt.weight||900});
}
function updateFloaters(dt){
  for(let i=floaters.length-1;i>=0;i--){
    const f=floaters[i]; f.life-=dt; f.y+=f.vy*dt; f.x+=f.vx*dt; f.vy*=(1-dt*1.5);
    if(f.life<=0) floaters.splice(i,1);
  }
}
function drawFloaters(){
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const f of floaters){
    const t=clamp(f.life/f.max,0,1);
    ctx.globalAlpha=t<0.3? t/0.3 : 1;
    const fam=f.font==='display'?"'Russo One',sans-serif":"'Rubik',sans-serif";
    ctx.font=`${f.weight} ${f.size}px ${fam}`;
    ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.55)';
    ctx.strokeText(f.text,f.x,f.y); ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y);
  }
  ctx.restore(); ctx.globalAlpha=1;
}

// ------------------------------ Баннер фаз босса ---------------------
const banner={text:'',sub:'',t:0,max:0};
function bossBanner(text,sub){ banner.text=text; banner.sub=sub||''; banner.t=banner.max=2.4; }
function updateBanner(dt){ if(banner.t>0) banner.t-=dt; }
function drawBanner(){
  if(banner.t<=0) return;
  const p=banner.t/banner.max;
  const a = p>0.8 ? (1-(p-0.8)/0.2) : p<0.25 ? p/0.25 : 1; // плавные въезд/выезд
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const cx=VW/2, cy=VH*0.26;
  ctx.globalAlpha=a*0.5;
  ctx.fillStyle='#000'; roundRect(cx-Math.min(VW*0.46,300), cy-30, Math.min(VW*0.92,600), 60, 10); ctx.fill();
  ctx.globalAlpha=a;
  ctx.font=`900 ${Math.min(34,VW*0.07)}px 'Russo One',sans-serif`;
  ctx.lineWidth=5; ctx.strokeStyle='rgba(0,0,0,.6)';
  ctx.strokeText(banner.text,cx,cy-7); 
  const grd=ctx.createLinearGradient(0,cy-22,0,cy+8);
  grd.addColorStop(0,'#dff4ff'); grd.addColorStop(1,'#7fb8e0');
  ctx.fillStyle=grd; ctx.fillText(banner.text,cx,cy-7);
  if(banner.sub){ ctx.font="700 14px 'Rubik',sans-serif"; ctx.fillStyle='#e8c79a';
    ctx.fillText(banner.sub,cx,cy+16); }
  ctx.restore(); ctx.globalAlpha=1; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

// ------------------------------ Снаряды-тосты ------------------------
