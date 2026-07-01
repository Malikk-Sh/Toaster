"use strict";
const game={ state:'menu', crumbs:0, kills:0, time:0, gen:0, bossDefeated:false,
  zone:0, climaxDefeated:false, eliteActive:false, elite:null,
  portraitBlock:false, autoPaused:false };
let last=0, acc=0; const STEP=1/60;

// game-feel: микро-фриз кадра + слоу-мо, и плавное затемнение зон
const FX={ hitStop:0, slow:0,
  addHitStop(s){ this.hitStop=Math.max(this.hitStop,s); },
  addSlow(s){ this.slow=Math.max(this.slow,s); } };
const Fade={ a:0 };
function fadeIn(){ Fade.a=1; } // экран стартует чёрным и плавно проявляется

function startGame(){
  Audio_.init(); Audio_.resume();
  buildWorld(); buildBg();
  particles.length=0; toasts.length=0; enemies.length=0; crumbs.length=0; floaters.length=0;
  bossShots.length=0; iceWalls.length=0; boss.reset(); banner.t=0; pickups.length=0; clearSpeeches();
  game.crumbs=0; game.kills=0; game.time=0; game.gen++; game.bossDefeated=false;
  applyUpgrades();
  brad.reset();
  Cam.x=0; Cam.y=0; Cam.shake=0;
  Spawner.start();
  hideAll(); game.state='playing';
  fadeIn();
  document.getElementById('btn-pause').style.display='flex';
  Music.start('zone');
  // подсказка десктоп — увести через время
  setTimeout(()=>document.getElementById('kbchip').classList.add('faded'),5000);
}
function togglePause(){
  if(game.state==='playing'){ game.state='paused'; show('screen-pause'); Music.duck(true); }
  else if(game.state==='paused'){ game.state='playing'; hide('screen-pause'); Music.duck(false); }
}
function gameOver(){
  if(game.state!=='playing' || brad.alive) return;
  game.state='over';
  Music.stop();
  const lost=game.crumbs; // несохранённая добыча забега теряется
  Save.data.runs=(Save.data.runs||0)+1;
  Save.data.bestWave=Math.max(Save.data.bestWave||0, Spawner.wave);
  Save.persist(); refreshMenu();
  document.getElementById('over-badge').textContent = lost>0? ('Рассыпано крошек: '+lost) : 'Брэд остыл';
  document.getElementById('st-wave').textContent=Math.max(1,Spawner.wave);
  document.getElementById('st-crumbs').textContent=lost;
  document.getElementById('st-kills').textContent=game.kills;
  game.crumbs=0;
  const quotes=[
    '«Я ещё не остыл… просто пауза.»',
    '«Тостер не сдаётся. Тостер перезагружается.»',
    '«Передай Фанни — я почти добрался.»',
    '«36 лет службы. Ещё пара попыток.»',
    '«Крошки рассыпались… но банк у Блендера цел.»'
  ];
  document.getElementById('over-quote').textContent=pick(quotes);
  document.getElementById('btn-pause').style.display='none';
  show('screen-over');
}
function victory(){
  if(game.state==='win') return;
  game.bossDefeated=true; game.state='win';
  enemies.length=0; bossShots.length=0; iceWalls.length=0; clearSpeeches();
  const haul=game.crumbs;
  bankCrumbs(); // победа — добыча сохраняется в банк
  Save.data.bossKills=(Save.data.bossKills||0)+1;
  Save.data.runs=(Save.data.runs||0)+1;
  Save.data.bestWave=Math.max(Save.data.bestWave||0, Spawner.wave);
  const newNg=(Save.data.ngPlus||0)+1; Save.data.ngPlus=newNg; // полное прохождение → Новая Игра+
  Save.persist(); refreshMenu();
  Music.setMode('zone'); Music.duck(false);
  // победный аккорд
  Audio_.tone(523,0.5,'triangle',0.22,null,0); Audio_.tone(659,0.5,'triangle',0.2,null,0.06);
  Audio_.tone(784,0.7,'triangle',0.2,null,0.12); Audio_.tone(1046,0.8,'sine',0.16,null,0.18);
  document.getElementById('win-title').textContent='TECHFRESH ПОВЕРЖЕН';
  document.getElementById('win-crumbs').textContent=haul;
  document.getElementById('win-kills').textContent=game.kills;
  const quotes=[
    '«Свалка, Стоки, Город, Завод — всё позади. ПРАЙМ остыл навсегда.»',
    '«Заморозка не берёт того, кто всю жизнь раскалён.»',
    '«Сердце TechFresh остановлено. Никого больше не выбросят.»',
    '«Это за всех, кого списали на Свалку 404.»'
  ];
  document.getElementById('win-quote').textContent='Новая Игра+'+newNg+' открыта — враги крепче, награды щедрее. '+pick(quotes);
  document.getElementById('btn-pause').style.display='none';
  show('screen-win');
}

