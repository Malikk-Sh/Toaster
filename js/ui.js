"use strict";
function drawHUD(){
  const pad=14, top=Math.max(12, (window.visualViewport? 0:0)+ parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe')||0) ) +12;
  ctx.save();
  ctx.textBaseline='top';
  // --- HP "нагрев" ---
  const bw=Math.min(220,VW*0.42), bh=16, bx=pad, by=top;
  ctx.fillStyle='rgba(0,0,0,.45)'; roundRect(bx-3,by-3,bw+6,bh+6,5); ctx.fill();
  ctx.fillStyle='#2a1a12'; roundRect(bx,by,bw,bh,4); ctx.fill();
  const hpFrac=clamp(brad.hp/brad.maxhp,0,1);
  const hg=ctx.createLinearGradient(bx,0,bx+bw,0);
  hg.addColorStop(0,'#ff3b1e'); hg.addColorStop(0.5,'#ff8a1e'); hg.addColorStop(1,'#ffd23f');
  ctx.fillStyle=hg; roundRect(bx,by,bw*hpFrac,bh,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.18)'; roundRect(bx,by,bw*hpFrac,bh*0.45,4); ctx.fill();
  ctx.font="700 11px 'Rubik',sans-serif"; ctx.fillStyle='#fff'; ctx.textAlign='center';
  ctx.fillText(Math.ceil(brad.hp)+' / '+brad.maxhp, bx+bw/2, by+2.5);
  ctx.textAlign='left';
  ctx.font="900 11px 'Russo One',sans-serif"; ctx.fillStyle='#caa15f'; ctx.fillText('БРЭД · НАГРЕВ', bx+2, by+bh+5);

  // --- Крошки ---
  const cy=by+bh+24;
  ctx.font="900 20px 'Russo One',sans-serif"; ctx.textBaseline='middle';
  // иконка крошки
  ctx.fillStyle='#f2c879'; roundRect(bx+1,cy-7,13,13,2); ctx.fill();
  ctx.fillStyle='#b5722a'; ctx.fillRect(bx+3,cy-4,3,3); ctx.fillRect(bx+8,cy+1,3,3);
  ctx.fillStyle='#fff'; ctx.fillText(game.crumbs.toString(), bx+22, cy+1);
  ctx.font="800 11px 'Rubik',sans-serif"; ctx.fillStyle='#bfa789'; ctx.textBaseline='top';
  // --- заряды рывка (компактный индикатор — на десктопе; на тач заряды на кнопке) ---
  if(brad.dashMax>1 && !isTouch){
    const dyp=cy+16; let dxp=bx+2;
    const regen = brad.dashLeft<brad.dashMax ? 1-clamp(brad.dashRegenT/brad.dashRegen,0,1) : 0;
    for(let k=0;k<brad.dashMax;k++){
      const filled = k < Math.floor(brad.dashLeft);
      ctx.fillStyle = filled? '#9fe06a':'rgba(255,255,255,.18)';
      roundRect(dxp,dyp,16,5,2); ctx.fill();
      // прогресс отката на следующей пипке
      if(!filled && k===Math.floor(brad.dashLeft) && regen>0){ ctx.fillStyle='rgba(159,224,106,.6)'; roundRect(dxp,dyp,16*regen,5,2); ctx.fill(); }
      dxp+=20;
    }
    ctx.font="800 9px 'Rubik',sans-serif"; ctx.fillStyle='#9fe06a'; ctx.fillText('РЫВОК', dxp+2, dyp-2);
  }

  // --- Центр сверху: волна / полоса босса / полоса элиты ---
  ctx.textAlign='center'; ctx.textBaseline='top';
  if(boss.active){
    drawBossBar(top);
  } else if(game.elite && !game.elite.dead){
    drawEliteBar(top, game.elite);
  } else {
    const Z=curZone();
    ctx.font="900 14px 'Russo One',sans-serif";
    const wt='ВОЛНА '+Math.max(1,Spawner.wave)+' / '+Z.waves;
    ctx.fillStyle='#ffd27a'; ctx.fillText(wt, VW/2, top);
    ctx.font="700 11px 'Rubik',sans-serif"; ctx.fillStyle='#cdb795';
    const aliveN=enemies.filter(e=>!e.dead).length;
    const climaxName = Z.climax==='fridge'?'БОСС':'ЭЛИТА';
    const sub = (Spawner.wave>=Z.waves && !game.climaxDefeated)
      ? Z.name+' · впереди '+climaxName
      : Z.name+' · врагов: '+aliveN;
    ctx.fillText(sub, VW/2, top+19);
  }

  ctx.restore();
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}
function drawBossBar(top){
  const bw=Math.min(VW*0.72, 460), bx=VW/2-bw/2, by=top+14, bh=15;
  // имя
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font="900 14px 'Russo One',sans-serif";
  const def=boss.def();
  ctx.fillStyle='#dff4ff'; ctx.fillText(def.barName, VW/2, by-4);
  // рамка
  ctx.fillStyle='rgba(0,0,0,.5)'; roundRect(bx-3,by-1,bw+6,bh+6,5); ctx.fill();
  ctx.fillStyle='#101820'; roundRect(bx,by+1,bw,bh,4); ctx.fill();
  const frac=clamp(boss.hp/boss.maxhp,0,1);
  const g=ctx.createLinearGradient(bx,0,bx+bw,0);
  const tint=def.barTint||['#5aa6e0','#8fd2ff','#dff4ff'];
  if(boss.phase===3){ g.addColorStop(0,'#ff3b30'); g.addColorStop(1,'#ff8a4a'); }
  else { g.addColorStop(0,tint[0]); g.addColorStop(0.5,tint[1]); g.addColorStop(1,tint[2]); }
  ctx.fillStyle=g; roundRect(bx,by+1,bw*frac,bh,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.22)'; roundRect(bx,by+1,bw*frac,bh*0.42,4); ctx.fill();
  // пороги фаз (50% и 20%)
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.fillRect(bx+bw*0.5,by+1,2,bh); ctx.fillRect(bx+bw*0.2,by+1,2,bh);
  // пип-индикатор фазы
  ctx.font="700 10px 'Rubik',sans-serif"; ctx.fillStyle='#bfe8ff';
  ctx.fillText(def.phaseLabel(), VW/2, by+bh+14);
}
function drawEliteBar(top, e){
  const bw=Math.min(VW*0.66, 420), bx=VW/2-bw/2, by=top+14, bh=14;
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font="900 14px 'Russo One',sans-serif"; ctx.fillStyle='#9fe06a';
  ctx.fillText('🤖 '+e.name+' · ЭЛИТА', VW/2, by-4);
  ctx.fillStyle='rgba(0,0,0,.5)'; roundRect(bx-3,by-1,bw+6,bh+6,5); ctx.fill();
  ctx.fillStyle='#101820'; roundRect(bx,by+1,bw,bh,4); ctx.fill();
  const frac=clamp(e.hp/e.maxhp,0,1);
  const g=ctx.createLinearGradient(bx,0,bx+bw,0);
  g.addColorStop(0,'#5a9e3a'); g.addColorStop(0.5,'#9fe06a'); g.addColorStop(1,'#d4f5a0');
  ctx.fillStyle=g; roundRect(bx,by+1,bw*frac,bh,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.22)'; roundRect(bx,by+1,bw*frac,bh*0.42,4); ctx.fill();
}

// ------------------------------ Хелпер фигур -------------------------
const elChargeRing=document.getElementById('chargeRing');
const elDashFill=document.getElementById('dashFill');
const elDashCount=document.getElementById('dashCount');
function syncTouchUI(){
  // кольцо заряда ЖАР
  const c=brad.charge;
  if(c>0.05){ elChargeRing.style.borderColor=`rgba(255,${200-c*160|0},40,1)`;
    elChargeRing.style.transform=`scale(${1+c*0.12})`; elChargeRing.style.opacity=1; }
  else { elChargeRing.style.opacity=0; }
  // заряды рывка прямо на кнопке: бейдж-счётчик + оверлей отката снизу вверх
  if(elDashCount){
    if(brad.dashMax>1){
      elDashCount.textContent=Math.floor(brad.dashLeft);
      elDashCount.style.display='flex';
    } else { elDashCount.style.display='none'; }
    const regen = brad.dashLeft<brad.dashMax ? 1-clamp(brad.dashRegenT/brad.dashRegen,0,1) : (brad.dashLeft>0?1:0);
    elDashFill.style.height = (regen<1 ? (regen*100).toFixed(0)+'%' : '0%');
    elDashFill.style.opacity = (brad.dashLeft<brad.dashMax) ? 1 : 0;
  }
}

// ------------------------------ Меню / DOM ---------------------------
function show(id){ document.getElementById(id).classList.remove('hidden'); }
function hide(id){ document.getElementById(id).classList.add('hidden'); }
function hideAll(){ ['screen-start','screen-pause','screen-over','screen-win','screen-shop'].forEach(hide); }

// --- крошки: банк/потери ---
function bankCrumbs(){ if(game.crumbs>0){ Save.data.bank += game.crumbs; game.crumbs=0; Save.persist(); } }

// --- Мастерская (магазин Блендера) ---
const SHOP_QUOTES=[
  '«Тостер! Живой! Невероятно — стой, не двигайся — апгрейд? Конечно апгрейд!»',
  '«Крошки гони, железо налажу, да-да-да, я быстро, я гений, я… о чём это я?»',
  '«ОГОНЬ, БРОНЯ, СКОРОСТЬ — выбирай ветку, потом доберём остальное!»',
  '«Бил холодильник? Молодец. Завод не возьмёшь голым корпусом, поверь.»',
];
let shopReturn='menu';
function openShop(context){
  shopReturn=context;
  if(context==='run') bankCrumbs(); // заносим добычу забега в банк
  game.state='shop';
  document.getElementById('shop-quote').textContent=pick(SHOP_QUOTES);
  document.getElementById('btn-shop-go').textContent = context==='run' ? 'В бой' : 'Назад';
  document.getElementById('btn-pause').style.display='none';
  Music.duck(true);
  renderShop();
  hideAll(); show('screen-shop');
}
function renderShop(){
  document.getElementById('shop-bank-n').textContent=Save.data.bank;
  const cols=document.getElementById('shop-cols'); cols.innerHTML='';
  for(const key of ['fire','armor','speed']){
    const br=UPGRADE_TREE[key];
    const col=document.createElement('div'); col.className='branch';
    const h=document.createElement('div'); h.className='branch-h';
    h.textContent=br.icon+' '+br.name; h.style.color=br.color; h.style.borderColor=br.color+'55';
    col.appendChild(h);
    br.nodes.forEach((nd,idx)=>{
      const owned=Save.owns(nd.id);
      const prevOwned = idx===0 || Save.owns(br.nodes[idx-1].id);
      const affordable = Save.data.bank>=nd.cost;
      const el=document.createElement('div'); el.className='node';
      let state;
      if(owned) state='owned';
      else if(!prevOwned) state='lock';
      else if(!affordable) state='poor';
      else state='buy';
      el.classList.add(state);
      el.innerHTML =
        (owned?'<span class="tick">✓</span>':'')+
        '<div class="nm">'+nd.name+'</div>'+
        '<div class="ds">'+nd.desc+'</div>'+
        '<div class="ct">'+(owned?'куплено':'<span class="ic"></span>'+nd.cost)+'</div>';
      if(state==='buy'){ el.addEventListener('click',()=>buyNode(nd.id, nd.cost)); }
      else if(state==='lock'){ el.title='Сначала купите предыдущий апгрейд'; }
      else if(state==='poor'){ el.title='Не хватает крошек'; }
      col.appendChild(el);
    });
    cols.appendChild(col);
  }
}
function buyNode(id,cost){
  if(Save.buy(id,cost)){
    Audio_.tone(660,0.1,'square',0.16,990); Audio_.tone(880,0.12,'sine',0.12,1320,0.05);
    applyUpgrades();
    // если в забеге — мгновенно подлечим за «толстый корпус» и т.п.
    if(id==='arm1') brad.hp=Math.min(brad.maxhp, brad.hp+30);
    renderShop();
  } else {
    Audio_.tone(160,0.18,'sawtooth',0.18,90);
  }
}
function closeShop(){
  Music.duck(false);
  if(shopReturn==='run'){
    hideAll(); game.state='playing';
    document.getElementById('btn-pause').style.display='flex';
    Spawner.betweenT=0.8; // следующая волна вот-вот
  } else {
    hideAll(); show('screen-start'); game.state='menu';
    refreshMenu();
  }
}

function refreshMenu(){
  const el=document.getElementById('menu-stats'); if(!el) return;
  const owned=Object.keys(Save.data.owned).length;
  const ng=Save.data.ngPlus||0;
  let line = '🍞 Крошек в банке: <b style="color:#f2c879">'+Save.data.bank+'</b> · апгрейдов: <b style="color:#9fe06a">'+owned+'</b>';
  if(ng>0) line += ' · <b style="color:#ff7a6a">Новая Игра+'+ng+'</b>';
  if(Save.data.bossKills>0) line += '<br>🏆 Полных прохождений: '+Save.data.bossKills;
  else if(Save.data.bestWave>0) line += '<br>Рекорд: волна '+Save.data.bestWave;
  el.innerHTML=line;
}
