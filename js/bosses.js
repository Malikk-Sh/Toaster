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
    this.atkCD=0; this.atkCD2=0; this.spin=0; this.pressY=0; this.press=null;
    this.bobp=0; this.t2=0; this.t3=0; this.fire=0;
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
  startBossKind(Z.climax);
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
  enemies.length=0; bossShots.length=0; iceWalls.length=0; toasts.length=0; notes.length=0; pickups.length=0;
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
function bossContactCheck(){ if(!boss.active || boss.state==='intro' || boss.state==='dying') return; boss.def().contact(); }
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
//  СТИРАЛЬНАЯ МАШИНА «ЦИКЛОН» (washer) — атаки
// ====================================================================
function washerWaterVolley(n){
  if(boss.state==='dying'||boss.state==='intro') return;
  Audio_.tone(280,0.16,'sine',0.14,160); Audio_.noise(0.12,0.08,1600);
  const ox=boss.x+boss.facing*boss.w*0.42, oy=boss.cy-boss.h*0.05;
  for(let k=0;k<n;k++){
    const tx=brad.x+rand(-110,110)*k, ty=(brad.y-brad.h*0.4)+rand(-20,20);
    setTimeout(()=>{ if(game.state==='playing'&&boss.active&&boss.state!=='dying') spawnIceCube(ox,oy,tx,ty,{dmg:13,size:12}); }, k*120);
  }
  burst(ox,oy,8,{colors:['#bfe8ff','#8fd2ff','#dffff0'],smax:160,szmax:4,lmax:0.35});
}
function washerSoapWave(){
  if(boss.state==='dying') return;
  Audio_.noise(0.3,0.16,1400); Cam.addShake(5);
  burst(boss.x,WORLD.groundY-6,12,{colors:['#dffff0','#bfe8ff','#fff'],smax:200,grav:200,szmax:4});
  spawnGroundWave(boss.x-boss.w*0.4,-1,{dmg:13,speed:340});
  spawnGroundWave(boss.x+boss.w*0.4, 1,{dmg:13,speed:340});
}
function washerSuck(dt){
  const dx=boss.x-brad.x, d=Math.abs(dx);
  if(brad.alive && d<480){ brad.vx += sign(dx)*180*dt; }
  if(Math.random()<0.5){ const a=rand(0,TAU), r=rand(80,210);
    spawnParticle({x:boss.x+Math.cos(a)*r,y:boss.cy+Math.sin(a)*r*0.6,vx:-Math.cos(a)*220,vy:-Math.sin(a)*140,life:0.4,max:0.4,size:2,color:'#bfe8ff',add:true}); }
}

