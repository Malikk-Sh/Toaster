"use strict";
// Прогресс живёт только в памяти сессии: без localStorage/window.storage.
// Перезагрузка страницы полностью сбрасывает банк/апгрейды/NG+ — можно
// проходить заново с чистого листа.
const Save={
  data:{ bank:0, owned:{}, runs:0, bestWave:0, bossKills:0 },
  _loaded:false,
  async load(){ this._loaded=true; },
  persist(){ /* no-op: прогресс не сохраняется между перезагрузками */ },
  owns(id){ return !!this.data.owned[id]; },
  buy(id,cost){ if(this.owns(id)||this.data.bank<cost) return false; this.data.bank-=cost; this.data.owned[id]=true; return true; },
};

// ------------------------------ Дерево апгрейдов ---------------------
// Апгрейды — раскрытие механик, а не сухие циферки: темп стрельбы, скорость
// накопления ЖАРА, поджигающие тосты, таран рывком и т.п. Заряды рывка — макс 3.
const UPGRADE_TREE={
  fire:{ name:'ОГОНЬ', icon:'🔥', color:'#ff8a1e', nodes:[
    {id:'fire1', name:'Калёный тост',        desc:'+25% к урону тостов',                    cost:13},
    {id:'fire2', name:'Скорострел',           desc:'Заметно быстрее темп стрельбы',          cost:22},
    {id:'fire3', name:'Раздув жара',          desc:'ЖАР копится намного быстрее',            cost:42},
    {id:'fire4', name:'Поджигающий тост',     desc:'Тосты поджигают врагов — дольше и больнее',cost:64},
    {id:'fire5', name:'Двойной выстрел',      desc:'Выстрел бьёт двумя тостами',             cost:90},
    {id:'fireU', name:'Плавильный залп',      desc:'Тосты прожигают врага насквозь, взрыв крупнее',cost:128},
  ]},
  armor:{ name:'БРОНЯ', icon:'🛡', color:'#5aa6e0', nodes:[
    {id:'arm1', name:'Толстый корпус',        desc:'+30 к макс. нагреву (HP)',            cost:13},
    {id:'arm2', name:'Хромо-отражатель',      desc:'25% шанс отразить лёд',               cost:22},
    {id:'arm3', name:'Саморазогрев',          desc:'Медленная регенерация HP',            cost:42},
    {id:'arm4', name:'Цепная детонация',      desc:'Враги взрываются и поджигают соседей',cost:64},
    {id:'arm5', name:'Печной щит',            desc:'Раз в волну поглощает один удар',     cost:90},
    {id:'armU', name:'Двойной щит',           desc:'Щит держит 2 удара за волну',         cost:128},
  ]},
  speed:{ name:'РЫВОК', icon:'⚡', color:'#9fe06a', nodes:[
    {id:'spd1', name:'Лёгкий сплав',          desc:'+18% к скорости движения',            cost:13},
    {id:'spd2', name:'Турбо-ролики',          desc:'Рывок восстанавливается быстрее',     cost:22},
    {id:'spd3', name:'Тройной рывок',         desc:'Максимум зарядов рывка: 3',           cost:42},
    {id:'spd4', name:'Двойной прыжок',        desc:'Прыгай дважды в воздухе',             cost:64},
    {id:'spd5', name:'Рывок-таран',           desc:'Рывок бьёт сильнее и поджигает врагов',cost:90},
    {id:'spdU', name:'Фазовый рывок',         desc:'Дольше неуязвим во время рывка',      cost:128},
  ]},
};
function applyUpgrades(){
  const o=Save.data.owned;
  brad.maxhp = 100 + (o.arm1?30:0);
  brad.dmgMul = 0.75 * (o.fire1?1.25:1) * (o.fireU?1.15:1); // урон игрока −25%
  brad.burnDmg = o.fire4?5:3;
  brad.burnMul = o.fire4?1.9:1;
  brad.tapCD = o.fire2?0.12:0.20;          // темп стрельбы вдвое медленнее базой
  brad.chargeRate = o.fire3?0.875:0.5;     // ЖАР копится вдвое медленнее
  brad.doubleShot = !!o.fire5;
  brad.chargeAoeMul = o.fireU?1.5:1;
  brad.pierce = !!o.fireU;
  brad.reflectChance = o.arm2?0.25:0;
  brad.regen = o.arm3?2.2:0;
  brad.enemyDeathExplode = !!o.arm4;
  brad.shieldMax = o.armU?2 : (o.arm5?1:0); brad.shield = brad.shieldMax;
  brad.toughIframes = o.armU?1.1:0.85;
  brad.moveMul = o.spd1?1.18:1;
  brad.maxJumps = o.spd4?2:1;
  brad.dashMax = 1 + (o.spd3?2:0);         // максимум 3 заряда рывка
  brad.dashRegen = (o.spd2?0.55:0.9)*2.5;  // откат рывка ×2.5 медленнее (нерф)
  brad.dashIframes = o.spdU?0.42:0.22;
  brad.dashSpeed = 615;                     // скорость рывка −25% (820→615)
  brad.dashDmgMul = o.spd5?1.8:1;          // рывок-таран
  brad.dashIgnite = !!o.spd5;
  if(brad.hp>brad.maxhp) brad.hp=brad.maxhp;
  brad.dashLeft=Math.min(brad.dashLeft||brad.dashMax, brad.dashMax);
}

// ------------------------------ Игра / цикл --------------------------
