"use strict";
const SHOP_EVERY = 3; // привал у Блендера каждые N волн

// Масштаб силы врага: NG+ × номер зоны × номер волны
function enemyScale(){
  return diffMul() * (1 + (game.zone||0)*0.12 + Math.max(0,(Spawner.wave-1))*0.05);
}

// Состав волн по зонам: [тип, вес, минимальная_волна]
const ZONE_POOLS={
  dump:    [['vac',3,1],['fan',3,1],['nuke',2,2],['drill',1.6,3],['mine',1.4,3]],
  sewer:   [['vac',2,1],['kettle',2.4,1],['mixer',2,2],['shock',1.8,2],['mine',1.6,3],['fan',1.4,1]],
  city:    [['drill',2.2,1],['nuke',2,1],['fan',1.8,1],['shock',2,2],['mixer',1.8,2],['vac',1.4,1]],
  factory: [['iron',2.2,1],['mixer',2,1],['shock',2,1],['mine',2,2],['nuke',1.7,2],['kettle',1.6,3]],
};
const FLYING=new Set(['fan','shock','drone']);

const Spawner={
  wave:0, alive:0, spawning:false, betweenT:0,
  reset(){ this.wave=0; this.alive=0; this.spawning=false; this.betweenT=1.2; boss.reset();
    game.zone=0; game.climaxDefeated=false; game.eliteActive=false; game.elite=null; },
  start(){ this.reset(); },
  startZone(){ this.wave=0; this.spawning=false; this.betweenT=2.6; }, // переход в новую зону
  update(dt){
    if(boss.active || game.eliteActive) return; // во время кульминации обычные волны на паузе
    if(this.betweenT>0){ this.betweenT-=dt; if(this.betweenT<=0) this.startWave(); return; }
    // следим за живыми
    if(enemies.filter(e=>!e.dead).length===0 && !this.spawning){
      const zw=curZone().waves;
      // зачищена последняя волна зоны? → кульминация
      if(this.wave>=zw && !game.climaxDefeated){ startClimax(); return; }
      // волна зачищена
      floatText(brad.x,brad.y-90,'ВОЛНА '+this.wave+' ЗАЧИЩЕНА',{color:'#9fe06a',size:20,font:'display',life:1.4,vy:-26});
      if(Math.random()<0.5 && typeof maybeSay==='function') maybeSay(brad,'waveClear',6000);
      const heal=Math.min(brad.maxhp-brad.hp, Math.round(brad.maxhp*0.16));
      if(heal>0){ brad.hp+=heal; floatText(brad.x,brad.y-60,'+'+heal,{color:'#9fe06a',size:16,vy:-30}); }
      if(brad.shieldMax>0) brad.shield=brad.shieldMax; // перезарядка щита между волнами
      Audio_.tone(523,0.12,'sine',0.16); Audio_.tone(784,0.16,'sine',0.16,null,0.1);
      // привал у Блендера между волнами
      if(this.wave>0 && this.wave % SHOP_EVERY===0){ openShop('run'); return; }
      this.betweenT=2.4;
    }
  },
  startWave(){
    this.wave++; this.spawning=true;
    floatText(brad.x,brad.y-100,'ВОЛНА '+this.wave,{color:'#ffd27a',size:30,font:'display',life:1.6,vy:-20});
    Audio_.wave();
    const Z=curZone();
    const pool=(ZONE_POOLS[Z.id]||ZONE_POOLS.dump).filter(p=>p[2]<=this.wave);
    const totW=pool.reduce((s,p)=>s+p[1],0);
    const n=clamp(3 + Math.floor(this.wave*1.3) + (game.zone||0), 4, 16);
    const toSpawn=[];
    for(let i=0;i<n;i++){
      let r=Math.random()*totW, type=pool[0][0];
      for(const p of pool){ r-=p[1]; if(r<=0){ type=p[0]; break; } }
      toSpawn.push(type);
    }
    // спавним с задержкой по краям/над землёй
    const myGen=game.gen;
    let delay=0;
    toSpawn.forEach((type)=>{
      delay+=rand(0.22,0.5);
      setTimeout(()=>{
        if(game.state!=='playing' || game.gen!==myGen) return;
        const side=Math.random()<0.5?-1:1;
        const camL=Cam.x, camR=Cam.x+VW;
        let x = side<0 ? clamp(camL-rand(40,140),20,WORLD.w-20) : clamp(camR+rand(40,140),20,WORLD.w-20);
        const y = FLYING.has(type)? WORLD.groundY-rand(120,240) : WORLD.groundY-ENEMY_DEFS[type].h*0.5;
        spawnEnemy(type,x,y);
        // вспышка-портал
        burst(x,y,8,{colors:['#ff8a1e','#ffd23f'],smax:120,szmax:4,lmax:0.4});
      }, delay*1000);
    });
    setTimeout(()=>{ if(game.gen===myGen) this.spawning=false; }, delay*1000+200);
  }
};

// ------------------------------ Фон ----------------------------------
