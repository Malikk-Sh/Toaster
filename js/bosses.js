"use strict";
// ====================================================================
//  БОССЫ — общий каркас + реестр видов (BOSS_KINDS)
//  Один синглтон `boss` хранит общие поля; поведение/отрисовка/урон
//  диспетчеризуются по boss.kind через boss.def(). Холодильник =
//  BOSS_KINDS.fridge (логика 1:1 с прежней версией).
// ====================================================================
const boss={
  active:false, kind:'fridge', x:0, cy:0, w:154, h:236, hp:800, maxhp:800,
  phase:1, state:'idle', t:0, vx:0, facing:-1, flash:0, burn:0, burnTick:0,
  doorOpen:0, intro:0, dieT:0,
  iceCD:0, wallCD:0, summonCD:0, lungeCD:0, hop:0,
  laser:{state:'off', t:0, y:0},
  // доп. скретч-поля для других боссов
  atkCD:0, atkCD2:0, spin:0, pressY:0, lungeDir:1,
  reset(){
    this.active=false; this.phase=1; this.state='idle'; this.t=0; this.vx=0;
    this.facing=-1; this.flash=0; this.burn=0; this.burnTick=0; this.doorOpen=0;
    this.intro=0; this.dieT=0; this.iceCD=1.2; this.wallCD=4; this.summonCD=1.2;
    this.lungeCD=1.4; this.hop=0; this.laser.state='off'; this.laser.t=0;
    this.atkCD=0; this.atkCD2=0; this.spin=0; this.pressY=0;
  },
  def(){ return BOSS_KINDS[this.kind] || BOSS_KINDS.fridge; },
  spawn(kind){ this.kind=kind||'fridge'; this.reset(); this.active=true; this.def().spawn(this); },
  weakActive(){ return this.phase===2 && this.doorOpen>0.6; },
};

// запуск босса заданного вида
function startBossKind(kind){
  enemies.length=0; bossShots.length=0; iceWalls.length=0;
  boss.spawn(kind);
  Music.setMode('boss');
  boss.def().onStart();
}
// совместимость со старыми вызовами
function startBoss(){ startBossKind('fridge'); }
function startElite(){
  enemies.length=0; bossShots.length=0; iceWalls.length=0;
  const sx=clamp(Cam.x+VW*0.7, WORLD.w*0.3, WORLD.w*0.8);
  spawnEnemy('roomba', sx, WORLD.groundY-210);
  Music.setMode('boss');
  Audio_.tone(80,1.0,'square',0.24,60); Audio_.noise(0.8,0.2,900); Cam.addShake(12);
  bossBanner('🤖 ROOMBA 9000','Дрон-надзиратель TechFresh');
}
// запускаем кульминацию текущей зоны
function startClimax(){
  const Z=curZone();
  if(Z.climax==='roomba') startElite();
  else startBossKind(Z.climax);
}
// кульминация зоны пройдена → следующая зона или общая победа
function onClimaxDefeated(){
  game.climaxDefeated=true;
  bankCrumbs(); // чекпойнт: добыча в банк
  if(game.zone < ZONES.length-1){ advanceZone(); }
  else { game.bossDefeated=true; victory(); }
}
function advanceZone(){
  game.zone++; game.climaxDefeated=false;
  enemies.length=0; bossShots.length=0; iceWalls.length=0; toasts.length=0; notes.length=0;
  boss.reset(); game.eliteActive=false; game.elite=null;
  buildWorld(); buildBg();
  brad.x=Math.min(260,WORLD.w*0.12); brad.y=WORLD.groundY-brad.h*0.5; brad.vx=0; brad.vy=0;
  Cam.x=0; Cam.y=0;
  Spawner.startZone();
  Music.setMode('zone');
  const Z=curZone();
  bossBanner('ЗОНА: '+Z.name, Z.sub);
  Audio_.tone(523,0.3,'sine',0.16); Audio_.tone(784,0.3,'sine',0.16,null,0.1); Audio_.tone(1046,0.4,'sine',0.14,null,0.2);
}

// ------------------------------ Общие диспетчеры ---------------------
function damageBoss(dmg,fx,fy,big){
  if(!boss.active || boss.state==='intro' || boss.state==='dying') return;
  boss.def().damage(dmg,fx,fy,big);
}
function checkBossPhase(){ if(boss.active) boss.def().checkPhase(); }
function updateBoss(dt){ if(!boss.active) return; boss.def().update(dt); }
function bossDie(){ if(!boss.active || boss.state==='dying') return; boss.def().die(); }
function bossContactCheck(){ if(!boss.active) return; boss.def().contact(); }
function drawBoss(){ if(!boss.active) return; boss.def().draw(); }

