"use strict";
const SHOP_EVERY = 3; // привал у Блендера каждые N волн

// Масштаб живучести/силы врага: изначально ×1.5, с прогрессом (зона×волна) до ×4.
// progress 0→1 по ходу игры; сверху ещё множитель Новой Игры+.
function enemyScale(){
  const progress = clamp(((game.zone||0)*10 + Math.max(0,Spawner.wave)) / 40, 0, 1);
  return clamp(1.5 + progress*2.5, 1.5, 4) * diffMul();
}

// Состав волн по зонам: [тип, вес, минимальная_волна]
// [тип, вес, мин.волна] — тяжёлые враги вводятся постепенно по ходу зоны
const ZONE_POOLS={
  dump:    [['vac',3,1],['fan',3,1],['nuke',2.2,3],['juicer',1.8,4],['drill',1.8,5],['mine',1.6,7]],
  sewer:   [['kettle',2.4,1],['vac',2,1],['fan',1.6,2],['mixer',2,3],['juicer',1.8,4],['shock',1.8,5],['mine',1.6,7]],
  city:    [['fan',1.8,1],['drill',2.2,2],['nuke',2,3],['juicer',2,3],['shock',2,4],['vac',1.4,1],['mixer',1.8,6]],
  factory: [['mixer',2,1],['shock',2,2],['nuke',1.8,3],['juicer',2,3],['iron',2.2,4],['mine',2,6],['kettle',1.6,7]],
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
      // зачищена последняя волна зоны? → открыть путь и запустить босса
      if(this.wave>=zw && !game.climaxDefeated){ if(typeof openGate==='function') openGate(zw-1); startClimax(); return; }
      // волна зачищена
      floatText(brad.x,brad.y-90,'ВОЛНА '+this.wave+' ЗАЧИЩЕНА · ВПЕРЁД →',{color:'#9fe06a',size:19,font:'display',life:1.6,vy:-26});
      if(Math.random()<0.5 && typeof maybeSay==='function') maybeSay(brad,'waveClear',6000);
      const heal=Math.min(brad.maxhp-brad.hp, Math.round(brad.maxhp*0.16));
      if(heal>0){ brad.hp+=heal; floatText(brad.x,brad.y-60,'+'+heal,{color:'#9fe06a',size:16,vy:-30}); }
      if(brad.shieldMax>0) brad.shield=brad.shieldMax; // перезарядка щита между волнами
      if(typeof openGate==='function') openGate(this.wave-1); // ворота вперёд открываются
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
    const n=clamp(3 + Math.floor(this.wave*0.8) + (game.zone||0), 4, 12);
    // текущий сегмент = номер волны
    const segIdx=clamp(this.wave-1,0,(WORLD.segments.length||1)-1);
    const seg=WORLD.segments[segIdx]||{x0:0,x1:WORLD.w};
    const toSpawn=[];
    for(let i=0;i<n;i++){
      let r=Math.random()*totW, type=pool[0][0];
      for(const p of pool){ r-=p[1]; if(r<=0){ type=p[0]; break; } }
      toSpawn.push(type);
    }
    // спавним с задержкой внутри текущего сегмента
    const myGen=game.gen;
    let delay=0;
    toSpawn.forEach((type)=>{
      delay+=rand(0.22,0.5);
      setTimeout(()=>{
        if(game.state!=='playing' || game.gen!==myGen) return;
        let x = clamp(rand(seg.x0+70, seg.x1-70), 20, WORLD.w-20);
        const y = FLYING.has(type)? WORLD.groundY-rand(120,240) : WORLD.groundY-ENEMY_DEFS[type].h*0.5;
        spawnEnemy(type,x,y);
        burst(x,y,8,{colors:['#ff8a1e','#ffd23f'],smax:120,szmax:4,lmax:0.4});
      }, delay*1000);
    });
    setTimeout(()=>{ if(game.gen===myGen) this.spawning=false; }, delay*1000+200);
  }
};

// ------------------------------ Фон ----------------------------------
