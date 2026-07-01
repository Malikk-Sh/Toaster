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
const UPGRADE_TREE={
  fire:{ name:'ОГОНЬ', icon:'🔥', color:'#ff8a1e', nodes:[
    {id:'fire1', name:'Калёный тост',        desc:'+25% к урону тостов',                 cost:8},
    {id:'fire2', name:'Жаркое клеймо',        desc:'Поджиг дольше и больнее',             cost:14},
    {id:'fire3', name:'Двойной выстрел',      desc:'Выстрел бьёт двумя тостами',          cost:26},
    {id:'fire4', name:'Термоудар',            desc:'Заряженный взрыв крупнее и сильнее',  cost:40},
    {id:'fire5', name:'Раскалённый залп',     desc:'Быстрее выстрелы и +10% урон',        cost:56},
    {id:'fireU', name:'Плавильный залп',      desc:'Тосты прожигают 1-го врага, +15% урон',cost:80},
  ]},
  armor:{ name:'БРОНЯ', icon:'🛡', color:'#5aa6e0', nodes:[
    {id:'arm1', name:'Толстый корпус',        desc:'+30 к макс. нагреву (HP)',            cost:8},
    {id:'arm2', name:'Хромо-отражатель',      desc:'25% шанс отразить лёд',               cost:14},
    {id:'arm3', name:'Саморазогрев',          desc:'Медленная регенерация HP',            cost:26},
    {id:'arm4', name:'Цепная детонация',      desc:'Враги взрываются при гибели',         cost:40},
    {id:'arm5', name:'Печной щит',            desc:'Раз в волну поглощает один удар',     cost:56},
    {id:'armU', name:'Двойной щит',           desc:'Щит держит 2 удара за волну',         cost:80},
  ]},
  speed:{ name:'СКОРОСТЬ', icon:'⚡', color:'#9fe06a', nodes:[
    {id:'spd1', name:'Лёгкий сплав',          desc:'+18% к скорости движения',            cost:8},
    {id:'spd2', name:'Турбо-ролики',          desc:'Рывок восстанавливается быстрее',     cost:14},
    {id:'spd3', name:'Тройной рывок',         desc:'+2 заряда рывка подряд',              cost:26},
    {id:'spd4', name:'Двойной прыжок',        desc:'Прыгай дважды в воздухе',             cost:40},
    {id:'spd5', name:'Импульс-ускоритель',    desc:'+1 заряд рывка, ещё быстрее откат',   cost:56},
    {id:'spdU', name:'Фазовый рывок',         desc:'+1 заряд рывка, дольше неуязвим в рывке',cost:80},
  ]},
};
function applyUpgrades(){
  const o=Save.data.owned;
  brad.maxhp = 100 + (o.arm1?30:0);
  brad.dmgMul = (o.fire1?1.25:1) * (o.fire5?1.1:1) * (o.fireU?1.15:1);
  brad.burnDmg = o.fire2?5:3;
  brad.burnMul = o.fire2?1.6:1;
  brad.doubleShot = !!o.fire3;
  brad.chargeAoeMul = o.fire4?1.5:1;
  brad.tapCD = o.fire5?0.07:0.10;
  brad.pierce = !!o.fireU;
  brad.reflectChance = o.arm2?0.25:0;
  brad.regen = o.arm3?2.2:0;
  brad.enemyDeathExplode = !!o.arm4;
  brad.shieldMax = o.armU?2 : (o.arm5?1:0); brad.shield = brad.shieldMax;
  brad.toughIframes = o.armU?1.1:0.85;
  brad.moveMul = o.spd1?1.18:1;
  brad.maxJumps = o.spd4?2:1;
  brad.dashMax = 1 + (o.spd3?2:0) + (o.spd5?1:0) + (o.spdU?1:0);
  brad.dashRegen = o.spd5?0.45 : (o.spd2?0.6:0.9);
  brad.dashIframes = o.spdU?0.4:0.22;
  if(brad.hp>brad.maxhp) brad.hp=brad.maxhp;
  brad.dashLeft=Math.min(brad.dashLeft||brad.dashMax, brad.dashMax);
}

// ------------------------------ Игра / цикл --------------------------
