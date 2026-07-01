"use strict";
// ------------------------------ Реплики персонажей -------------------
// Облачко с текстом над сущностью (игрок/босс/враг) в мировых координатах.
const speeches=[];
function say(target, text, dur){
  if(!target || !text) return;
  // заменяем предыдущую реплику той же цели
  for(let i=speeches.length-1;i>=0;i--) if(speeches[i].target===target) speeches.splice(i,1);
  speeches.push({target, text, t:dur||2.6, max:dur||2.6});
}
function clearSpeeches(){ speeches.length=0; }
function updateSpeeches(dt){
  for(let i=speeches.length-1;i>=0;i--){
    const s=speeches[i]; s.t-=dt;
    // босс исчез — снять его реплику
    if(s.target===boss && !boss.active){ speeches.splice(i,1); continue; }
    if(s.target && s.target.dead){ speeches.splice(i,1); continue; }
    if(s.t<=0) speeches.splice(i,1);
  }
}
function drawSpeeches(){
  for(const s of speeches){
    const tg=s.target; if(!tg) continue;
    let ax, ay;
    if(tg===boss){ if(!boss.active) continue; ax=boss.x; ay=boss.cy-boss.h*0.5-14; }
    else { ax=tg.x; const h=tg.h||40; ay=(tg.y!=null?tg.y:0)-h*0.75-12; }
    drawBubble(ax, ay, s.text, s.t/s.max);
  }
}
function drawBubble(x,y,text,life){
  const a = life<0.12? life/0.12 : (life>0.9? (1-life)/0.1 : 1);
  if(a<=0.02) return;
  ctx.save();
  ctx.font="700 13px 'Rubik',sans-serif";
  const maxW=170;
  const words=String(text).split(' '); const lines=[]; let line='';
  for(const w of words){ const test=line?line+' '+w:w;
    if(ctx.measureText(test).width>maxW && line){ lines.push(line); line=w; } else line=test; }
  if(line) lines.push(line);
  const lh=16, padX=11, padY=7;
  let bw=0; for(const l of lines) bw=Math.max(bw, ctx.measureText(l).width);
  bw+=padX*2; const bh=lines.length*lh+padY*2;
  const bx=x-bw/2, by=y-bh-8;
  ctx.globalAlpha=a;
  // тело облачка
  ctx.fillStyle='rgba(246,234,211,.97)'; ctx.strokeStyle='rgba(20,14,11,.85)'; ctx.lineWidth=2;
  roundRect(bx,by,bw,bh,9); ctx.fill(); ctx.stroke();
  // хвостик вниз к персонажу
  ctx.beginPath(); ctx.moveTo(x-6,by+bh-1); ctx.lineTo(x, by+bh+9); ctx.lineTo(x+6, by+bh-1); ctx.closePath();
  ctx.fillStyle='rgba(246,234,211,.97)'; ctx.fill();
  ctx.strokeStyle='rgba(20,14,11,.85)';
  ctx.beginPath(); ctx.moveTo(x-6,by+bh-1); ctx.lineTo(x, by+bh+9); ctx.lineTo(x+6, by+bh-1); ctx.stroke();
  // текст
  ctx.fillStyle='#2a1d16'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let li=0; li<lines.length; li++) ctx.fillText(lines[li], x, by+padY+lh/2+li*lh);
  ctx.restore(); ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.globalAlpha=1;
}

// --- баркоды Брэда (по кулдауну на тип) ---
const BARKS={
  lowhp:['Ещё… держусь!','Только не остыть!','Поджарюсь позже!'],
  zone:['Погнали дальше!','Новое место — новый жар.','Иду за тобой, TechFresh.'],
  bossSpot:['Ну наконец-то.','Большой. И хрустящий.','Разморозим.'],
  waveClear:['Хрустим дальше!','Кто следующий?','Путь открыт.'],
  win:['За всех, кого списали!','Я всё ещё горячий.'],
};
let _barkCD={};
function maybeSay(target, kind, cd){
  const now=performance.now();
  if(_barkCD[kind] && now-_barkCD[kind] < (cd||8000)) return;
  _barkCD[kind]=now;
  const arr=BARKS[kind]; if(!arr) return;
  say(target, pick(arr), 2.4);
}

// --- реплики боссов ---
const BOSS_LINES={
  fridge:{ intro:'Я заморожу твой энтузиазм.', p3:'ХОЛОДНО. БУДЕТ. ВСЕМ.' },
  washer:{ intro:'Сейчас устрою тебе стирку.', p3:'ПЕРЕЛИВ! ТОНИ!' },
  roomba:{ intro:'Обнаружен мусор. Утилизирую.', p3:'ОШИБКА… ОШИБКА… УНИЧТОЖИТЬ!' },
  prime:{ intro:'Ты — брак. А брак идёт под пресс.', p3:'ПЕРЕГРЕВ! Я ЗАБЕРУ ТЕБЯ С СОБОЙ!' },
};
function bossLine(key){
  if(!boss.active) return;
  const set=BOSS_LINES[boss.kind]; if(!set||!set[key]) return;
  say(boss, set[key], 2.8);
}