// ====================================================================
//  ТЕХ-ФРЕШ ПРАЙМ (prime) — атаки
// ====================================================================
function primeSaws(n){
  Audio_.tone(300,0.12,'square',0.1,520);
  const ox=boss.x+boss.facing*boss.w*0.38, oy=boss.cy-boss.h*0.1;
  for(let k=0;k<n;k++){
    const ang=Math.atan2((brad.y-brad.h*0.4)-oy, brad.x-ox)+ (k-(n-1)/2)*0.22;
    spawnBullet(ox,oy,ang,{dmg:11,size:10,speed:520,g:50});
  }
  burst(ox,oy,6,{colors:['#ffd27a','#ff8a1e'],smax:140,szmax:4,lmax:0.3});
}
function primePress(){
  boss.press={state:'warn', x:clamp(brad.x,Cam.x+40,Cam.x+VW-40), t:0.85};
  Audio_.tone(150,0.2,'square',0.12,210);
}
function updatePrimePress(dt){
  const p=boss.press; if(!p) return;
  if(p.state==='warn'){ p.t-=dt;
    if(Math.random()<0.55) spawnParticle({x:p.x+rand(-22,22),y:WORLD.groundY-rand(0,220),vx:0,vy:-rand(20,60),life:0.3,max:0.3,size:3,color:'#ff5a40',add:true});
    if(p.t<=0){ p.state='strike'; p.t=0.25;
      Audio_.tone(70,0.3,'sawtooth',0.24,40); Audio_.noise(0.3,0.2,1000); Cam.addShake(12);
      burst(p.x,WORLD.groundY-6,18,{colors:['#ffd27a','#ff8a1e','#fff'],smax:300,grav:300,szmax:6});
      spawnGroundWave(p.x-10,-1,{dmg:16,speed:400}); spawnGroundWave(p.x+10,1,{dmg:16,speed:400});
      if(brad.alive && !brad.dashing && Math.abs(brad.x-p.x)<74 && brad.onGround) brad.hurt(22,p.x);
    }
  } else if(p.state==='strike'){ p.t-=dt; if(p.t<=0) boss.press=null; }
}
function primeSummon(n){
  for(let k=0;k<n;k++){ const sx=clamp(boss.x+rand(-180,180),60,WORLD.w-60);
    const fly=Math.random()<0.5;
    spawnEnemy(fly?'shock':'mine', sx, fly?WORLD.groundY-170:WORLD.groundY-ENEMY_DEFS.mine.h*0.5);
    burst(sx,WORLD.groundY-20,8,{colors:['#ff8a1e','#ffd27a'],smax:150,szmax:3}); }
  floatText(boss.x,boss.cy-boss.h*0.5,'УТИЛИЗАТОРЫ!',{color:'#ff9a4a',size:14,font:'display',vy:-24,life:0.9});
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

  // ------------------------------------------------------------------
  //  СТИРАЛЬНАЯ МАШИНА «ЦИКЛОН» (sewer)
  // ------------------------------------------------------------------
  washer:{
    barName:'🌀 СТИРАЛЬНАЯ МАШИНА «ЦИКЛОН»',
    barTint:['#3a9e7a','#7fe0c0','#dffff0'],
    dieColors:['#fff','#bfe8ff','#dffff0','#9fe0c0'],
    phaseLabel(){ return boss.phase===1?'ФАЗА 1 · ПОЛОСКАНИЕ' : boss.phase===2?'ФАЗА 2 · ОТЖИМ · БЕЙ В БАРАБАН' : 'ФАЗА 3 · ПЕРЕЛИВ'; },
    spawn(b){
      b.hp=b.maxhp=Math.round(980*diffMul());
      b.w=150; b.h=Math.min(182, VH*0.38); b.cy=WORLD.groundY-b.h*0.5;
      b.x=Math.min(WORLD.w-b.w*0.6, Cam.x+VW+b.w*0.5+40);
      b.state='intro'; b.intro=2.2; b.iceCD=1.0; b.wallCD=3.0; b.spin=0;
      floatText(brad.x, brad.y-120, 'БОСС', {color:'#7fe0c0',size:18,font:'display',life:1.2,vy:-18});
    },
    onStart(){
      Audio_.tone(80,1.0,'square',0.26,50); Audio_.noise(0.9,0.22,700); Cam.addShake(13);
      bossBanner('🌀 СТИРАЛЬНАЯ МАШИНА «ЦИКЛОН»','TechFresh «АкваШторм», утоплена в стоках');
    },
    damage(dmg,fx,fy,big){
      let mult=1;
      if(boss.phase===2 && boss.doorOpen>0.5) mult=2.2; // открытый барабан
      const final=Math.round(dmg*mult);
      boss.hp-=final; boss.flash=0.1;
      floatText(fx,fy-10,final.toString(),{color:mult>1?'#7fe0c0':'#fff',size:mult>1?24:16,weight:900});
      if(mult>1) floatText(boss.x,boss.cy-boss.h*0.4,'БАРАБАН ×2.2',{color:'#7fe0c0',size:14,font:'display',vy:-30,life:0.8});
      burst(fx,fy,big?6:4,{kind:'spark',colors:['#fff','#bfe8ff','#dffff0'],smax:big?260:180,szmax:3,lmax:0.35,grav:160});
      brad.gainUlt(big?2:1); checkBossPhase(); if(boss.hp<=0) bossDie();
    },
    checkPhase(){
      if(boss.phase===1 && boss.hp<=boss.maxhp*0.5){
        boss.phase=2; boss.state='opening'; boss.t=0; boss.doorOpen=0;
        bossBanner('ОТЖИМ!','Барабан раскрыт — бей внутрь, но держись: затягивает!');
        Audio_.tone(220,0.6,'sawtooth',0.2,120); Cam.addShake(9);
      } else if(boss.phase===2 && boss.hp<=boss.maxhp*0.2){
        boss.phase=3; boss.state='overflow'; boss.t=0; boss.doorOpen=0;
        bossBanner('⚠ ПЕРЕЛИВ','Машину прорвало — вода повсюду!');
        Audio_.tone(60,1.0,'sawtooth',0.3,30); Audio_.noise(0.8,0.25,600); Cam.addShake(15);
      }
    },
    update(dt){
      if(bossCommonUpdate(dt)) return;
      boss.spin=(boss.spin||0)+dt*(boss.phase===2?10:boss.phase===3?14:3);
      const homeX=clamp(brad.x + boss.facing*-240, WORLD.w*0.45, WORLD.w-boss.w*0.55);
      if(boss.phase!==3){ boss.x=lerp(boss.x, homeX, 1-Math.pow(0.5,dt)); boss.hop=lerp(boss.hop,0,0.1); }
      if(boss.phase===1){
        boss.iceCD-=dt; boss.wallCD-=dt;
        if(boss.iceCD<=0){ boss.iceCD=rand(1.6,2.4); washerWaterVolley(2+(Math.random()<0.5?1:0)); }
        if(boss.wallCD<=0){ boss.wallCD=rand(4.0,5.5); washerSoapWave(); }
      } else if(boss.state==='opening'){
        boss.doorOpen=clamp(boss.doorOpen+dt*1.2,0,1);
        if(boss.doorOpen>=1){ boss.state='spin'; boss.t=0; boss.iceCD=0.8; }
      } else if(boss.phase===2){
        boss.doorOpen=clamp(boss.doorOpen+dt*1.2,0,1);
        washerSuck(dt); boss.iceCD-=dt;
        if(boss.iceCD<=0){ boss.iceCD=rand(1.4,2.0); washerWaterVolley(2); }
      } else if(boss.phase===3){
        boss.iceCD-=dt; boss.wallCD-=dt; boss.hop=Math.abs(Math.sin(boss.t*10))*8;
        if(boss.iceCD<=0){ boss.iceCD=rand(0.9,1.4); washerWaterVolley(3); }
        if(boss.wallCD<=0){ boss.wallCD=rand(2.0,3.0); washerSoapWave(); }
        boss.x=lerp(boss.x, clamp(brad.x,WORLD.w*0.3,WORLD.w*0.7), 1-Math.pow(0.8,dt));
      }
    },
    die(){
      boss.state='dying'; boss.dieT=1.6; boss.doorOpen=0; bossShots.length=0;
      floatText(boss.x,boss.cy-boss.h*0.5,'СЛИВ!',{color:'#7fe0c0',size:24,font:'display',life:1.4,vy:-26});
      Audio_.tone(200,0.5,'sawtooth',0.3,40); Cam.addShake(18);
    },
    contact(){
      if(brad.alive && !brad.dashing && Math.abs(brad.x-boss.x)<(boss.w*0.45+brad.w*0.4) && (brad.y+brad.h*0.5)>boss.cy-boss.h*0.5+10){
        brad.hurt(boss.phase===3?16:10, boss.x);
      }
    },
    draw(){ drawWasherBoss(); },
  },

  // ------------------------------------------------------------------
  //  ROOMBA 9000 — полноценный босс (city)
  // ------------------------------------------------------------------
  roomba:{
    barName:'🤖 ROOMBA 9000',
    barTint:['#5a9e3a','#9fe06a','#d4f5a0'],
    dieColors:['#fff','#9fe06a','#ffd23f','#888'],
    phaseLabel(){ return boss.phase===1?'ФАЗА 1 · ПАТРУЛЬ' : boss.phase===2?'ФАЗА 2 · ЗАЧИСТКА' : 'ФАЗА 3 · ПЕРЕГРУЗ'; },
    spawn(b){
      b.hp=b.maxhp=Math.round(1050*diffMul());
      b.w=120; b.h=72; b.hop=150; b.cy=WORLD.groundY-b.h*0.5-b.hop;
      b.x=Math.min(WORLD.w-b.w*0.6, Cam.x+VW+b.w*0.5+40);
      b.state='intro'; b.intro=2.2; b.atkCD=2.0; b.summonCD=2.0; b.bobp=0;
      floatText(brad.x, brad.y-120,'БОСС',{color:'#9fe06a',size:18,font:'display',life:1.2,vy:-18});
    },
    onStart(){
      Audio_.tone(80,1.0,'square',0.24,60); Audio_.noise(0.8,0.2,900); Cam.addShake(13);
      bossBanner('🤖 ROOMBA 9000','Дрон-надзиратель TechFresh');
    },
    damage(dmg,fx,fy,big){
      const mult = boss.phase===3?1.3:1;
      const final=Math.round(dmg*mult);
      boss.hp-=final; boss.flash=0.1;
      floatText(fx,fy-10,final.toString(),{color:'#fff',size:16,weight:900});
      burst(fx,fy,big?6:4,{kind:'spark',colors:['#fff','#9fe06a','#ffd27a'],smax:big?240:170,szmax:3,lmax:0.35,grav:160});
      brad.gainUlt(big?2:1); checkBossPhase(); if(boss.hp<=0) bossDie();
    },
    checkPhase(){
      if(boss.phase===1 && boss.hp<=boss.maxhp*0.55){
        boss.phase=2; boss.t=0;
        bossBanner('РЕЖИМ ЗАЧИСТКИ','Roomba перешёл в боевой режим!');
        Audio_.tone(200,0.5,'square',0.2,120); Cam.addShake(9);
      } else if(boss.phase===2 && boss.hp<=boss.maxhp*0.22){
        boss.phase=3; boss.t=0;
        bossBanner('⚠ ПЕРЕГРУЗ','Дрон вышел из-под контроля!');
        Audio_.tone(60,1.0,'sawtooth',0.3,30); Audio_.noise(0.8,0.25,600); Cam.addShake(15);
      }
    },
    update(dt){
      if(bossCommonUpdate(dt)) return;
      boss.bobp=(boss.bobp||0)+dt*3;
      const hover=(boss.phase===3?120:160)+Math.sin(boss.bobp)*14;
      boss.hop=lerp(boss.hop, hover, 1-Math.pow(0.5,dt));
      const tx=clamp(brad.x + boss.facing*(boss.phase===3?60:200), WORLD.w*0.2, WORLD.w*0.8);
      boss.x=lerp(boss.x, tx, 1-Math.pow(boss.phase===3?0.7:0.55,dt));
      boss.atkCD-=dt; boss.summonCD-=dt;
      if(boss.phase<3 && boss.summonCD<=0){ const live=enemies.filter(o=>!o.dead).length;
        if(live<5){ boss.summonCD=rand(5,7); const n=randi(1,2);
          for(let k=0;k<n;k++){ const sx=clamp(boss.x+rand(-80,80),40,WORLD.w-40); spawnEnemy(boss.phase===2?'mine':'vac',sx,WORLD.groundY-ENEMY_DEFS.vac.h*0.5);
            burst(sx,WORLD.groundY-20,8,{colors:['#9fe06a','#caa15f'],smax:150,szmax:3}); }
          floatText(boss.x,boss.cy-boss.h*0.7,'ПОДКРЕПЛЕНИЕ!',{color:'#9fe06a',size:14,font:'display',vy:-24,life:0.9});
        } else boss.summonCD=1.5;
      }
      if(boss.atkCD<=0 && boss.state!=='burst'){ boss.state='burst'; boss.t2=0; Audio_.tone(90,0.2,'square',0.12,70); }
      if(boss.state==='burst'){ boss.t2=(boss.t2||0)+dt; boss.fire=(boss.fire||0)-dt;
        if(boss.fire<=0){ boss.fire=boss.phase===3?0.07:0.1;
          const ang=Math.atan2((brad.y-brad.h*0.4)-boss.cy, brad.x-boss.x)+rand(-0.16,0.16);
          spawnBullet(boss.x, boss.cy+boss.h*0.2, ang, {dmg:8, size:6, speed:580}); Audio_.shoot(); }
        if(boss.t2>(boss.phase===3?1.8:1.2)){ boss.state='idle'; boss.atkCD=rand(boss.phase===3?1.2:2.4, boss.phase===3?2.0:3.4); } }
    },
    die(){
      boss.state='dying'; boss.dieT=1.6; bossShots.length=0;
      floatText(boss.x,boss.cy-boss.h*0.5,'ПАТРУЛЬ ОТКЛЮЧЁН',{color:'#9fe06a',size:22,font:'display',life:1.4,vy:-24});
      Audio_.tone(200,0.5,'sawtooth',0.3,40); Cam.addShake(18);
    },
    contact(){
      if(brad.alive && !brad.dashing && Math.abs(brad.x-boss.x)<(boss.w*0.45+brad.w*0.4) && Math.abs((brad.y-brad.h*0.4)-boss.cy)<(boss.h*0.5+brad.h*0.5)){
        brad.hurt(boss.phase===3?14:11, boss.x);
      }
    },
    draw(){ drawRoombaBoss(); },
  },

  // ------------------------------------------------------------------
  //  ТЕХ-ФРЕШ ПРАЙМ — финальный босс (factory)
  // ------------------------------------------------------------------
  prime:{
    barName:'⚙ ТЕХ-ФРЕШ ПРАЙМ',
    barTint:['#c0603a','#ff9a4a','#ffd27a'],
    dieColors:['#fff','#ffd23f','#ff8a1e','#ff3b30'],
    phaseLabel(){ return boss.phase===1?'ФАЗА 1 · ПРЕСС' : boss.phase===2?'ФАЗА 2 · ЯДРО ОТКРЫТО' : 'ФАЗА 3 · ПЕРЕГРЕВ'; },
    spawn(b){
      b.hp=b.maxhp=Math.round(1500*diffMul());
      b.w=184; b.h=Math.min(252, VH*0.46); b.cy=WORLD.groundY-b.h*0.5;
      b.x=Math.min(WORLD.w-b.w*0.6, Cam.x+VW+b.w*0.5+40);
      b.state='intro'; b.intro=2.4; b.atkCD=1.2; b.atkCD2=2.4; b.press=null; b.summonCD=4;
      floatText(brad.x, brad.y-120,'ФИНАЛ',{color:'#ff9a4a',size:18,font:'display',life:1.4,vy:-18});
    },
    onStart(){
      Audio_.tone(60,1.4,'sawtooth',0.32,36); Audio_.noise(1.1,0.26,600); Cam.addShake(16);
      bossBanner('⚙ ТЕХ-ФРЕШ ПРАЙМ','Главный утилизатор корпорации');
    },
    damage(dmg,fx,fy,big){
      let mult;
      if(boss.phase>=2 && boss.doorOpen>0.5) mult=2.2; // открытое ядро
      else mult=0.85; // бронекорпус
      const final=Math.round(dmg*mult);
      boss.hp-=final; boss.flash=0.1;
      floatText(fx,fy-10,final.toString(),{color:mult>1?'#ff9a4a':'#fff',size:mult>1?24:16,weight:900});
      if(mult>1) floatText(boss.x,boss.cy-boss.h*0.4,'ЯДРО ×2.2',{color:'#ff9a4a',size:14,font:'display',vy:-30,life:0.8});
      burst(fx,fy,big?6:4,{kind:'spark',colors:['#fff','#ffd27a','#ff8a1e'],smax:big?260:180,szmax:3,lmax:0.35,grav:160});
      brad.gainUlt(big?2:1); checkBossPhase(); if(boss.hp<=0) bossDie();
    },
    checkPhase(){
      if(boss.phase===1 && boss.hp<=boss.maxhp*0.66){
        boss.phase=2; boss.state='opening'; boss.t=0; boss.doorOpen=0; boss.summonCD=0.8;
        bossBanner('ЯДРО ОТКРЫТО','Реактор обнажён — бей в ядро!');
        Audio_.tone(220,0.6,'square',0.2,90); Cam.addShake(10);
      } else if(boss.phase===2 && boss.hp<=boss.maxhp*0.33){
        boss.phase=3; boss.state='overheat'; boss.t=0;
        bossBanner('⚠ ПЕРЕГРЕВ','ПРАЙМ раскалился добела!');
        Audio_.tone(60,1.0,'sawtooth',0.32,30); Audio_.noise(0.8,0.25,600); Cam.addShake(16);
      }
    },
    update(dt){
      if(bossCommonUpdate(dt)) return;
      updatePrimePress(dt);
      const homeX=clamp(brad.x + boss.facing*-300, WORLD.w*0.4, WORLD.w-boss.w*0.55);
      if(boss.phase!==3){ boss.x=lerp(boss.x, homeX, 1-Math.pow(0.6,dt)); boss.hop=lerp(boss.hop,0,0.1); }
      if(boss.phase===1){
        boss.atkCD-=dt; boss.atkCD2-=dt;
        if(boss.atkCD<=0 && !boss.press){ boss.atkCD=rand(2.6,3.6); primePress(); }
        if(boss.atkCD2<=0){ boss.atkCD2=rand(1.8,2.6); primeSaws(3); }
      } else if(boss.state==='opening'){
        boss.doorOpen=clamp(boss.doorOpen+dt*1.3,0,1);
        if(boss.doorOpen>=1){ boss.state='core'; boss.t=0; boss.atkCD=1.0; boss.atkCD2=1.4; }
      } else if(boss.phase===2){
        boss.doorOpen=clamp(boss.doorOpen+dt*1.3,0,1);
        boss.atkCD-=dt; boss.atkCD2-=dt; boss.summonCD-=dt;
        if(boss.atkCD<=0 && !boss.press){ boss.atkCD=rand(2.8,3.6); primePress(); }
        if(boss.atkCD2<=0){ boss.atkCD2=rand(1.6,2.4); primeSaws(4); }
        if(boss.summonCD<=0){ const live=enemies.filter(e=>!e.dead).length; if(live<4){ boss.summonCD=rand(5,7); primeSummon(2);} else boss.summonCD=1.5; }
      } else if(boss.phase===3){
        boss.atkCD-=dt; boss.atkCD2-=dt; boss.hop=Math.abs(Math.sin(boss.t*12))*9;
        if(boss.atkCD<=0 && !boss.press){ boss.atkCD=rand(1.6,2.4); primePress(); }
        if(boss.atkCD2<=0){ boss.atkCD2=rand(1.0,1.6); primeSaws(5); }
        boss.x=lerp(boss.x, clamp(brad.x,WORLD.w*0.3,WORLD.w*0.7), 1-Math.pow(0.85,dt));
      }
    },
    die(){
      boss.state='dying'; boss.dieT=2.0; boss.doorOpen=0; boss.press=null; bossShots.length=0;
      floatText(boss.x,boss.cy-boss.h*0.5,'СИСТЕМА ОТКЛЮЧЕНА',{color:'#ff9a4a',size:22,font:'display',life:1.6,vy:-24});
      Audio_.tone(180,0.6,'sawtooth',0.3,36); Cam.addShake(20);
    },
    contact(){
      if(brad.alive && !brad.dashing && Math.abs(brad.x-boss.x)<(boss.w*0.45+brad.w*0.4) && (brad.y+brad.h*0.5)>boss.cy-boss.h*0.5+10){
        brad.hurt(boss.phase===3?18:12, boss.x);
      }
    },
    draw(){ drawPrimeBoss(); },
  },
};

