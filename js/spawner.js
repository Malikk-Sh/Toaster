"use strict";
const BOSS_WAVE = 3; // после зачистки этой волны приходит босс
const SHOP_EVERY = 2; // привал у Блендера каждые N волн

// --- ледяные кубы (снаряды босса) ---
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
      const heal=Math.min(brad.maxhp-brad.hp,14);
      if(heal>0){ brad.hp+=heal; floatText(brad.x,brad.y-60,'+'+heal,{color:'#9fe06a',size:16,vy:-30}); }
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
    const city = curZone().id==='city';
    const n=2+Math.floor(this.wave*1.4) + (city?1:0);
    let toSpawn=[];
    for(let i=0;i<n;i++){
      let r=Math.random(), type='vac';
      if(city){
        // Город: добавляем Бурильщиков и больше Нюков
        if(r<0.26) type='drill';
        else if(r<0.5) type='nuke';
        else if(r<0.74) type='fan';
        else type='vac';
      } else {
        if(this.wave>=2 && r<0.3) type='nuke';
        else if(this.wave>=2 && r<0.62) type='fan';
        else type='vac';
        if(this.wave<2 && r<0.5) type='fan';
      }
      toSpawn.push(type);
    }
    // спавним с задержкой по краям/над землёй
    const myGen=game.gen;
    let delay=0;
    toSpawn.forEach((type,idx)=>{
      delay+=rand(0.25,0.6);
      setTimeout(()=>{
        if(game.state!=='playing' || game.gen!==myGen) return;
        const side=Math.random()<0.5?-1:1;
        const camL=Cam.x, camR=Cam.x+VW;
        let x = side<0 ? clamp(camL-rand(40,140),20,WORLD.w-20) : clamp(camR+rand(40,140),20,WORLD.w-20);
        const y = type==='fan'? WORLD.groundY-rand(120,240) : WORLD.groundY-ENEMY_DEFS[type].h*0.5;
        spawnEnemy(type,x,y);
        // вспышка-портал
        burst(x,y,8,{colors:['#ff8a1e','#ffd23f'],smax:120,szmax:4,lmax:0.4});
      }, delay*1000);
    });
    setTimeout(()=>{ if(game.gen===myGen) this.spawning=false; }, delay*1000+200);
  }
};

// ------------------------------ Фон ----------------------------------
