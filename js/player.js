"use strict";
const brad={
  x:0,y:0,vx:0,vy:0,w:46,h:54,
  facing:1, onGround:false, jumps:0, maxJumps:1,
  hp:100, maxhp:100, alive:true,
  iframes:0, dashing:false, dashT:0,
  dashMax:1, dashLeft:1, dashRegen:0.9, dashRegenT:0,
  fireCD:0, fireRate:0.42,
  charge:0, charging:false, chargeFx:0,
  ult:0, ultMax:100, ulting:false, ultT:0, ultPulse:0,
  squash:1, walkCycle:0, glow:0, slow:0,
  // модификаторы от апгрейдов (выставляются applyUpgrades)
  dmgMul:1, burnDmg:3, burnMul:1, doubleShot:false, chargeAoeMul:1, ultBoost:false,
  reflectChance:0, regen:0, enemyDeathExplode:false, toughIframes:0.85, ultArmor:false,
  moveMul:1, fireInDash:false, ultSpeed:false, shieldMax:0, shield:0,
  reset(){
    this.x=Math.min(260,WORLD.w*0.12); this.y=WORLD.groundY-this.h*0.5;
    this.vx=0;this.vy=0;this.hp=this.maxhp;this.alive=true;this.iframes=0;
    this.dashing=false;this.dashT=0;this.dashRegenT=0;this.dashLeft=this.dashMax;this.fireCD=0;this.charge=0;
    this.ult=0;this.ulting=false;this.ultT=0;this.facing=1;this.jumps=0;this.slow=0;
    this.shield=this.shieldMax;
  },
  gainUlt(v){ if(!this.ulting) this.ult=clamp(this.ult+v,0,this.ultMax); },
  chill(sec){ if(!this.alive) return; this.slow=Math.max(this.slow,sec);
    for(let k=0;k<6;k++) spawnParticle({x:this.x+rand(-this.w*0.4,this.w*0.4),y:this.y+rand(-this.h*0.4,this.h*0.4),
      vx:rand(-30,30),vy:rand(-40,10),life:rand(0.3,0.6),max:0.6,size:rand(2,4),color:pick(['#bfe8ff','#dff4ff']),add:true}); },
  hurt(dmg,fromX){
    if(!this.alive || this.iframes>0 || this.dashing || this.ulting) return;
    // печной щит поглощает один удар за волну
    if(this.shield>0){
      this.shield--; this.iframes=this.toughIframes; this.vx += sign(this.x-fromX)*180;
      floatText(this.x,this.y-this.h*0.9,'ЩИТ',{color:'#bfe8ff',size:18,font:'display'});
      Audio_.metal(); Cam.addShake(6);
      burst(this.x,this.y-this.h*0.4,16,{kind:'spark',colors:['#bfe8ff','#fff','#9fd6f5'],smax:280,szmax:3});
      return;
    }
    this.hp-=dmg; this.iframes=this.toughIframes; this.vx += sign(this.x-fromX)*260; this.vy=-180;
    Audio_.hurt(); Cam.addShake(11);
    floatText(this.x,this.y-this.h*0.9,'-'+dmg,{color:'#ff5a4a',size:20});
    burst(this.x,this.y-this.h*0.4,12,{kind:'spark',colors:['#fff','#ffd27a','#ff5a4a'],smax:280,szmax:3});
    if(this.hp<=0){ this.hp=0; this.die(); }
  },
  die(){
    this.alive=false; this.ulting=false;
    Audio_.tone(380,0.8,'sawtooth',0.3,60); Audio_.noise(0.7,0.25,800);
    burst(this.x,this.y-this.h*0.4,40,{colors:['#d9dde3','#ff8a1e','#ffd23f','#888'],smax:360,grav:400,szmax:7,lmax:1.0});
    Cam.addShake(16);
    setTimeout(gameOver, 850);
  },
  update(dt){
    if(!this.alive){ this.vy+=2200*dt; this.y+=this.vy*dt; if(this.y>WORLD.groundY-this.h*0.5){this.y=WORLD.groundY-this.h*0.5;this.vy=0;} return; }
    this.iframes=Math.max(0,this.iframes-dt);
    this.fireCD=Math.max(0,this.fireCD-dt);
    this.slow=Math.max(0,this.slow-dt);
    // восстановление зарядов рывка
    if(this.dashLeft<this.dashMax){ this.dashRegenT-=dt; if(this.dashRegenT<=0){ this.dashLeft=Math.min(this.dashMax,this.dashLeft+1); this.dashRegenT=this.dashRegen; } }
    // регенерация (апгрейд Саморазогрев)
    if(this.regen>0 && this.hp<this.maxhp){ this.hp=Math.min(this.maxhp, this.hp+this.regen*dt); }

    // ----- УЛЬТА -----
    if(Input.ultEdge && this.ult>=this.ultMax && !this.ulting){ this.startUlt(); }
    if(this.ulting){ this.updateUlt(dt); }

    // ----- движение -----
    const move=(Input.right?1:0)-(Input.left?1:0);
    const ultMove = this.ulting ? (this.ultSpeed?1.5:1.15) : 1;
    const speedMul = (this.charging?0.5 : ultMove) * (this.slow>0?0.5:1) * this.moveMul;
    if(move!==0){ this.facing=move; this.vx=lerp(this.vx, move*320*speedMul, 1-Math.pow(0.0005,dt)); this.walkCycle+=dt*12*Math.abs(this.vx)/300; }
    else this.vx=lerp(this.vx,0,1-Math.pow(0.0001,dt));

    // ----- рывок -----
    if(Input.dashEdge && this.dashLeft>0 && !this.dashing && !this.ulting){
      this.dashing=true; this.dashT=0.2; this.dashLeft--; this.dashRegenT=this.dashRegen;
      this.iframes=Math.max(this.iframes,0.22);
      this.vx=this.facing*820; this.vy=Math.min(this.vy,0);
      Audio_.dash();
    }
    if(this.dashing){ this.dashT-=dt; this.vx=this.facing*820;
      spawnParticle({x:this.x-this.facing*10,y:this.y-this.h*0.4+rand(-12,12),vx:-this.facing*120,vy:rand(-20,20),
        life:0.25,max:0.25,size:rand(3,7),color:pick(['#ffd27a','#ff8a1e','#fff']),add:true});
      // таран врагов
      for(const e of enemies){ if(!e.dead && Math.abs(e.x-this.x)<(e.w+this.w)*0.5 && Math.abs(e.y-this.y)<(e.h+this.h)*0.5){
        damageEnemy(e,Math.round(20*this.dmgMul),this.x,this.y,true); e.vx+=this.facing*200; } }
      // таран босса (рывок проходит сквозь, можно зайти за спину)
      if(boss.active && boss.state!=='intro' && boss.state!=='dying' && Math.abs(boss.x-this.x)<(boss.w*0.5+this.w*0.4) && Math.abs(boss.cy-this.y)<(boss.h*0.5+this.h*0.5)){
        if(!this._dashHitBoss){ damageBoss(Math.round(16*this.dmgMul),this.x,this.y,true); this._dashHitBoss=true; }
      }
      if(this.dashT<=0){ this.dashing=false; this._dashHitBoss=false; }
    }

    // ----- прыжок -----
    if(Input.jumpEdge && this.jumps<this.maxJumps){ this.vy=-820; this.jumps++; this.onGround=false; this.squash=0.7; Audio_.jump();
      burst(this.x,this.y+this.h*0.4,6,{colors:['#caa15f','#8a6a3a'],smax:120,szmax:3,lmax:0.3,grav:200}); }

    // ----- гравитация + физика -----
    if(!this.dashing) this.vy+=2200*dt;
    this.x+=this.vx*dt; this.y+=this.vy*dt;
    this.x=clamp(this.x, this.w*0.5, WORLD.w-this.w*0.5);

    // коллизия с платформами (стоим сверху)
    this.onGround=false;
    const feet=this.y+this.h*0.5;
    for(const pl of WORLD.platforms){
      const within = this.x > pl.x-this.w*0.4 && this.x < pl.x+pl.w+this.w*0.4;
      if(within && this.vy>=0 && feet>pl.y && feet < pl.y + (pl.ground? (VH): 40) ){
        // приземление только если ноги были выше верха платформы в этом кадре
        if(feet - this.vy*dt <= pl.y+18 || pl.ground && feet>pl.y){
          this.y=pl.y-this.h*0.5; this.vy=0; this.onGround=true;
        }
      }
    }
    if(this.onGround){ if(this.jumps>0){ this.squash=1.35; burst(this.x,this.y+this.h*0.4,4,{colors:['#caa15f'],smax:90,szmax:2,lmax:0.25,grav:200});} this.jumps=0; }
    this.squash=lerp(this.squash,1,1-Math.pow(0.001,dt));

    // ----- заряд / выстрел -----
    this.charging=Input.charging && !this.ulting;
    if(this.charging){ this.charge=clamp(this.charge+dt*1.0,0,1); this.chargeFx+=dt;
      if(this.charge>0.05 && Math.random()<0.6){
        const a=rand(0,TAU), r=rand(16,30);
        spawnParticle({x:this.x+Math.cos(a)*r,y:this.y-this.h*0.3+Math.sin(a)*r,vx:-Math.cos(a)*60,vy:-Math.sin(a)*60-40,
          life:0.3,max:0.3,size:rand(2,4)*(0.5+this.charge),color:pick(['#ff8a1e','#ffd23f']),add:true});
      }
    }
    if(Input.chargeReleaseEdge && this.charge>0.08){
      const p=this.charge; const tgt=pickTarget(this.x,this.y,99999);
      fireToast(this.x+this.facing*16,this.y-this.h*0.3,tgt,{charged:true,
        size:10+p*16, dmg:Math.round((28+p*46)*this.dmgMul), aoe:p*36*this.chargeAoeMul, facing:this.facing});
      Audio_.release(p); Cam.addShake(4+p*7);
      burst(this.x+this.facing*16,this.y-this.h*0.3,8+Math.round(p*8),{colors:['#ff6a00','#ffd23f'],smax:200,szmax:5});
      this.charge=0;
    }
    if(!this.charging && !Input.chargeReleaseEdge) this.charge=lerp(this.charge,0,1-Math.pow(0.001,dt));

    // авто-атака (стандартный выстрел по ближайшему врагу/боссу)
    if(!this.charging && !this.ulting && this.fireCD<=0 && (!this.dashing || this.fireInDash)){
      const tgt=pickTarget(this.x,this.y,760);
      if(tgt){ this.facing = tgt.x<this.x?-1:1;
        const dm=Math.round(10*this.dmgMul);
        fireToast(this.x+this.facing*14,this.y-this.h*0.32,tgt,{dmg:dm,size:9,facing:this.facing});
        if(this.doubleShot) fireToast(this.x+this.facing*14,this.y-this.h*0.18,tgt,{dmg:dm,size:8,facing:this.facing});
        Audio_.shoot(); this.fireCD=this.fireRate;
        if(!this.dashing) this.vx-=this.facing*30; // лёгкая отдача
      }
    }
    this.glow=lerp(this.glow, this.charge, 0.3);
  },
  startUlt(){
    this.ulting=true; this.ultT=this.ultBoost?4.2:2.8; this.ultPulse=0; this.ult=0; this.charge=0;
    Audio_.ult(); Cam.addShake(14);
    floatText(this.x,this.y-this.h*1.1, this.ultBoost?'ТОСТ-АПОКАЛИПСИС!':'ПОЛНЫЙ ПОДЖАРИГ!',{color:'#ffd23f',size:24,font:'display',life:1.3,vy:-30});
    // взрывная волна
    const wave=Math.round((this.ultBoost?34:24)*this.dmgMul);
    for(const e of enemies){ if(!e.dead && dist2(e.x,e.y,this.x,this.y)<260*260){ damageEnemy(e,wave,this.x,this.y,true); e.burn=3; } }
    if(boss.active && dist2(boss.x,boss.cy,this.x,this.y)<300*300){ damageBoss(Math.round((this.ultBoost?42:30)*this.dmgMul),this.x,this.y,true); boss.burn=Math.max(boss.burn,3.5); }
    burst(this.x,this.y-this.h*0.4,40,{colors:['#ff6a00','#ffd23f','#ff2a00'],smax:420,szmax:8,lmax:0.8});
  },
  updateUlt(dt){
    this.ultT-=dt; this.ultPulse-=dt;
    // постоянный огненный ореол
    if(Math.random()<0.9){ const a=rand(0,TAU), r=rand(20,70);
      spawnParticle({x:this.x+Math.cos(a)*r,y:this.y-this.h*0.4+Math.sin(a)*r*0.8,vx:Math.cos(a)*40,vy:-rand(40,120),
        life:rand(0.3,0.6),max:0.6,size:rand(3,7),color:pick(['#ff6a00','#ffd23f','#ff2a00']),add:true,grav:-50});
    }
    if(this.ultPulse<=0){
      this.ultPulse=(this.ultSpeed||this.ultBoost)?0.18:0.28; Cam.addShake(4);
      const dm1=Math.round(11*this.dmgMul), dm2=Math.round(12*this.dmgMul);
      // веер тостов (шире с апгрейдом)
      const arc=this.ultBoost?3:2;
      for(let k=-arc;k<=arc;k++){ fireToast(this.x,this.y-this.h*0.4,null,{angle:-Math.PI/2 + k*0.3, dmg:dm1, size:9, speed:560}); }
      // урон по площади
      for(const e of enemies){ if(!e.dead && dist2(e.x,e.y,this.x,this.y)<220*220){ damageEnemy(e,dm2,this.x,this.y,false); e.burn=Math.max(e.burn,1.5);} }
      if(boss.active && dist2(boss.x,boss.cy,this.x,this.y)<240*240){ damageBoss(Math.round(10*this.dmgMul),this.x,this.y,false); boss.burn=Math.max(boss.burn,2); }
      Audio_.shoot();
    }
    if(this.ultT<=0){ this.ulting=false; }
  },
  draw(){
    const wob = this.iframes>0 ? (Math.sin(performance.now()/40)*0.5+0.5) : 1;
    ctx.save();
    ctx.translate(this.x,this.y);
    // тень
    ctx.save(); ctx.globalAlpha=0.3; ctx.fillStyle='#000';
    const sc = clamp((WORLD.groundY-(this.y+this.h*0.5))/300,0,1);
    ctx.beginPath(); ctx.ellipse(0,WORLD.groundY-this.y - this.h*0.5 +4 ,this.w*0.5*(1-sc*0.4),6,0,0,TAU); ctx.fill(); ctx.restore();

    if(this.iframes>0 && Math.floor(performance.now()/70)%2===0) ctx.globalAlpha=0.45;
    const sx=lerp(1, 1/this.squash,0.6), sy=this.squash;
    ctx.scale(this.facing*sx, sy);

    // ----- иней при заморозке -----
    if(this.slow>0){
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle=`rgba(150,210,255,${0.18+0.12*Math.sin(performance.now()/120)})`;
      ctx.beginPath(); ctx.arc(0,-this.h*0.15, this.w*0.9,0,TAU); ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }

    // ----- печной щит (кольцо) -----
    if(this.shield>0){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      const sp=0.5+0.3*Math.sin(performance.now()/200);
      ctx.strokeStyle=`rgba(150,210,255,${0.4+sp*0.4})`; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(0,-this.h*0.12, this.w*0.85,0,TAU); ctx.stroke();
      ctx.globalCompositeOperation='source-over'; ctx.restore();
    }
    // ----- ореол заряда/ульты -----
    if(this.glow>0.05 || this.ulting){
      ctx.globalCompositeOperation='lighter';
      const g=this.ulting? 1 : this.glow;
      const col=this.ulting? `rgba(255,60,0,${0.5+Math.sin(performance.now()/60)*0.2})` : `rgba(255,150,30,${g*0.6})`;
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,-this.h*0.15, this.w*(0.7+g*0.7),0,TAU); ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }

    const W=this.w,H=this.h;
    const bodyTop = this.ulting? '#ff5a2a' : (this.glow>0.2? `rgb(${217+ (255-217)*this.glow|0},${221-90*this.glow|0},${227-150*this.glow|0})` : '#eef1f5');
    const bodyMid = this.ulting? '#e03a10' : '#c5ccd4';
    // корпус (хромированный тостер)
    ctx.fillStyle=bodyMid; roundRect(-W/2,-H*0.5,W,H*0.86,10); ctx.fill();
    // верхний блик
    const grd=ctx.createLinearGradient(0,-H*0.5,0,H*0.2);
    grd.addColorStop(0,bodyTop); grd.addColorStop(0.5,bodyMid); grd.addColorStop(1,'#9aa4ad');
    ctx.fillStyle=grd; roundRect(-W/2,-H*0.5,W,H*0.7,10); ctx.fill();
    // блик-полоса
    ctx.fillStyle='rgba(255,255,255,.5)'; roundRect(-W*0.38,-H*0.42,W*0.18,H*0.5,4); ctx.fill();
    // две щели сверху
    ctx.fillStyle='#2a2118'; roundRect(-W*0.3,-H*0.5,W*0.22,7,2); ctx.fill(); roundRect(W*0.08,-H*0.5,W*0.22,7,2); ctx.fill();
    // рычаг сбоку
    ctx.fillStyle='#8a6a3a'; roundRect(W*0.42,-H*0.2,6,H*0.4,3); ctx.fill();
    ctx.fillStyle='#b08a4a'; ctx.beginPath(); ctx.arc(W*0.45,-H*0.2,5,0,TAU); ctx.fill();
    // ножки
    ctx.fillStyle='#6b5847'; roundRect(-W*0.34,H*0.32,8,8,2); ctx.fill(); roundRect(W*0.26,H*0.32,8,8,2); ctx.fill();
    // ----- лицо (живые глаза в корпусе) -----
    const blink = (performance.now()%3600)<120 ? 0.15 : 1;
    ctx.save(); // глаза/лицо наследуют разворот корпуса
    drawEye(W*0.02, -H*0.05, 6, blink, this.ulting);
    drawEye(W*0.24, -H*0.05, 6, blink, this.ulting);
    // брови (упрямый/злой когда дерётся/ульта)
    ctx.strokeStyle= this.ulting?'#fff':'#3a2a1e'; ctx.lineWidth=2.4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(W*0.02-6,-H*0.16); ctx.lineTo(W*0.02+6,-H*0.12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.24-6,-H*0.12); ctx.lineTo(W*0.24+6,-H*0.16); ctx.stroke();
    ctx.restore();
    ctx.restore();

    function drawEye(x,y,r,bl,ult){
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(x,y,r,r*bl,0,0,TAU); ctx.fill();
      ctx.fillStyle= ult?'#ff3b30':'#2a2a2a'; ctx.beginPath(); ctx.arc(x+ (1)*1.5,y,r*0.55*bl+0.5,0,TAU); ctx.fill();
      if(ult){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,60,40,.6)'; ctx.beginPath(); ctx.arc(x,y,r*1.2,0,TAU); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
    }
  }
};
function nearestEnemy(x,y,maxd,facing){
  let best=null,bd=maxd*maxd;
  for(const e of enemies){ if(e.dead) continue;
    const d=dist2(x,y,e.x,e.y); if(d<bd){ bd=d; best=e; } }
  return best;
}
// цель для авто-наводки: ближайший враг ИЛИ босс (если активен и уязвим)
function bossAimTarget(){
  if(!boss.active || boss.state==='intro' || boss.state==='dying') return null;
  return {x:boss.x, y:boss.cy, h:boss.h, isBoss:true};
}
function pickTarget(x,y,maxd){
  const e=nearestEnemy(x,y,maxd,1);
  const b=bossAimTarget();
  if(!b) return e;
  const db=dist2(x,y,b.x,b.y);
  if(db>maxd*maxd) return e;
  if(!e) return b;
  return dist2(x,y,e.x,e.y) <= db ? e : b;
}

// ------------------------------ Волны --------------------------------
