"use strict";
const Input={
  left:false,right:false,
  jumpEdge:false, dashEdge:false, ultEdge:false,
  charging:false, chargeReleaseEdge:false,
  _consume(){ this.jumpEdge=false; this.dashEdge=false; this.ultEdge=false; this.chargeReleaseEdge=false; },
  setCharging(v){
    if(this.charging && !v) this.chargeReleaseEdge=true;
    this.charging=v;
  }
};
// клавиатура
const keyMap={
  ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
};
window.addEventListener('keydown',e=>{
  if(e.repeat) return;
  if(keyMap[e.code]){ Input[keyMap[e.code]]=true; e.preventDefault(); }
  if(['Space','KeyW','ArrowUp'].includes(e.code)){ Input.jumpEdge=true; e.preventDefault(); }
  if(['ShiftLeft','ShiftRight'].includes(e.code)){ Input.dashEdge=true; e.preventDefault(); }
  if(['KeyQ','KeyE'].includes(e.code)){ Input.ultEdge=true; e.preventDefault(); }
  if(['KeyJ','Enter'].includes(e.code)){ Input.setCharging(true); e.preventDefault(); }
  if(e.code==='Escape'){ togglePause(); }
});
window.addEventListener('keyup',e=>{
  if(keyMap[e.code]) Input[keyMap[e.code]]=false;
  if(['KeyJ','Enter'].includes(e.code)) Input.setCharging(false);
});
// мышь = заряд (десктоп)
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{ if(!isTouch && e.button===0 && game.state==='playing') Input.setCharging(true); });
window.addEventListener('mouseup',e=>{ if(e.button===0) Input.setCharging(false); });

// сенсорные кнопки
function bindTouch(el,act){
  const down=e=>{ e.preventDefault(); el.classList.add('pressed');
    if(act==='left') Input.left=true;
    else if(act==='right') Input.right=true;
    else if(act==='jump') Input.jumpEdge=true;
    else if(act==='dash') Input.dashEdge=true;
    else if(act==='ult') Input.ultEdge=true;
    else if(act==='charge') Input.setCharging(true);
    if(el.setPointerCapture && e.pointerId!=null){ try{el.setPointerCapture(e.pointerId);}catch(_){} }
  };
  const up=e=>{ el.classList.remove('pressed');
    if(act==='left') Input.left=false;
    else if(act==='right') Input.right=false;
    else if(act==='charge') Input.setCharging(false);
  };
  el.addEventListener('pointerdown',down);
  el.addEventListener('pointerup',up);
  el.addEventListener('pointercancel',up);
  el.addEventListener('pointerleave',up);
}
document.querySelectorAll('.tbtn').forEach(el=>bindTouch(el,el.dataset.act));

// определяем тип устройства
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints>0) || window.matchMedia('(pointer:coarse)').matches;
document.body.classList.add(isTouch?'touch':'desktop');
document.getElementById('start-hint').innerHTML = isTouch
  ? 'Двигайся <b>◀ ▶</b>, прыгай и уворачивайся <b>рывком</b>. Тосты летят сами. Держи <b>ЖАР</b> для мощного выстрела. Накопи <b>ульту</b>.'
  : '<b>A/D</b> — ходьба · <b>W</b> — прыжок · <b>Shift</b> — рывок · <b>держать J / ЛКМ</b> — заряженный выстрел · <b>Q</b> — ульта · <b>Esc</b> — пауза';

// ------------------------------ Камера -------------------------------