// ====================================================================
//  Отрисовка новых боссов
// ====================================================================
function drawWasherBoss(){
  const W=boss.w,H=boss.h,cx=boss.x,cy=boss.cy;
  ctx.save(); ctx.translate(cx,cy);
  ctx.save(); ctx.globalAlpha=0.3; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,H*0.5+boss.hop+4,W*0.55,10,0,0,TAU); ctx.fill(); ctx.restore();
  const fl=boss.flash>0, over=boss.phase===3;
  const bodyA=fl?'#fff':over?'#7fb0c0':'#cfd6dc', bodyB=fl?'#fff':over?'#4a8090':'#9aa6b0';
  ctx.fillStyle=bodyB; roundRect(-W/2,-H/2,W,H,14); ctx.fill();
  const grd=ctx.createLinearGradient(-W/2,0,W/2,0); grd.addColorStop(0,bodyA); grd.addColorStop(0.5,bodyB); grd.addColorStop(1,over?'#356070':'#7a8690');
  ctx.fillStyle=grd; roundRect(-W/2,-H/2,W,H,14); ctx.fill();
  // верхняя панель
  ctx.fillStyle='#3a4550'; roundRect(-W/2+8,-H/2+8,W-16,H*0.16,6); ctx.fill();
  ctx.fillStyle='#7fe0c0'; ctx.beginPath(); ctx.arc(-W*0.3,-H*0.4,5,0,TAU); ctx.fill();
  ctx.fillStyle='#ffd23f'; ctx.beginPath(); ctx.arc(-W*0.18,-H*0.4,4,0,TAU); ctx.fill();
  ctx.fillStyle='#1a2228'; roundRect(W*0.04,-H*0.45,W*0.36,H*0.1,3); ctx.fill();
  // люк-барабан
  const drumR=W*0.34, dy=H*0.06;
  ctx.fillStyle='#2a343c'; ctx.beginPath(); ctx.arc(0,dy,drumR+6,0,TAU); ctx.fill();
  ctx.fillStyle='#1a2228'; ctx.beginPath(); ctx.arc(0,dy,drumR,0,TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0,dy,drumR,0,TAU); ctx.clip();
  if(boss.doorOpen>0.4 && boss.phase>=2){
    const pulse=0.6+Math.sin(performance.now()/120)*0.4;
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(120,255,210,${0.4+0.4*pulse})`;
    ctx.beginPath(); ctx.arc(0,dy,drumR*pulse,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle='rgba(180,255,230,.6)'; ctx.lineWidth=4;
    for(let k=0;k<3;k++){ ctx.save(); ctx.translate(0,dy); ctx.rotate(boss.spin+k*TAU/3); ctx.beginPath(); ctx.moveTo(-drumR,0); ctx.lineTo(drumR,0); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle='#dffff0'; ctx.font="900 13px 'Russo One',sans-serif"; ctx.textAlign='center'; ctx.fillText('◎', 0, dy+5);
  } else {
    ctx.save(); ctx.translate(0,dy); ctx.rotate(boss.spin);
    ctx.fillStyle='#3a4a55'; for(let k=0;k<3;k++){ ctx.rotate(TAU/3); roundRect(drumR*0.3,-6,drumR*0.5,12,4); ctx.fill(); }
    ctx.restore();
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(180,220,255,.18)'; ctx.beginPath(); ctx.arc(-drumR*0.3,dy-drumR*0.3,drumR*0.4,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
  }
  ctx.restore();
  ctx.strokeStyle='#5a6670'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,dy,drumR+2,0,TAU); ctx.stroke();
  // глаза
  const eyeC=over?'#ff3b30':'#7fe0c0';
  for(const ox of [-W*0.12,W*0.12]){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle=over?'rgba(255,60,40,.6)':'rgba(120,230,200,.6)'; ctx.beginPath(); ctx.arc(ox,-H*0.42,7,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#0a1410'; ctx.beginPath(); ctx.arc(ox,-H*0.42,4,0,TAU); ctx.fill(); ctx.fillStyle=eyeC; ctx.beginPath(); ctx.arc(ox,-H*0.42,2,0,TAU); ctx.fill(); }
  ctx.fillStyle='#4a545c'; roundRect(-W*0.4,H*0.5-6,16,10,2); ctx.fill(); roundRect(W*0.28,H*0.5-6,16,10,2); ctx.fill();
  ctx.restore();
}
function drawRoombaBoss(){
  const W=boss.w,H=boss.h,cx=boss.x,cy=boss.cy;
  ctx.save(); ctx.translate(cx,cy);
  const over=boss.phase===3, fl=boss.flash>0, burst_=boss.state==='burst';
  ctx.save(); ctx.globalAlpha=0.26; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,(WORLD.groundY-cy),W*0.5,10,0,0,TAU); ctx.fill(); ctx.restore();
  ctx.strokeStyle='#aab4bc'; ctx.lineWidth=3;
  for(const rx of [-W*0.36,W*0.36]){ ctx.save(); ctx.translate(rx,-H*0.5); ctx.rotate((boss.bobp||0)*10);
    ctx.beginPath(); ctx.moveTo(-W*0.2,0); ctx.lineTo(W*0.2,0); ctx.stroke(); ctx.restore();
    ctx.fillStyle='#5a636b'; ctx.fillRect(rx-1.5,-H*0.5,3,H*0.18); }
  ctx.fillStyle=fl?'#fff':over?'#7a3a32':'#2f343d'; roundRect(-W*0.5,-H*0.32,W,H*0.7,H*0.34); ctx.fill();
  ctx.fillStyle=fl?'#fff':over?'#a85048':'#3f4651'; roundRect(-W*0.5,-H*0.32,W,H*0.34,H*0.3); ctx.fill();
  ctx.fillStyle='#22262e'; roundRect(-W*0.18,-H*0.5,W*0.36,H*0.26,5); ctx.fill();
  ctx.save(); ctx.translate(0,H*0.34); ctx.rotate(burst_?(boss.t2||0)*30:0);
  ctx.fillStyle='#1a1d23'; for(let k=0;k<4;k++){ ctx.rotate(TAU/4); ctx.fillRect(-3,5,6,16); }
  ctx.fillStyle='#3a3f4a'; ctx.beginPath(); ctx.arc(0,0,8,0,TAU); ctx.fill(); ctx.restore();
  const ec=(burst_||over)?'#ff3b30':'#9fe06a';
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle=(burst_||over)?'rgba(255,60,40,.6)':'rgba(120,230,90,.6)';
  ctx.beginPath(); ctx.arc(0,-H*0.37,12,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#0a0f0a'; ctx.beginPath(); ctx.arc(0,-H*0.37,7,0,TAU); ctx.fill();
  ctx.fillStyle=ec; ctx.beginPath(); ctx.arc(0,-H*0.37,3.5,0,TAU); ctx.fill();
  ctx.restore();
}
function drawPrimeBoss(){
  const W=boss.w,H=boss.h,cx=boss.x,cy=boss.cy;
  ctx.save(); ctx.translate(cx,cy);
  ctx.save(); ctx.globalAlpha=0.32; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,H*0.5+boss.hop+4,W*0.55,12,0,0,TAU); ctx.fill(); ctx.restore();
  const fl=boss.flash>0, over=boss.phase===3;
  const bodyA=fl?'#fff':over?'#ff8a5a':'#5a5048', bodyB=fl?'#fff':over?'#b8482a':'#3a3430';
  ctx.fillStyle=bodyB; roundRect(-W/2,-H/2,W,H,12); ctx.fill();
  const grd=ctx.createLinearGradient(0,-H/2,0,H/2); grd.addColorStop(0,bodyA); grd.addColorStop(0.5,bodyB); grd.addColorStop(1,'#211c18');
  ctx.fillStyle=grd; roundRect(-W/2,-H/2,W,H,12); ctx.fill();
  // боковые поршни
  ctx.fillStyle='#2a2622'; roundRect(-W*0.5,-H*0.3,W*0.1,H*0.6,4); ctx.fill(); roundRect(W*0.4,-H*0.3,W*0.1,H*0.6,4); ctx.fill();
  // предупреждающие полосы
  ctx.fillStyle='rgba(255,180,60,.5)'; for(let k=-2;k<=2;k++){ ctx.fillRect(k*16-4,H*0.4-3,8,6); }
  // верхний пресс-молот
  const pressDown=(boss.press && boss.press.state==='strike')?10:0;
  ctx.fillStyle='#4a4038'; roundRect(-W*0.3,-H*0.5-18+pressDown,W*0.6,22,4); ctx.fill();
  ctx.fillStyle='#5a5048'; roundRect(-W*0.16,-H*0.5-6+pressDown,W*0.32,12,3); ctx.fill();
  // ядро
  ctx.fillStyle='#15110e'; roundRect(-W*0.26,-H*0.16,W*0.52,H*0.4,8); ctx.fill();
  const coreY=H*0.04;
  if(boss.doorOpen>0.3 && boss.phase>=2){
    const pulse=0.6+Math.sin(performance.now()/110)*0.4;
    ctx.globalCompositeOperation='lighter'; ctx.fillStyle=`rgba(255,${120+90*pulse|0},40,${0.5+0.4*pulse})`;
    ctx.beginPath(); ctx.arc(0,coreY,W*0.2*pulse+8,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=`rgb(255,${150+70*pulse|0},70)`; ctx.beginPath(); ctx.arc(0,coreY,W*0.1,0,TAU); ctx.fill();
    ctx.fillStyle='#ff9a4a'; ctx.font="900 13px 'Russo One',sans-serif"; ctx.textAlign='center'; ctx.fillText('▼',0,coreY-W*0.16);
  } else {
    ctx.fillStyle='#3a3430'; roundRect(-W*0.22,-H*0.12,W*0.44,H*0.32,5); ctx.fill();
    ctx.fillStyle='#2a2622'; for(let k=0;k<3;k++) ctx.fillRect(-W*0.18+k*W*0.16,-H*0.04,W*0.05,H*0.16);
  }
  // глаза-сенсоры
  const ey=-H*0.36, eyeC=over?'#ff3b30':'#ff9a4a';
  for(const ox of [-W*0.18,W*0.18]){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle=over?'rgba(255,60,40,.7)':'rgba(255,150,60,.6)'; ctx.beginPath(); ctx.arc(ox,ey,9,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#140d0a'; ctx.beginPath(); ctx.arc(ox,ey,5,0,TAU); ctx.fill(); ctx.fillStyle=eyeC; ctx.beginPath(); ctx.arc(ox,ey,2.4,0,TAU); ctx.fill(); }
  ctx.fillStyle='#2a2622'; roundRect(-W*0.42,H*0.5-6,18,10,2); ctx.fill(); roundRect(W*0.28,H*0.5-6,18,10,2); ctx.fill();
  ctx.restore();
  // телеграф/удар пресса (мировые координаты)
  if(boss.press){ const p=boss.press;
    ctx.save();
    if(p.state==='warn'){
      ctx.globalAlpha=0.25+0.2*Math.abs(Math.sin(performance.now()/70));
      const lg=ctx.createLinearGradient(0,0,0,WORLD.groundY); lg.addColorStop(0,'rgba(255,80,40,0)'); lg.addColorStop(1,'rgba(255,80,40,.5)');
      ctx.fillStyle=lg; ctx.fillRect(p.x-36,0,72,WORLD.groundY);
      ctx.globalAlpha=1; ctx.fillStyle='#ff5a40'; ctx.font="900 16px 'Russo One',sans-serif"; ctx.textAlign='center'; ctx.fillText('⬇', p.x, 44);
    } else {
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,210,80,.5)'; ctx.fillRect(p.x-30,WORLD.groundY-40,60,40); ctx.globalCompositeOperation='source-over';
    }
    ctx.restore();
  }
}