// общий блок: горение, intro, dying. Возвращает true, если кадр уже
// полностью обработан (босс в intro/dying) и спец-логику запускать не нужно.
function bossCommonUpdate(dt){
  boss.t+=dt; boss.flash=Math.max(0,boss.flash-dt*5);
  boss.facing = brad.x < boss.x ? -1 : 1;
  boss.cy = WORLD.groundY - boss.h*0.5 - boss.hop;
  const d=boss.def();
  // горение (огонь — слабость техники)
  if(boss.burn>0){ boss.burn-=dt; boss.burnTick-=dt;
    if(boss.burnTick<=0){ boss.burnTick=0.3; boss.hp-=Math.round(brad.burnDmg*1.4); boss.flash=Math.max(boss.flash,0.05);
      spawnParticle({x:boss.x+rand(-boss.w*0.3,boss.w*0.3),y:boss.cy+rand(-boss.h*0.3,boss.h*0.3),vx:rand(-15,15),vy:rand(-60,-20),
        life:rand(0.3,0.5),max:0.5,size:rand(3,6),color:pick(['#ff6a00','#ffd23f']),add:true,grav:-30});
      if(boss.hp<=0){ bossDie(); return true; } checkBossPhase();
    }
  }
  if(boss.state==='intro'){
    boss.intro-=dt;
    const tx=Math.min(WORLD.w-boss.w*0.55, Cam.x + VW*0.74);
    boss.x=lerp(boss.x,tx,1-Math.pow(0.01,dt));
    if(boss.intro<=0){ boss.state='idle'; boss.t=0; }
    return true;
  }
  if(boss.state==='dying'){
    boss.dieT-=dt; boss.hop=lerp(boss.hop,-6,0.1);
    if(Math.random()<0.6){ const ex=boss.x+rand(-boss.w*0.5,boss.w*0.5), ey=boss.cy+rand(-boss.h*0.5,boss.h*0.5);
      burst(ex,ey,8,{colors:d.dieColors,smax:260,grav:200,szmax:6,lmax:0.6}); Cam.addShake(6); }
    if(boss.dieT<=0){ boss.active=false; onClimaxDefeated(); }
    return true;
  }
  return false;
}

