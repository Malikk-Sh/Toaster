"use strict";
/* =====================================================================
   ТОСТ ПРАВЕДНИКА — Итерация 1 (ядро ощущения)
   Однофайловая canvas-игра. Без внешних ассетов. Координаты — в CSS-px.
   Архитектура разбита на системы, чтобы легко расширять в след. итерациях.
   ===================================================================== */

// ------------------------------ Утилиты ------------------------------
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const pick=arr=>arr[(Math.random()*arr.length)|0];
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const sign=v=>v<0?-1:1;
const TAU=Math.PI*2;

// ------------------------------ Холст --------------------------------
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
let VW=0, VH=0, DPR=1;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1, 2);
  VW=window.innerWidth; VH=window.innerHeight;
  canvas.width=Math.round(VW*DPR); canvas.height=Math.round(VH*DPR);
  canvas.style.width=VW+'px'; canvas.style.height=VH+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>setTimeout(resize,150));
resize();

// ------------------------------ Звук (синтез) ------------------------
const Cam={x:0,y:0, lookX:0, shake:0, shakeT:0,
  addShake(a){ this.shake=Math.max(this.shake,a); },
  update(dt,target){
    // Плавный вынос по направлению взгляда: lookX МЕДЛЕННО догоняет цель, поэтому
    // при развороте/уворотах камера не дёргается. Вынос уменьшен, чтобы враг/босс
    // за спиной оставался в кадре.
    const lead = target.facing*Math.min(130, VW*0.10);
    this.lookX = lerp(this.lookX, lead, 1-Math.pow(0.2,dt));
    const arx = (typeof accessRightX==='function')? accessRightX() : WORLD.w;
    const rightBound = Math.max(0, Math.min(WORLD.w-VW, arx - VW*0.12));
    // Горизонтальный «мёртвый зон» вокруг игрока: пока цель внутри него, камера не
    // едет по X — резкая смена направления при уклонении больше не трясёт кадр.
    const desired = target.x + this.lookX;
    const camCenter = this.x + VW/2;
    const dz = Math.min(90, VW*0.10);
    let tx = this.x;
    if(desired > camCenter + dz) tx += desired - (camCenter+dz);
    else if(desired < camCenter - dz) tx += desired - (camCenter-dz);
    tx = clamp(tx, 0, rightBound);
    const ty = clamp(target.y - VH*0.62, WORLD.groundY-VH+40, 0);
    this.x = lerp(this.x, tx, 1-Math.pow(0.0025,dt));
    this.y = lerp(this.y, isFinite(ty)?ty:0, 1-Math.pow(0.002,dt));
    this.shake = Math.max(0, this.shake - dt*this.shake*6 - dt*8);
    this.shakeT += dt*60;
  },
  ox(){ return this.shake>0.1? Math.sin(this.shakeT*1.7)*this.shake : 0; },
  oy(){ return this.shake>0.1? Math.cos(this.shakeT*2.3)*this.shake : 0; },
};

// ------------------------------ Зоны ---------------------------------
function roundRect(x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

// ------------------------------ Сохранение (window.storage) ---------