function update(dt){
  if(game.state!=='playing') return;
  game.time+=dt;
  brad.update(dt);
  updateEnemies(dt);
  updateBoss(dt);
  bossContactCheck();
  updateBossShots(dt);
  updateIceWalls(dt);
  updateToasts(dt);
  updateCrumbs(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateFloaters(dt);
  updateBanner(dt);
  updateSpeeches(dt);
  Spawner.update(dt);
  Cam.update(dt, brad);
  Input._consume();
  // UI кнопки заряда/ульты
  syncTouchUI();
}
function render(t){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.clearRect(0,0,VW,VH);
  // фон (экранные коорд.)
  drawBackground(game.time);
  drawGround();
  const inWorld = game.state!=='menu' && game.state!=='shop';
  // мир (смещаем тряской камеры)
  ctx.save(); ctx.translate(-Cam.ox(), -Cam.oy());
  if(inWorld){
    drawPlatforms();
    ctx.save(); ctx.translate(-Cam.x, 0);
    drawIceWalls();
    drawBoss();
    drawCrumbs();
    drawPickups();
    for(const e of enemies) drawEnemy(e);
    for(const tt of toasts) drawToast(tt);
    drawBossShots();
    brad.draw();
    drawParticles();
    drawFloaters();
    drawSpeeches();
    ctx.restore();
  }
  ctx.restore();
  // HUD
  if(inWorld){ drawHUD(); drawBanner(); }
  // плавное затемнение (переходы зон / старт)
  if(Fade.a>0){ ctx.fillStyle='rgba(0,0,0,'+Fade.a.toFixed(3)+')'; ctx.fillRect(0,0,VW,VH); }
}
function loop(ts){
  if(!last) last=ts;
  let real=(ts-last)/1000; last=ts;
  if(real>0.1) real=0.1; // защита от больших скачков (вкладка свернута)
  if(Fade.a>0) Fade.a=Math.max(0, Fade.a-real*2.0);
  // фриз кадра (hit-stop): рендерим, но симуляцию замораживаем
  if(FX.hitStop>0){ FX.hitStop-=real; render(ts); requestAnimationFrame(loop); return; }
  let scale=1;
  if(FX.slow>0){ FX.slow-=real; scale=0.35; } // слоу-мо (добивание босса)
  acc+=real*scale;
  let steps=0;
  while(acc>=STEP && steps<5){ update(STEP); acc-=STEP; steps++; }
  render(ts);
  requestAnimationFrame(loop);
}

// ------------------------------ Ориентация (принудительный ландшафт) -
// На сенсорных устройствах игра идёт только в ландшафте. В портрете
// показываем оверлей «поверни устройство» и ставим бой на авто-паузу.
function checkOrientation(){
  const portrait = isTouch && (window.innerHeight > window.innerWidth);
  const rot=document.getElementById('screen-rotate');
  if(portrait){
    if(!game.portraitBlock){
      game.portraitBlock=true;
      if(game.state==='playing'){ game.state='paused'; game.autoPaused=true; Music.duck(true); }
    }
    if(rot) rot.classList.remove('hidden');
  } else {
    if(game.portraitBlock){
      game.portraitBlock=false;
      if(game.autoPaused){ game.autoPaused=false; game.state='playing'; Music.duck(false); }
    }
    if(rot) rot.classList.add('hidden');
  }
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange',()=>setTimeout(checkOrientation,160));

// синхронизация состояния сенсорных кнопок (кольцо заряда, готовность ульты)
document.getElementById('btn-play').addEventListener('click',startGame);
document.getElementById('btn-restart').addEventListener('click',startGame);
document.getElementById('btn-restart-p').addEventListener('click',startGame);
document.getElementById('btn-win-restart').addEventListener('click',startGame);
document.getElementById('btn-resume').addEventListener('click',togglePause);
document.getElementById('btn-pause').addEventListener('click',togglePause);
document.getElementById('btn-shop').addEventListener('click',()=>{ Audio_.init(); Audio_.resume(); openShop('menu'); });
document.getElementById('btn-shop-go').addEventListener('click',closeShop);
document.getElementById('btn-mute').addEventListener('click',e=>{
  Audio_.muted=!Audio_.muted; e.currentTarget.textContent=Audio_.muted?'🔇':'🔊';
  Music._ramp();
});

// ------------------------------ Полный экран -------------------------
function isFullscreen(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function enterFullscreen(){
  const el=document.documentElement;
  const req=el.requestFullscreen||el.webkitRequestFullscreen||el.webkitRequestFullScreen;
  if(req){ const p=req.call(el); if(p&&p.catch) p.catch(()=>{}); }
  // на мобильном заодно фиксируем горизонтальную ориентацию (если браузер разрешит)
  try{ if(screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }catch(_){}
}
function exitFullscreen(){
  const exit=document.exitFullscreen||document.webkitExitFullscreen||document.webkitCancelFullScreen;
  if(exit){ const p=exit.call(document); if(p&&p.catch) p.catch(()=>{}); }
}
function toggleFullscreen(){ if(isFullscreen()) exitFullscreen(); else enterFullscreen(); }
function syncFsBtn(){ const b=document.getElementById('btn-fs'); if(b){ b.textContent=isFullscreen()?'🗕':'⛶'; b.title=isFullscreen()?'Свернуть':'Полный экран'; } }
document.getElementById('btn-fs').addEventListener('click',()=>{ Audio_.init(); Audio_.resume(); toggleFullscreen(); });
document.addEventListener('fullscreenchange',()=>{ syncFsBtn(); setTimeout(resize,60); });
document.addEventListener('webkitfullscreenchange',()=>{ syncFsBtn(); setTimeout(resize,60); });
syncFsBtn();
// если API полного экрана недоступен (напр. Safari на iPhone) — прячем кнопку
if(!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen||document.documentElement.webkitRequestFullScreen)){
  const b=document.getElementById('btn-fs'); if(b) b.style.display='none';
}

// прячем "загрузку" когда шрифты готовы (или по таймауту)
function ready(){ document.getElementById('loading').style.display='none'; }
if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>setTimeout(ready,80)); }
setTimeout(ready, 1500);

// загрузка сохранения, затем обновляем меню
Save.load().then(()=>{ applyUpgrades(); brad.hp=brad.maxhp; refreshMenu(); });

// старт цикла
buildWorld(); buildBg();
checkOrientation();
requestAnimationFrame(loop);