// ====================================================================
//  ХОЛОДИЛЬНИК «ПОЛЮС» (fridge) — атаки
// ====================================================================
function bossIceVolley(n){
  if(boss.state==='dying'||boss.state==='intro') return;
  Audio_.tone(300,0.18,'triangle',0.16,140); Audio_.tone(180,0.2,'square',0.12,90,0.04);
  const ox=boss.x+boss.facing*boss.w*0.4, oy=boss.cy-boss.h*0.1;
  for(let k=0;k<n;k++){
    const tx=brad.x+rand(-90,90)*k, ty=(brad.y-brad.h*0.4)+rand(-20,20);
    setTimeout(()=>{ if(game.state==='playing' && boss.active && boss.state!=='dying') spawnIceCube(ox,oy,tx,ty,{dmg:14,size:13}); }, k*140);
  }
  burst(ox,oy,8,{colors:['#bfe8ff','#8fd2ff'],smax:160,szmax:4,lmax:0.35});
}
function bossSummon(n){
  Audio_.tone(420,0.14,'square',0.12,620); Audio_.tone(640,0.14,'square',0.1,880,0.07);
  for(let k=0;k<n;k++){
    const sx=boss.x+rand(-boss.w*0.3,boss.w*0.3), sy=boss.cy+rand(-10,30);
    spawnEnemy('drone', sx, sy);
    burst(sx,sy,8,{colors:['#ffd27a','#caa15f'],smax:150,szmax:3,lmax:0.4});
  }
  floatText(boss.x,boss.cy-boss.h*0.5,'СНЕК-ДРОНЫ!',{color:'#ffd27a',size:14,font:'display',vy:-26,life:0.9});
}
function updateBossLaser(dt){
  const L=boss.laser;
  if(L.state==='off'){ L.t-=dt; if(L.t<=0){ L.state='warn'; L.t=0.9; L.y=clamp(brad.y-brad.h*0.4, WORLD.groundY-300, WORLD.groundY-10); } }
  else if(L.state==='warn'){ L.t-=dt;
    if(Math.random()<0.5) spawnParticle({x:boss.x+boss.facing*boss.w*0.3,y:L.y,vx:boss.facing*-200,vy:rand(-10,10),life:0.3,max:0.3,size:3,color:'#ff5a40',add:true});
    if(L.t<=0){ L.state='fire'; L.t=0.32; fireCompressorLaser(L.y); } }
  else if(L.state==='fire'){ L.t-=dt; if(L.t<=0){ L.state='off'; L.t=rand(2.6,3.6); } }
}
function fireCompressorLaser(y){
  Audio_.tone(90,0.4,'sawtooth',0.24,70); Audio_.noise(0.35,0.2,1500); Cam.addShake(8);
  const ox=boss.x+boss.facing*boss.w*0.3;
  for(let x=ox; (boss.facing<0? x>Cam.x-60 : x<Cam.x+VW+60); x+=boss.facing*26){
    spawnParticle({x:x+rand(-8,8),y:y+rand(-9,9),vx:0,vy:rand(-25,25),life:rand(0.15,0.4),max:0.4,
      size:rand(4,9),color:pick(['#ff3b30','#ffd23f','#ff8a1e']),add:true});
  }
  if(brad.alive && !brad.dashing && Math.abs((brad.y-brad.h*0.4)-y)<brad.h*0.6){
    if((boss.facing<0 && brad.x<ox) || (boss.facing>0 && brad.x>ox)) brad.hurt(18, ox);
  }
}
function updateBerserk(dt){
  // хаотичные рывки по арене + частый лёд
  boss.iceCD-=dt; boss.lungeCD-=dt;
  if(boss.iceCD<=0){ boss.iceCD=rand(1.0,1.6); bossIceVolley(2); }
  if(boss.state!=='lunge'){
    boss.state='berserk';
    if(boss.lungeCD<=0){ boss.state='lunge'; boss.t=0; boss.lungeDir=sign(brad.x-boss.x)||1; boss.vx=boss.lungeDir*620;
      Audio_.tone(140,0.3,'sawtooth',0.2,60); }
  }
  if(boss.state==='lunge'){
    boss.x+=boss.vx*dt; boss.vx*=(1-dt*0.8);
    boss.hop=Math.abs(Math.sin(boss.t*14))*10;
    if(Math.random()<0.6) spawnParticle({x:boss.x-boss.lungeDir*boss.w*0.4,y:WORLD.groundY-4,vx:-boss.lungeDir*160,vy:-rand(20,80),life:0.4,max:0.4,size:rand(3,6),color:pick(['#caa15f','#8a6a3a']),add:false,grav:200});
    if(boss.x<boss.w*0.55){ boss.x=boss.w*0.55; boss.vx=Math.abs(boss.vx); }
    if(boss.x>WORLD.w-boss.w*0.55){ boss.x=WORLD.w-boss.w*0.55; boss.vx=-Math.abs(boss.vx); }
    if(boss.t>0.7 && Math.abs(boss.vx)<120){ boss.state='berserk'; boss.lungeCD=rand(1.2,1.9); boss.hop=0; }
  }
  // контактный урон корпусом
  if(brad.alive && !brad.dashing && Math.abs(brad.x-boss.x)<(boss.w*0.5+brad.w*0.4) && (brad.y+brad.h*0.5)>boss.cy-boss.h*0.5){
    brad.hurt(22, boss.x);
  }
}

// ====================================================================
//  Реестр видов боссов
// ====================================================================
const BOSS_KINDS={
  fridge:{
    barName:'❄ ОГРОМНЫЙ ХОЛОДИЛЬНИК',
    dieColors:['#fff','#bfe8ff','#ff8a1e','#ffd23f'],
    phaseLabel(){ return boss.phase===1?'ФАЗА 1 · ЛЁД' : boss.phase===2?'ФАЗА 2 · КОМПРЕССОР ОТКРЫТ' : 'ФАЗА 3 · БЕРСЕРК'; },
    spawn(b){
      b.hp=b.maxhp=Math.round(820*diffMul());
      b.w=154; b.h=Math.min(236, VH*0.42); b.cy=WORLD.groundY-b.h*0.5;
      b.x=Math.min(WORLD.w-b.w*0.6, Cam.x+VW+b.w*0.5+40); // въезжает справа
      b.state='intro'; b.intro=2.2;
      floatText(brad.x, brad.y-120, 'БОСС', {color:'#bfe8ff',size:18,font:'display',life:1.2,vy:-18});
    },
    onStart(){
      Audio_.tone(70,1.2,'sawtooth',0.3,40); Audio_.noise(1.0,0.25,500); Cam.addShake(14);
      bossBanner('❄ ОГРОМНЫЙ ХОЛОДИЛЬНИК','ЗИЛ-Криос «Полюс», брошен в 404');
    },
    damage(dmg,fx,fy,big){
      let mult=1;
      if(boss.phase===2){ // окно урона — открытый компрессор
        mult = (brad.x>boss.x ? 2.6 : 1.8); // бить сзади (зайти за холодильник) — больнее
      }
      const final=Math.round(dmg*mult);
      boss.hp-=final; boss.flash=0.1;
      floatText(fx, fy-10, final.toString(), {color:mult>1?'#bfe8ff':'#fff', size:mult>1?24:16, weight:900});
      if(mult>1) floatText(boss.x, boss.cy-boss.h*0.4, mult>2?'СЗАДИ! ×2.6':'КОМПРЕССОР ×1.8',{color:'#bfe8ff',size:14,font:'display',vy:-30,life:0.8});
      burst(fx,fy,big?6:4,{kind:'spark',colors:['#fff','#bfe8ff','#ffd27a'],smax:big?260:180,szmax:3,lmax:0.35,grav:160});
      brad.gainUlt(big?2:1);
      checkBossPhase();
      if(boss.hp<=0) bossDie();
    },
    checkPhase(){
      if(boss.phase===1 && boss.hp<=boss.maxhp*0.5){
        boss.phase=2; boss.state='opening'; boss.t=0;
        bossBanner('ДВЕРЦА ОТКРЫТА','Бей по компрессору! (заходи за спину)');
        Audio_.tone(200,0.6,'square',0.2,90); Cam.addShake(9);
      } else if(boss.phase===2 && boss.hp<=boss.maxhp*0.2){
        boss.phase=3; boss.state='berserk'; boss.t=0; boss.doorOpen=0; boss.laser.state='off';
        bossBanner('⚠ БЕРСЕРК','Холодильник сорвался с катушек!');
        Audio_.tone(60,1.0,'sawtooth',0.32,30); Audio_.noise(0.8,0.25,600); Cam.addShake(16);
      }
    },
    update(dt){
      if(bossCommonUpdate(dt)) return;
      // лёгкое покачивание/дрейф к центру арены, держим дистанцию
      const homeX=clamp(brad.x + boss.facing*-260, WORLD.w*0.45, WORLD.w-boss.w*0.55);
      if(boss.phase!==3){ boss.x=lerp(boss.x, homeX, 1-Math.pow(0.5,dt)); boss.hop=lerp(boss.hop,0,0.1); }

      if(boss.phase===1){
        boss.iceCD-=dt; boss.wallCD-=dt;
        if(boss.iceCD<=0){ boss.iceCD=rand(1.5,2.2); bossIceVolley(2+ (Math.random()<0.5?1:0)); }
        if(boss.wallCD<=0 && iceWalls.length<2){ boss.wallCD=rand(5,7);
          const wx=clamp(brad.x + rand(-40,40)*sign(boss.x-brad.x)+ (brad.x<boss.x?90:-90), Cam.x+50, Cam.x+VW-50);
          spawnIceWall(clamp(wx,80,WORLD.w-80)); }
      }
      else if(boss.state==='opening'){
        boss.doorOpen=clamp(boss.doorOpen+dt*1.4,0,1);
        if(boss.doorOpen>=1){ boss.state='phase2'; boss.t=0; boss.summonCD=0.6; boss.laser.state='off'; boss.laser.t=1.6; }
      }
      else if(boss.phase===2){
        boss.doorOpen=clamp(boss.doorOpen+dt*1.4,0,1);
        boss.iceCD-=dt; boss.summonCD-=dt;
        if(boss.iceCD<=0){ boss.iceCD=rand(2.4,3.2); bossIceVolley(1); }
        if(boss.summonCD<=0){ const live=enemies.filter(e=>!e.dead && e.type==='drone').length;
          if(live<4){ boss.summonCD=rand(3.2,4.2); bossSummon(2); } else boss.summonCD=1.2; }
        updateBossLaser(dt);
      }
      else if(boss.phase===3){
        updateBerserk(dt);
      }
    },
    die(){
      boss.state='dying'; boss.dieT=1.6; boss.doorOpen=0; boss.laser.state='off';
      bossShots.length=0;
      floatText(boss.x,boss.cy-boss.h*0.5,'РАЗМОРОЗКА!',{color:'#ffd23f',size:24,font:'display',life:1.4,vy:-26});
      Audio_.tone(200,0.5,'sawtooth',0.3,40); Cam.addShake(18);
    },
    contact(){
      // лёгкий контактный урон корпусом в фазе 1 (idle) и фазе 2; берсерк — отдельно
      if(!((boss.phase===1 && boss.state==='idle') || boss.state==='phase2')) return;
      if(brad.alive && !brad.dashing && Math.abs(brad.x-boss.x)<(boss.w*0.42+brad.w*0.4) && (brad.y+brad.h*0.5)>boss.cy-boss.h*0.5+10){
        brad.hurt(10, boss.x);
      }
    },
    draw(){
      const W=boss.w, H=boss.h, f=boss.facing, cx=boss.x, cy=boss.cy;
      ctx.save(); ctx.translate(cx,cy);
      // тень
      ctx.save(); ctx.globalAlpha=0.32; ctx.fillStyle='#000';
      ctx.beginPath(); ctx.ellipse(0,H*0.5+boss.hop+4,W*0.55,10,0,0,TAU); ctx.fill(); ctx.restore();

      const fl=boss.flash>0;
      const berserk=boss.phase===3;
      const bodyA = fl?'#ffffff' : berserk?'#b85a6a' : '#cdd6dc';
      const bodyB = fl?'#ffffff' : berserk?'#8a3a48' : '#aab4bc';
      // корпус холодильника
      ctx.save(); ctx.scale(1,1);
      ctx.fillStyle=bodyB; roundRect(-W/2,-H/2,W,H,16); ctx.fill();
      const grd=ctx.createLinearGradient(-W/2,0,W/2,0);
      grd.addColorStop(0,bodyA); grd.addColorStop(0.5,bodyB); grd.addColorStop(1, berserk?'#6a2a36':'#8c969e');
      ctx.fillStyle=grd; roundRect(-W/2,-H/2,W,H,16); ctx.fill();
      // вертикальный блик
      ctx.fillStyle='rgba(255,255,255,.35)'; roundRect(-W*0.42,-H*0.46,W*0.14,H*0.9,8); ctx.fill();
      // шов морозилки (верхняя секция)
      ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-W/2+6,-H*0.16); ctx.lineTo(W/2-6,-H*0.16); ctx.stroke();
      // иней по корпусу
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(190,232,255,.18)';
      roundRect(-W/2,-H/2,W,H*0.2,16); ctx.fill();
      roundRect(-W/2,H*0.18,W,H*0.18,10); ctx.fill();
      ctx.globalCompositeOperation='source-over';

      // дверца (открывается во 2й фазе) — петли слева/справа от Брэда
      const open=boss.doorOpen;
      if(open>0.02){
        // тёмная внутренность
        ctx.fillStyle='#11161b'; roundRect(-W*0.4,-H*0.1,W*0.8,H*0.54,8); ctx.fill();
        // полки
        ctx.strokeStyle='rgba(150,190,210,.5)'; ctx.lineWidth=2;
        for(let k=1;k<=2;k++){ const yy=-H*0.1+ k*(H*0.54/3); ctx.beginPath(); ctx.moveTo(-W*0.36,yy); ctx.lineTo(W*0.36,yy); ctx.stroke(); }
        // КОМПРЕССОР — слабое место (светящееся ядро)
        if(boss.phase===2){
          const pulse=0.6+Math.sin(performance.now()/120)*0.4;
          const kx=0, ky=H*0.26;
          ctx.globalCompositeOperation='lighter';
          ctx.fillStyle=`rgba(255,${120+100*pulse|0},40,${0.5+0.4*pulse})`;
          ctx.beginPath(); ctx.arc(kx,ky, W*0.2*pulse+10,0,TAU); ctx.fill();
          ctx.globalCompositeOperation='source-over';
          ctx.fillStyle='#2a2a30'; roundRect(kx-W*0.16,ky-H*0.08,W*0.32,H*0.16,4); ctx.fill();
          ctx.fillStyle=`rgb(255,${140+80*pulse|0},60)`; ctx.beginPath(); ctx.arc(kx,ky,W*0.07,0,TAU); ctx.fill();
          // стрелка-подсказка
          ctx.fillStyle='#bfe8ff'; ctx.font="900 12px 'Russo One',sans-serif"; ctx.textAlign='center';
          ctx.fillText('▼', kx, ky-H*0.14-4);
        }
        // створка распахнута вбок (к Брэду), на петле
        ctx.save();
        const hingeX = f<0 ? -W*0.5 : W*0.5;
        ctx.translate(hingeX, -H*0.12);
        ctx.rotate(f * (-0.35 - open*0.85)); // распахивается наружу в сторону игрока
        const dw = W*0.9, dh = H*0.58;
        ctx.fillStyle=bodyB; roundRect(f<0?-dw:0, 0, dw, dh, 6); ctx.fill();
        ctx.fillStyle=bodyA; roundRect(f<0?-dw:0, 0, dw, dh*0.5, 6); ctx.fill();
        // уплотнитель по краю двери
        ctx.fillStyle='#2a2f34'; roundRect(f<0?-dw+3:dw-7, 4, 4, dh-8, 2); ctx.fill();
        ctx.restore();
      } else {
        // закрытая дверь: ручка + логотип
        ctx.fillStyle='rgba(0,0,0,.25)'; roundRect(f<0?-W*0.34:W*0.18, -H*0.06, W*0.16, H*0.5, 5); ctx.fill();
        ctx.fillStyle='#5a636b'; roundRect(f<0? W*0.2 : -W*0.32, -H*0.04, W*0.06, H*0.34, 3); ctx.fill(); // ручка
      }

      // «лицо»-панель сверху (злые LED-глаза)
      const ey=-H*0.32;
      ctx.save(); ctx.scale(f,1);
      const eyeColor = berserk? '#ff3b30' : '#bfe8ff';
      for(const ox of [-W*0.16, W*0.16]){
        ctx.globalCompositeOperation='lighter';
        ctx.fillStyle = berserk? 'rgba(255,60,40,.7)':'rgba(150,210,255,.7)';
        ctx.beginPath(); ctx.arc(ox,ey,10,0,TAU); ctx.fill();
        ctx.globalCompositeOperation='source-over';
        ctx.fillStyle='#0a0f14'; ctx.beginPath(); ctx.arc(ox,ey,6,0,TAU); ctx.fill();
        ctx.fillStyle=eyeColor; ctx.beginPath(); ctx.arc(ox+1.5,ey,3.2,0,TAU); ctx.fill();
      }
      // злые брови
      ctx.strokeStyle= berserk?'#ff7a6a':'#2a3a44'; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-W*0.24,ey-9); ctx.lineTo(-W*0.07,ey-3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W*0.24,ey-9); ctx.lineTo(W*0.07,ey-3); ctx.stroke();
      ctx.restore();

      // ножки
      ctx.fillStyle='#5a636b'; roundRect(-W*0.38,H*0.5-6,16,10,2); ctx.fill(); roundRect(W*0.28,H*0.5-6,16,10,2); ctx.fill();
      ctx.restore(); // scale
      ctx.restore(); // translate

      // телеграф/луч компрессора
      const L=boss.laser;
      if(boss.phase===2 && (L.state==='warn'||L.state==='fire')){
        const ox=boss.x+boss.facing*boss.w*0.3;
        ctx.save();
        if(L.state==='warn'){
          ctx.strokeStyle=`rgba(255,60,40,${0.3+0.4*Math.abs(Math.sin(performance.now()/60))})`; ctx.lineWidth=2; ctx.setLineDash([10,8]);
          ctx.beginPath(); ctx.moveTo(ox, L.y); ctx.lineTo(boss.facing<0?Cam.x-40:Cam.x+VW+40, L.y); ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.globalCompositeOperation='lighter';
          const lg=ctx.createLinearGradient(0,L.y-14,0,L.y+14);
          lg.addColorStop(0,'rgba(255,80,40,0)'); lg.addColorStop(0.5,'rgba(255,210,80,.9)'); lg.addColorStop(1,'rgba(255,80,40,0)');
          ctx.fillStyle=lg; const x0=boss.facing<0?Cam.x-40:ox, x1=boss.facing<0?ox:Cam.x+VW+40;
          ctx.fillRect(Math.min(x0,x1), L.y-13, Math.abs(x1-x0), 26);
          ctx.globalCompositeOperation='source-over';
        }
        ctx.restore();
      }
    },
  },
};
