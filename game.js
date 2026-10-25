'use strict';
// QuickStock engine + UI. Data lives in data.js.

const TPC = 12, CPD = 25, TPD = TPC * CPD;          // ticks per candle, candles per day, ticks per day (75s at 1x)
const FEE = 0.0005, SIG = 0.0013, START_CASH = 100000;
const UNLOCK = { short: 500000, lev: 2500000, opt: 10000000 };
const SAVE_KEY = 'quickstock-v1', T0 = 100000;
const BDEF = Object.fromEntries(BUSINESSES.map(b => [b.id, b]));

let S, MAP = {}, chart, series, entryLine, mouseDown = false, newsVer = 0, quiet = false;
let COL = {}, rc = 0, infoSym = null, modalQ = [], modalBtns = null, lastSnd = 0, lastNW = 0, lastSort = 0, chartSym = null;

// ---------- utils ----------
const $ = s => document.querySelector(s);
// Room games keep the market's random state in S.rs (mulberry32), so everyone in a room sees the same market.
// Anything a player's own choices trigger (tips, business luck, confetti) runs inside own() so it never shifts that stream.
function rng() {
  if (S?.rs == null) return Math.random();
  const a = S.rs = S.rs + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function own(fn) { const rs = S.rs; S.rs = null; try { return fn(); } finally { S.rs = rs; } }
const rand = (a, b) => a + rng() * (b - a);
const rnd = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(rng() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = () => { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const day = () => Math.floor(S.t / TPD) + 1;
const gNow = () => Math.floor(S.t / TPC);
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function wpick(w) { let r = rng() * Object.values(w).reduce((a, b) => a + b, 0); for (const k in w) if ((r -= w[k]) < 0) return k; return Object.keys(w)[0]; }
function money(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e7) return s + '₹' + (a / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(2) + ' L';
  return s + '₹' + a.toLocaleString('en-IN', { maximumFractionDigits: a < 100 ? 2 : 0 });
}
const px = p => '₹' + p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%';
const cls = x => x > 0 ? 'up' : x < 0 ? 'dn' : '';
const arrow = x => x > 0 ? '▲' : x < 0 ? '▼' : '•';
function clock(t) { const m = 555 + Math.floor((t % TPD) * 375 / TPD); return String(m / 60 | 0).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function gLabel(time) { const g = time / 900 - T0, m = 555 + (((g % CPD) + CPD) % CPD) * 15; return `D${Math.floor(g / CPD) + 1} ${String(m / 60 | 0).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

// ---------- game setup ----------
function makeCompany(d) {
  const r = seeded(d.sym), region = COUNTRIES[d.cc][2];
  const pool = region === 'IN' ? CEO_NAMES.IN : region === 'ASIA' ? CEO_NAMES.EAST : CEO_NAMES.WEST;
  const young = ['tech', 'crypto'].includes(d.sec);
  return {
    ...d, region,
    ceo: pool[0][r() * pool[0].length | 0] + ' ' + pool[1][r() * pool[1].length | 0],
    beta: +(SECTOR_BETA[d.sec] * (0.7 + r() * 0.6)).toFixed(2),
    eps: d.price / (SECTOR_PE[d.sec] * (0.6 + r() * 0.8)),
    div: d.sec === 'crypto' ? 0 : +(r() * 3.5).toFixed(1),
    founded: young ? 1995 + (r() * 28 | 0) : 1890 + (r() * 110 | 0),
    emp: Math.round(10 ** (2.5 + r() * 3.5)),
    shares: Math.round(10 ** (6.5 + r() * 2.5)),
    p: d.price, fair: d.price, open: d.price, dhi: d.price, dlo: d.price, hi: d.price, lo: d.price,
    candles: [], cur: [0, d.price, d.price, d.price, d.price], pend: [], halt: 0, band: 0.2, circ: 0,
    nextEarn: 2 + (r() * 10 | 0), trend: 0, rating: 0, volu: 0,
  };
}

function pregen(c) {
  let p = c.p * Math.exp(gauss() * 0.03);
  for (let g = -CPD * 3; g < 0; g++) {
    const k = [g, p, p, p, p];
    for (let i = 0; i < TPC; i++) { p *= Math.exp(gauss() * SIG * c.vol + 0.002 * Math.log(c.fair / p)); k[2] = Math.max(k[2], p); k[3] = Math.min(k[3], p); }
    k[4] = p; c.candles.push(k);
  }
  c.p = c.open = c.dhi = c.dlo = p; c.cur = [0, p, p, p, p];
  c.hi = Math.max(...c.candles.map(k => k[2])); c.lo = Math.min(...c.candles.map(k => k[3]));
}

function newGame(room) {
  S = {
    v: 1, t: 0, room, rs: room ? seeded(room.code)() * 4294967296 | 0 : null, cash: START_CASH, comps: [], pos: {}, opts: [], biz: [], news: [], sched: [], payouts: [],
    regime: { k: 'bull', until: 3, next: null }, secTrend: {}, flags: {}, ach: {}, nid: 0, peak: START_CASH,
    rivals: RIVALS.map(r => ({ name: r.name, em: r.em, nw: START_CASH, prev: START_CASH })),
    stats: { trades: 0, wins: 0, losses: 0, best: 0, worst: 0, biz: 0, tips: 0, liq: 0 },
    ipo: null, dayLog: null, nextNews: 8, sound: true, speed: 1, paused: false,
    ui: { sel: 'INFSP', lev: 1, tab: 'live', sec: '', reg: '', sort: 'move', watch: false, nf: 'all', q: '', m: 'pChart', theme: S?.ui?.theme },
    watch: ['INFSP', 'NIMBUS', 'JUGAAD', 'STONKS', 'CHAI'],
  };
  for (const line of COMPANY_LINES.trim().split('\n')) {
    const [sym, name, cc, sec, em, price, vol, desc] = line.split('|');
    S.comps.push(makeCompany({ sym, name, cc, sec, em, price: +price, vol: +vol, desc }));
  }
  for (const s in SECTORS) S.secTrend[s] = 0;
  buildMap();
  S.comps.forEach(pregen);
}
function buildMap() { MAP = {}; for (const c of S.comps) MAP[c.sym] = c; for (const b of S.biz) b.lvl = Math.min(b.lvl, 5); } // heal saves hit by the double-click upgrade bug

// ---------- money math ----------
const posValue = (p, P) => p.margin + p.side * (P - p.entry) * p.qty;
const optValue = o => o.qty * Math.max(0, o.type * (MAP[o.sym].p - o.K));
const bizValue = b => b.inv * 0.7 * (S.regime.k === 'crash' ? 0.6 : S.regime.k === 'bubble' ? 1.2 : 1);
const bizUpCost = b => BDEF[b.id].cost * 0.8 * b.lvl;
const bizBase = b => BDEF[b.id].inc * (1 + 0.6 * (b.lvl - 1));
function netWorth() {
  let v = S.cash;
  for (const k in S.pos) { const p = S.pos[k]; v += Math.max(0, posValue(p, MAP[p.sym].p)); }
  for (const o of S.opts) v += optValue(o);
  for (const b of S.biz) v += bizValue(b);
  if (S.ipo) v += S.ipo.applied;
  return v;
}
const unlocked = k => S.peak >= UNLOCK[k];
function sectorChg(sec) { const L = S.comps.filter(c => c.sec === sec); return L.reduce((a, c) => a + c.p / c.open - 1, 0) / L.length; }
function bizMult(D, d) {
  let m = D.reg[S.regime.k] ?? 1;
  if (D.sec) m *= clamp(1 + D.k * sectorChg(D.sec) * 10, 0, 3);
  if (D.special === 'ipl' && d % 20 >= 14) m *= 3;
  if (D.special === 'season' && d % 15 < 6) m *= 2;
  return m;
}

function err(msg) { toast('⚠️ ' + msg, 'bad'); SND.err(); return false; }

function openPos(sym, side, lev, qty, slPct, tpPct) {
  const c = MAP[sym];
  if (c.halt) return err(`${sym} is frozen at circuit 🔒. Wait for it to reopen.`);
  qty = Math.floor(qty);
  if (!(qty > 0)) return err('Enter a quantity');
  const P = c.p, notional = P * qty, margin = notional / lev, fee = notional * FEE;
  if (margin + fee > S.cash + 1e-9) return err(`Not enough cash. Need ${money(margin + fee)}`);
  S.cash -= margin + fee;
  const key = `${sym}|${side}|${lev}`, p = S.pos[key];
  if (p) { p.entry = (p.entry * p.qty + P * qty) / (p.qty + qty); p.qty += qty; p.margin += margin; }
  else S.pos[key] = { sym, side, lev, qty, entry: P, margin, t: S.t, minPct: 0 };
  const q = S.pos[key];
  if (slPct > 0) q.sl = P * (1 - side * slPct / 100);
  if (tpPct > 0) q.tp = P * (1 + side * tpPct / 100);
  S.stats.trades++;
  if (side > 0 && S.regime.k === 'crash') S.flags.dip = true;
  SND.buy();
  toast(`${side > 0 ? '🟢 BOUGHT' : '🐻 SHORTED'} ${qty} ${sym} @ ${px(P)}${lev > 1 ? ` (${lev}x)` : ''}`, side > 0 ? 'good' : 'bad');
  return true;
}

function closePos(key, qty, reason) {
  const p = S.pos[key]; if (!p) return 0;
  const c = MAP[p.sym];
  if (c.halt && !reason) return err(`${p.sym} is frozen at circuit 🔒`);
  qty = Math.min(Math.floor(qty), p.qty);
  if (!(qty > 0)) return err('Enter a quantity');
  const frac = qty / p.qty, val = Math.max(0, posValue(p, c.p) * frac), m = p.margin * frac, fee = c.p * qty * FEE;
  const pnl = val - m - fee;
  S.cash += val - fee;
  p.qty -= qty; p.margin -= m;
  if (p.qty <= 0) delete S.pos[key];
  S.stats[pnl >= 0 ? 'wins' : 'losses']++;
  S.stats.best = Math.max(S.stats.best, pnl); S.stats.worst = Math.min(S.stats.worst, pnl);
  if (S.dayLog) S.dayLog.trades.push({ sym: p.sym, pnl });
  if (pnl < 0 && S.t - p.t < 20) S.flags.paper = true;
  if (pnl > 0 && p.minPct <= -0.2) S.flags.diamond = true;
  if (pnl > 0 && p.side < 0) S.flags.short = true;
  const verb = reason || (p.side > 0 ? '🔴 SOLD' : '✅ COVERED');
  toast(`${verb} ${qty} ${p.sym} @ ${px(c.p)} · P&L <b class="${cls(pnl)}">${money(pnl)}</b>`, pnl >= 0 ? 'good' : 'bad');
  if (pnl > 0) { SND.win(); if (pnl >= m) confetti(); } else SND.lose();
  return pnl;
}

function buyOpt(sym, type, qty) {
  const c = MAP[sym]; qty = Math.floor(qty);
  if (c.halt) return err('Frozen at circuit 🔒');
  if (!(qty > 0)) return err('Enter a quantity');
  const prem = c.p * qty * (0.015 + 0.015 * c.vol);
  if (prem > S.cash) return err(`Premium is ${money(prem)}. Not enough cash`);
  S.cash -= prem;
  S.opts.push({ id: ++S.nid, sym, type, K: c.p, qty, prem, exp: day() + 2 });
  S.stats.trades++; SND.buy();
  toast(`${type > 0 ? '📈 CALL' : '📉 PUT'} on ${qty} ${sym} @ strike ${px(c.p)} · paid ${money(prem)}`, 'good');
  return true;
}
function exerciseOpt(id) {
  const i = S.opts.findIndex(o => o.id === id); if (i < 0) return;
  const o = S.opts[i], v = optValue(o), pnl = v - o.prem;
  S.cash += v; S.opts.splice(i, 1);
  if (S.dayLog) S.dayLog.trades.push({ sym: o.sym + (o.type > 0 ? ' CALL' : ' PUT'), pnl });
  S.stats.best = Math.max(S.stats.best, pnl); S.stats.worst = Math.min(S.stats.worst, pnl);
  toast(`${o.type > 0 ? '📈' : '📉'} Option on ${o.sym} settled: ${money(v)} (P&L <b class="${cls(pnl)}">${money(pnl)}</b>)`, pnl >= 0 ? 'good' : 'bad');
  pnl > 0 ? SND.win() : SND.lose();
}

// ---------- news ----------
function randomComp(sec, not) {
  const held = [...new Set(Object.values(S.pos).map(p => p.sym))];
  if (!sec && !S.room && held.length && rng() < 0.25) { const s = pick(held); if (MAP[s] !== not) return MAP[s]; }
  const L = S.comps.filter(c => (!sec || c.sec === sec) && c !== not);
  return pick(L.length ? L : S.comps);
}
function targets(sc, key) {
  if (sc === 'm') return S.comps;
  if (sc === 's') return S.comps.filter(c => c.sec === key);
  if (sc === 'r') return S.comps.filter(c => c.region === key);
  const [r, s] = key.split(':'); return S.comps.filter(c => c.region === r && c.sec === s);
}
function scopeLabel(sc, key) {
  if (sc === 'm') return '🌐 All markets';
  if (sc === 's') return SECTORS[key].em + ' ' + SECTORS[key].name;
  if (sc === 'r') return REGIONS[key];
  const [r, s] = key.split(':'); return REGIONS[r].split(' ')[0] + ' ' + SECTORS[s].em + ' ' + SECTORS[s].name;
}
function fill(t, { c, c2, d }) {
  return t.replaceAll('{c}', c?.name ?? '').replaceAll('{c2}', c2?.name ?? '').replaceAll('{ceo}', c?.ceo ?? '')
    .replaceAll('{n}', rnd(5, 500) * 10).replaceAll('{d}', d ?? '');
}

function pushNews(n) {
  n.id = ++S.nid; n.t = S.t; n.tags = n.tags || [];
  S.news.unshift(n); if (S.news.length > 120) S.news.length = 120;
  newsVer++;
  if (quiet) return;
  setHeadline(n);
  if (n.big) breaking(n.text, n.sent);
  else if (n.tags.some(t => t.sym && (S.watch.includes(t.sym) || held(t.sym)))) SND.news();
}

// n: {text, src, truth, hits:[[comp, impact]], tags, big}
function emit(n) {
  const raw = n.hits || []; delete n.hits;
  const hits = []; let sum = 0;
  for (const [c, imp0] of raw) {
    const imp = clamp(imp0, -0.45, 0.45), len = 6 + (rng() * 14 | 0), lr = Math.log(1 + imp);
    c.pend.push([lr / len, len]);
    if (n.truth) c.fair *= 1 + imp;
    hits.push([c.sym, lr]); sum += imp;
  }
  n.sent ??= hits.length ? sum / hits.length : 0;
  n.big ??= Math.abs(n.sent) >= 0.1 || hits.length > 20;
  pushNews(n);
  if (!n.truth && hits.length && rng() < 0.75) S.sched.push({ at: S.t + rnd(40, 140), kind: 'debunk', id: n.id, hits });
}

function fire(tpl, srcKey, ctx = {}, forced) {
  const src = SOURCES[srcKey], truth = forced ?? rng() < src.rel;
  let c = ctx.c;
  if (!c && tpl.fx.some(f => f[0] === 'c')) c = randomComp(ctx.sec);
  const c2 = randomComp(null, c);
  const hits = [], tags = [];
  for (const [sc, key, mn, mx] of tpl.fx) {
    const base = rand(mn, mx) / 100 * (sc === 'c' ? src.mag : Math.sqrt(src.mag));
    if (sc === 'c') { hits.push([c, base * (0.7 + 0.3 * Math.sqrt(c.vol))]); tags.push({ sym: c.sym }); continue; }
    tags.push({ label: scopeLabel(sc, key) });
    for (const t of targets(sc, key)) hits.push([t, base * rand(0.6, 1.4) * Math.sqrt(t.beta)]);
  }
  emit({ text: fill(tpl.t, { c, c2, d: ctx.d }), src: srcKey, truth, hits, tags });
}

function spawnNews() {
  const tpl = pick(NEWS);
  fire(tpl, pick(tpl.src));
  if (rng() < 0.08) announceEvent();
}

function announceEvent() {
  const isCo = rng() < 0.4, list = isCo ? COMPANY_EVENTS : EVENTS, i = rnd(0, list.length - 1), E = list[i];
  if (S.sched.some(e => e.kind === 'event' && e.co === isCo && e.i === i)) return;
  const d = day() + rnd(1, 3), c = isCo ? randomComp(E.sec) : null, text = fill(E.a, { c, d });
  pushNews({ text, src: 'govt', truth: true, sent: 0, tags: c ? [{ sym: c.sym }] : [{ label: '📅 Event' }] });
  S.sched.push({ at: (d - 1) * TPD + rnd(60, 240), kind: 'event', co: isCo, i, sym: c?.sym, label: text, d });
}

function fireEarn(c) {
  const q = c.earnQ ?? clamp(gauss(), -2.2, 2.2); delete c.earnQ; c.nextEarn += 10;
  const imp = q * 0.04 * (0.7 + 0.3 * Math.sqrt(c.vol)), growth = Math.round(q * 15 + rand(-3, 3));
  c.eps *= 1 + q * 0.08;
  emit({ text: `📊 ${c.name} results: profit ${growth >= 0 ? 'UP' : 'DOWN'} ${Math.abs(growth)}%. ${q > 0 ? 'BEAT ✅' : 'MISS ❌'}`, src: 'earn', truth: true, hits: [[c, imp]], tags: [{ sym: c.sym }] });
}

function runSched() {
  if (!S.sched.length) return;
  const due = S.sched.filter(e => e.at <= S.t);
  if (!due.length) return;
  S.sched = S.sched.filter(e => e.at > S.t);
  for (const e of due) {
    if (e.kind === 'earn') { if (MAP[e.sym]) fireEarn(MAP[e.sym]); }
    else if (e.kind === 'event') {
      const E = (e.co ? COMPANY_EVENTS : EVENTS)[e.i];
      if (!e.co || MAP[e.sym]) fire(pick(E.o), 'govt', { c: MAP[e.sym] }, true);
    } else if (e.kind === 'debunk') {
      const o = S.news.find(x => x.id === e.id);
      if (o) o.deb = true;
      for (const [sym, lr] of e.hits) { const c = MAP[sym]; if (c) c.pend.push([-lr * 0.9 / 8, 8]); }
      pushNews({ text: `🚫 DEBUNKED: "${o ? o.text : 'earlier rumour'}" was FAKE NEWS`, src: 'paper', truth: true, sent: -(o?.sent || 0), tags: o?.tags || [], isDeb: true, big: Math.abs(o?.sent || 0) >= 0.1 });
    } else if (e.kind === 'tip') {
      const c = MAP[e.sym]; if (!c) continue;
      own(() => {
        if (e.real || rng() < 0.5) {
          const dir = e.real ? e.dir : -e.dir;
          const tpl = pick(NEWS.filter(t => t.fx.length === 1 && t.fx[0][0] === 'c' && (dir > 0 ? t.fx[0][2] > 0 : t.fx[0][3] < 0)));
          fire(tpl, pick(tpl.src), { c }, true);
        }
      });
    }
  }
}

// ---------- engine ----------
function tick() {
  const tod = S.t % TPD;
  if (tod === 0) dayStart();
  if (S.t % TPC === 0) rollCandles();
  const R = REGIMES[S.regime.k];
  for (const c of S.comps) {
    c.fair *= Math.exp((R.drift * c.beta + (R.sec[c.sec] || 0) + S.secTrend[c.sec] + c.trend) / TPD);
    if (c.halt > 0) { c.halt--; continue; }
    let r = gauss() * SIG * c.vol * R.vol + 0.004 * Math.log(c.fair / c.p);
    for (const q of c.pend) { r += q[0]; q[1]--; }
    if (c.pend.length) c.pend = c.pend.filter(q => q[1] > 0);
    let p = c.p * Math.exp(r);
    const up = c.open * (1 + c.band), dn = c.open * (1 - c.band);
    if (p >= up || p <= dn) circuit(c, p >= up), p = p >= up ? up : dn;
    c.p = Math.max(0.05, p);
    c.volu += Math.abs(r) * 2e4 * c.vol + rng() * 50;
    const k = c.cur; k[2] = Math.max(k[2], c.p); k[3] = Math.min(k[3], c.p); k[4] = c.p;
    c.dhi = Math.max(c.dhi, c.p); c.dlo = Math.min(c.dlo, c.p);
  }
  if (--S.nextNews <= 0) { spawnNews(); S.nextNews = rnd(18, 34); }
  runSched();
  checkPositions();
  if (S.room && !S.room.days && !S.room.done && netWorth() >= S.room.goal) roomFinish();
  S.t++;
  if (S.t % TPD === 0) dayEnd(day() - 1);
}

function rollCandles() {
  const g = gNow();
  for (const c of S.comps) {
    if (c.cur[0] === g) continue;
    c.candles.push(c.cur);
    if (c.candles.length > 150) c.candles.shift();
    c.hi = Math.max(c.hi, c.cur[2]); c.lo = Math.min(c.lo, c.cur[3]);
    c.cur = [g, c.p, c.p, c.p, c.p];
  }
}

function circuit(c, isUp) {
  c.halt = 30; c.band += 0.1;
  if (isUp && held(c.sym, 1)) S.flags.circuit = true;
  if (c.circ++ < 2) pushNews({ text: `🔒 ${c.name} hits ${isUp ? 'UPPER' : 'LOWER'} CIRCUIT (${isUp ? '+' : '-'}${Math.round((c.band - 0.1) * 100)}%)! Trading frozen.`, src: 'govt', truth: true, sent: isUp ? 0.2 : -0.2, big: held(c.sym), tags: [{ sym: c.sym }] });
}
const held = (sym, side) => Object.values(S.pos).some(p => p.sym === sym && (!side || p.side === side));

function checkPositions() {
  let warn = false;
  for (const k in S.pos) {
    const p = S.pos[k], c = MAP[p.sym], v = posValue(p, c.p);
    p.minPct = Math.min(p.minPct, v / p.margin - 1);
    const risky = p.lev > 1 || p.side < 0;
    if (risky && v <= p.margin * 0.1) {
      closePos(k, p.qty, '💀 LIQUIDATED');
      S.flags.rekt = true; S.stats.liq++;
      if (!quiet) { breaking(`MARGIN CALL! Your ${p.lev}x ${p.side > 0 ? 'long' : 'short'} on ${p.sym} got liquidated 💀`, -1); shake(); }
      continue;
    }
    if (risky && v < p.margin * 0.45) warn = true;
    if (p.sl && (p.side > 0 ? c.p <= p.sl : c.p >= p.sl)) { closePos(k, p.qty, '🛑 Stop-loss hit:'); continue; }
    if (p.tp && (p.side > 0 ? c.p >= p.tp : c.p <= p.tp)) closePos(k, p.qty, '🎯 Take-profit hit:');
  }
  S.warn = warn;
  if (warn && S.t % 6 === 0) SND.heart();
}

function regimeTick(d) {
  const R = S.regime;
  if (d >= R.until) {
    const nk = R.next || wpick(REGIME_NEXT[R.k]), changed = nk !== R.k;
    R.k = nk; R.next = null;
    R.until = d + ({ crash: 1, budget: 1, bubble: rnd(2, 3) }[nk] ?? rnd(2, 5));
    if (changed) {
      const G = REGIMES[nk];
      pushNews({ text: `${G.em} ${G.name.toUpperCase()}! ${G.hint}`, src: 'govt', truth: true, sent: G.drift || 0.001, big: true, tags: [{ label: '🌐 Market mood' }] });
      if (nk === 'crash' && !quiet) { SND.siren(); shake(); }
      if (nk === 'budget') announceBudget(d);
    }
  }
  if (d === R.until - 1 && !R.next) {
    R.next = wpick(REGIME_NEXT[R.k]);
    const honest = rng() < 0.7, shown = honest ? R.next : pick(Object.keys(REGIMES)), G = REGIMES[shown];
    pushNews({ text: `🔮 Market gurus predict: ${G.em} ${G.name} coming tomorrow!`, src: 'tv', truth: honest, sent: 0, tags: [{ label: '🌐 Market mood' }] });
  }
}
function announceBudget(d) {
  if (S.sched.some(e => e.kind === 'event' && !e.co && e.i === 2)) return;
  S.sched.push({ at: S.t + rnd(60, 200), kind: 'event', co: false, i: 2, label: '🇮🇳 Union Budget today', d });
}

function dayStart() {
  const d = day();
  for (const c of S.comps) {
    c.open = c.dhi = c.dlo = c.p; c.band = 0.2; c.circ = 0; c.volu = 0;
    c.trend = gauss() * 0.003;
    c.rating = Math.log(c.fair / c.p) + gauss() * 0.04;
  }
  for (const s in SECTORS) S.secTrend[s] = gauss() * 0.004;
  regimeTick(d);
  for (const c of S.comps) {
    if (c.nextEarn === d + 1) {
      c.earnQ = clamp(gauss(), -2.2, 2.2);
      if (rng() < 0.4) {
        const honest = rng() < 0.75, strong = (c.earnQ > 0) === honest;
        pushNews({ text: `🤫 Whisper: ${c.name} results tomorrow look ${strong ? 'STRONG 💪' : 'WEAK 😬'}`, src: 'paper', truth: honest, sent: strong ? 0.01 : -0.01, tags: [{ sym: c.sym }] });
      }
    }
    if (c.nextEarn === d) S.sched.push({ at: S.t + rnd(40, 270), kind: 'earn', sym: c.sym });
  }
  if (rng() < 0.5) announceEvent();
  ipoTick(d);
  S.dayLog = { startNW: netWorth(), trades: [] };
  if (quiet) return;
  SND.bell();
  toast(`🔔 Day ${d}: market open! Mood: ${REGIMES[S.regime.k].em} ${REGIMES[S.regime.k].name}`, 'info');
  if (d > 1 && rng() < 0.4) showCard();
}

function dayEnd(d) {
  const log = [];
  own(() => { for (const b of [...S.biz]) {
    const D = BDEF[b.id];
    let inc = Math.round(bizBase(b) * bizMult(D, d)), note = '';
    if (D.special === 'film') {
      inc = 0; note = '🎬 Shooting in progress...';
      if (rng() < 0.25) {
        const r = rng();
        if (r < 0.45) { inc = Math.round(b.inv * rand(0.2, 0.6)); note = '🍿 BLOCKBUSTER HIT!'; }
        else if (r < 0.8) { inc = Math.round(b.inv * rand(0.03, 0.1)); note = '🎞️ Average release'; }
        else { inc = -Math.round(b.inv * 0.1); note = '🍅 Total FLOP'; }
      }
    } else if (D.special === 'startup') {
      const r = rng();
      if (r < 0.005) {
        const pay = Math.round(b.inv * rand(10, 40));
        S.cash += pay; S.biz.splice(S.biz.indexOf(b), 1); S.flags.exit = true;
        log.push({ em: D.em, name: D.name, inc: pay, note: '🦄 ACQUIRED! Unicorn exit!' });
        pushNews({ text: `🦄 Your startup got ACQUIRED for ${money(pay)}!!!`, src: 'earn', truth: true, sent: 1, big: true });
        confetti(); continue;
      }
      if (r < 0.035) {
        S.biz.splice(S.biz.indexOf(b), 1);
        log.push({ em: D.em, name: D.name, inc: 0, note: '🪦 Startup shut down. Ran out of runway.' });
        continue;
      }
    }
    if (D.special !== 'film' && rng() < 0.12) { const [t, m] = pick(BIZ_EVENTS); inc = Math.round(inc * m); note = t.replace('{b}', D.name); }
    S.cash += inc; b.yday = inc; S.stats.biz += inc;
    log.push({ em: D.em, name: D.name, inc, note });
  } });
  for (const o of S.opts.filter(o => o.exp <= d)) exerciseOpt(o.id);
  const pays = S.payouts.filter(p => p.d <= d);
  S.payouts = S.payouts.filter(p => p.d > d);
  for (const p of pays) S.cash += p.amt;
  const R = REGIMES[S.regime.k];
  for (const [i, r] of S.rivals.entries()) {
    const def = RIVALS[i];
    r.prev = r.nw;
    r.nw *= Math.exp(R.drift * def.beta + def.edge + gauss() * def.vol);
    if (r.nw < 20000) { pushNews({ text: `${r.em} ${r.name} went broke and is starting over with ${money(START_CASH)} 😂`, src: 'social', truth: true, sent: 0 }); r.nw = START_CASH; }
  }
  const nw = netWorth();
  S.peak = Math.max(S.peak, nw);
  checkAch();
  save();
  if (!quiet) showRecap(d, log, pays, nw);
  if (S.room && !S.room.done) S.room.days && d >= S.room.goal ? roomFinish() : roomPush();
}

// ---------- IPO / tips / cards ----------
function ipoTick(d) {
  const I = S.ipo;
  if (!I) { if (d >= 3 && rng() < 0.25) startIPO(d); return; }
  if (d === I.open + 1) {
    const honest = rng() < 0.7, shown = honest ? I.g + rand(-0.08, 0.08) : rand(-0.3, 0.8);
    pushNews({ text: `🔥 Grey market premium for ${I.def.name} IPO: ${pct(shown)}. Subscribed ${I.sub}x! Last day to apply.`, src: 'tv', truth: honest, sent: shown, tags: [{ label: '🔔 IPO' }] });
  }
  if (d >= I.list) listIPO();
}
function startIPO(d) {
  const a = pick(IPO_NAMES[0]), b = pick(IPO_NAMES[1]);
  let sym = (a + b).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
  while (MAP[sym]) sym = sym.slice(0, 7) + String.fromCharCode(65 + rnd(0, 25));
  const sec = IPO_SEC[b], price = rnd(40, 900), r = rng();
  const g = r < 0.35 ? rand(0.3, 0.9) : r < 0.75 ? rand(-0.1, 0.25) : rand(-0.4, -0.1);
  S.ipo = {
    def: { sym, name: `${a} ${b}`, cc: rng() < 0.75 ? 'IN' : 'US', sec, em: '🔔', price, vol: +rand(1.5, 3).toFixed(1), desc: `Fresh IPO! ${a} ${b} promises to disrupt ${SECTORS[sec].name}.` },
    price, open: d, list: d + 2, applied: 0, g, sub: +(g > 0.3 ? rand(30, 150) : g > 0 ? rand(3, 30) : rand(0.5, 3)).toFixed(1),
  };
  pushNews({ text: `🔔 IPO ALERT: ${a} ${b} (${SECTORS[sec].em} ${SECTORS[sec].name}) opens today at ₹${price}/share! Apply before Day ${d + 1} closes.`, src: 'paper', truth: true, sent: 0.01, big: true, tags: [{ label: '🔔 IPO' }] });
}
function listIPO() {
  const I = S.ipo, c = makeCompany(I.def), P = I.price * (1 + I.g);
  c.p = c.open = c.dhi = c.dlo = c.hi = c.lo = P; c.fair = P * (1 - I.g * 0.3);
  c.cur = [gNow(), P, P, P, P]; c.nextEarn = day() + 5;
  S.comps.push(c); MAP[c.sym] = c;
  if (I.applied > 0) {
    const frac = I.g > 0.3 ? clamp(5 / I.sub, 0.05, 1) : 1, sh = Math.floor(I.applied * frac / I.price);
    S.cash += I.applied - sh * I.price;
    if (sh > 0) {
      S.pos[`${c.sym}|1|1`] = { sym: c.sym, side: 1, lev: 1, qty: sh, entry: I.price, margin: sh * I.price, t: S.t, minPct: 0 };
      if (I.g >= 0.5) S.flags.ipo = true;
    }
    toast(`🔔 IPO allotment: you got ${sh} shares of ${c.name}${frac < 1 ? ` (${Math.round(frac * 100)}% of application, oversubscribed!)` : ''}`, 'info');
  }
  S.ipo = null;
  pushNews({ text: `🔔 ${c.name} LISTS at ${px(P)}, ${pct(I.g)} vs IPO price!`, src: 'earn', truth: true, sent: I.g, big: true, tags: [{ sym: c.sym }] });
  addRow(c); buildTicker();
}
function showIPO() {
  const I = S.ipo; if (!I) return;
  const canApply = day() <= I.open + 1;
  modal(`<h2>🔔 IPO: ${esc(I.def.name)}</h2>
    <p>${SECTORS[I.def.sec].em} ${SECTORS[I.def.sec].name} · ${COUNTRIES[I.def.cc][0]} · Price <b>₹${I.price}</b>/share · Lists on <b>Day ${I.list}</b></p>
    <p class="muted">${esc(I.def.desc)} Hot IPOs get oversubscribed and you only get part of your shares. Unused money is refunded. Listing can go +80%... or −40%.</p>
    <p>Applied so far: <b>${money(I.applied)}</b></p>
    ${canApply ? `<div class="row2"><input id="ipoAmt" type="number" min="0" placeholder="Amount ₹" value="${Math.round(S.cash * 0.25)}">
    <button data-ipop="0.1">10%</button><button data-ipop="0.25">25%</button><button data-ipop="0.5">50%</button><button data-ipop="1">ALL</button></div>` : '<p class="bad">Applications closed. Wait for listing!</p>'}`,
    canApply ? [{ label: '✅ Apply', cls: 'primary', fn: () => {
      const a = Math.floor(+$('#ipoAmt').value);
      if (!(a > 0) || a > S.cash) return err('Invalid amount'), false;
      S.cash -= a; I.applied += a; toast(`🔔 Applied ${money(a)} to ${I.def.name} IPO`, 'good'); SND.buy();
    } }, { label: 'Close' }] : [{ label: 'Close', cls: 'primary' }]);
}

function buyTip() {
  const nw = netWorth(), fee = Math.round(Math.max(2000, nw * 0.02));
  if (fee > S.cash) return err(`Bhai wants ${money(fee)}. You're too broke for tips 😅`);
  modal(`<h2>🕵️ Bhai ka tip</h2><p>A guy in a leather jacket at the chai tapri says he has "pakka info".</p><p>Fee: <b>${money(fee)}</b>. Bhai is right about 65% of the time. Probably.</p>`,
    [{ label: `💸 Pay ${money(fee)}`, cls: 'primary', fn: () => own(() => {
      S.cash -= fee; S.stats.tips++;
      const c = pick(S.comps.filter(x => x.vol >= 1.2)), dir = rng() < 0.5 ? 1 : -1, real = rng() < 0.65;
      S.sched.push({ at: S.t + rnd(25, 90), kind: 'tip', sym: c.sym, dir, real });
      setTimeout(() => modal(`<h2>🕵️ Bhai whispers...</h2><p class="big">"${c.em} <b>${esc(c.name)}</b> (${c.sym}) is going to ${dir > 0 ? '<b class="up">FLY 🚀</b>' : '<b class="dn">CRASH 📉</b>'} very soon. Trust me, bro."</p><p class="muted">Act fast. News usually lands within a few seconds.</p>`,
        [{ label: `Open ${c.sym}`, cls: 'primary', fn: () => select(c.sym) }, { label: 'OK' }]), 50);
    }) }, { label: 'No thanks' }]);
}

function showCard() {
  const C = pick(CARDS), win = rng() < C.p, amt = Math.max(1000, Math.round(S.cash * C.cost));
  if (amt > S.cash) return;
  const msg = (win ? C.win : C.lose).replace('{amt}', money(amt * C.x));
  modal(`<h2>🃏 Life Event</h2><p class="big">${esc(C.q.replace('{amt}', money(amt)))}</p>`, [
    { label: `✅ Yes (${money(amt)})`, cls: 'primary', fn: () => {
      S.cash -= amt;
      S.payouts.push({ d: day() + C.d - 1, amt: win ? Math.round(amt * C.x) : 0, msg, win, q: C.q.replace('{amt}', money(amt)) });
      toast(`🃏 Done. You'll find out on Day ${day() + C.d - 1}'s close...`, 'info');
    } },
    { label: '❌ No way' }]);
}

// ---------- achievements ----------
const ACH = [
  ['first', '🐣 First Trade', 'Make your first trade', () => S.stats.trades >= 1],
  ['lakh', '💯 Lakhpati', 'Reach ₹10 L net worth', () => S.peak >= 1e6],
  ['crore', '🎉 Crorepati', 'Reach ₹1 Cr net worth', () => S.peak >= 1e7],
  ['arab', '👑 Arbpati', 'Reach ₹100 Cr net worth', () => S.peak >= 1e9],
  ['bigwin', '🤑 Big Win', 'Make ₹1 L+ on a single trade', () => S.stats.best >= 1e5],
  ['diamond', '💎 Diamond Hands', 'Close in profit after being down 20%+', () => S.flags.diamond],
  ['paper', '🧻 Paper Hands', 'Panic-sell at a loss within 5 seconds', () => S.flags.paper],
  ['circuit', '🔒 Upper Circuit', 'Hold a stock when it hits upper circuit', () => S.flags.circuit],
  ['rekt', '💀 REKT', 'Get liquidated on a leveraged trade', () => S.flags.rekt],
  ['dip', '🛒 Buy the Dip', 'Buy a stock during a CRASH', () => S.flags.dip],
  ['short', '🐻 Bear Hunter', 'Profit from a short', () => S.flags.short],
  ['chai', '🍵 Chai Tycoon', 'Max out a Chai Stall (level 5)', () => S.biz.some(b => b.id === 'chai' && b.lvl >= 5)],
  ['empire', '🏰 Empire', 'Own 5 different businesses', () => S.biz.length >= 5],
  ['bhai', '🕵️ Bhai\'s Favourite', 'Buy 5 tips', () => S.stats.tips >= 5],
  ['ipo', '🔔 IPO Jackpot', 'Get allotted an IPO that lists +50%', () => S.flags.ipo],
  ['diverse', '🧺 Diversified', 'Hold 10 different stocks at once', () => new Set(Object.values(S.pos).map(p => p.sym)).size >= 10],
  ['global', '✈️ Globetrotter', 'Hold stocks from all 5 regions', () => new Set(Object.values(S.pos).map(p => MAP[p.sym].region)).size >= 5],
  ['king', '🏆 King of Dalal Street', 'Beat all 3 rivals', () => S.rivals.every(r => netWorth() > r.nw) && day() > 3],
  ['unicorn', '🦄 Unicorn Exit', 'Sell a startup for 10x+', () => S.flags.exit],
  ['survivor', '📅 Survivor', 'Reach Day 30', () => day() >= 30],
];
function checkAch() {
  for (const [id, name, desc, fn] of ACH) {
    if (S.ach[id] || !fn()) continue;
    S.ach[id] = day();
    if (!quiet) { toast(`🎖️ ACHIEVEMENT: <b>${name}</b><br><small>${desc}</small>`, 'ach'); SND.win(); confetti(); }
  }
  const t = titleFor(S.peak);
  if (S.title && S.title !== t && !quiet) { toast(`⬆️ PROMOTED to <b>${t}</b>!`, 'ach'); confetti(); }
  S.title = t;
}
const titleFor = nw => TITLES.filter(([v]) => nw >= v).pop()[1];

// ---------- save ----------
function save() { if (quiet) return; S.at = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S, (k, v) => k[0] === '_' ? undefined : v)); } catch { } cloudPush(); }
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) { S = s; buildMap(); return true; } } catch { } return false; }

// ---------- cloud save (Supabase: public anon key + row-level security, see supabase.sql) ----------
const SB_URL = 'https://cudqxauoekavszkjekpi.supabase.co', SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1ZHF4YXVvZWthdnN6a2pla3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzExMTcsImV4cCI6MjEwODQwNzExN30.MCt4AErGKNWIFdzAojMznXYN3D5rVHOITSz65FYv3Sk', OWNER_KEY = 'quickstock-owner', GUEST_KEY = 'quickstock-guest';
const SB = SB_URL && window.supabase ? supabase.createClient(SB_URL, SB_KEY) : null;
let user = null, cloudOk = false, pushTm = 0;
function cloudPush() {
  if (!user || !cloudOk) return;
  clearTimeout(pushTm);
  const go = () => SB.from('saves').upsert({ user_id: user.id, save: JSON.parse(localStorage.getItem(SAVE_KEY)), updated_at: new Date().toISOString() }).then(({ error }) => error && console.warn('cloud save', error));
  if (document.hidden) go(); else pushTm = setTimeout(go, 3000);
}
function useSave(s) { S = s; buildMap(); save(); buildUI(); select(S.ui.sel); }
async function cloudPull() {
  const { data, error } = await SB.from('saves').select('save').eq('user_id', user.id).maybeSingle();
  if (error) return toast('☁️ Cloud load failed, playing locally');
  const c = data?.save, mine = localStorage.getItem(OWNER_KEY) === user.id;
  localStorage.setItem(OWNER_KEY, user.id); cloudOk = true;
  const sum = s => `Day ${Math.floor(s.t / TPD) + 1} · ${money(s.cash)} cash`;
  if (!c || c.v !== 1) return save();                       // first sign-in: upload this device's game
  if (mine) return (c.at || 0) > (S.at || 0) ? useSave(c) : save(); // same account: newest wins
  if (S.t < TPD) return useSave(c);                           // guest game barely started: just take the cloud
  modal(`<h2>☁️ Which game to keep?</h2><p>Your account has a cloud save, and this device has a guest game.</p>`, [
    { label: `☁️ Cloud<br><small>${sum(c)}</small>`, cls: 'primary', fn: () => useSave(c) },
    { label: `📱 This device<br><small>${sum(S)}</small>`, fn: save }]);
}
function showLogin() {
  if (!SB) return modal('<h2>☁️ Cloud save</h2><p>Cloud save is offline right now. You can keep playing as a guest.</p>');
  if (user) return modal(`<h2>☁️ Signed in</h2><p>${esc(user.email)}<br>Progress saves to the cloud at the end of each day.</p>`,
    [{ label: 'Sign out', fn: () => { SB.auth.signOut(); } }, { label: 'OK', cls: 'primary' }]);
  modal(`<h2>⚡ QuickStock</h2><p>Sign in to keep your progress on every device. We email you a one-tap login link.</p>
    <input id="email" type="email" placeholder="you@email.com" autocomplete="email" style="width:100%;padding:12px;font-size:16px">`, [
    { label: '📧 Send link', cls: 'primary', fn: () => {
      const email = $('#email').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) { $('#email').focus(); return false; }
      SB.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } })
        .then(({ error }) => error ? modal(`<h2>😕 Couldn't send</h2><p>${esc(error.message)}</p>`) : modal(`<h2>📬 Check your email</h2><p>Tap the link sent to <b>${esc(email)}</b> to sign in.</p>`));
    } },
    { label: '🎮 Play as guest', fn: () => localStorage.setItem(GUEST_KEY, 1) }]);
  setTimeout(() => $('#email')?.focus(), 50);
}
function cloudInit() {
  const btn = $('#cloudBtn');
  if (!SB) { btn.hidden = true; return; }
  SB.auth.onAuthStateChange((ev, session) => {
    const was = user?.id; user = session?.user || null;
    btn.textContent = user ? '☁️' : '👤'; btn.title = user ? 'Signed in: ' + user.email : 'Sign in to save progress to the cloud';
    if (user && user.id !== was) { if (modalBtns && $('#email')) closeModal(); toast(`☁️ Signed in as <b>${esc(user.email)}</b>`); cloudPull(); }
    if (!user) cloudOk = false;
    if (ev === 'INITIAL_SESSION' && !user && !localStorage.getItem(GUEST_KEY)) showLogin();
  });
}

// ---------- friends rooms (see room_scores in supabase.sql) ----------
// The goal lives in the code itself (TIGER42-10D = richest after 10 days, TIGER42-1CR = first to ₹1 Cr), so joining needs no lookup.
const GOALS = [['5D', '⏱️ 5 days, richest wins'], ['10D', '⏱️ 10 days, richest wins'], ['20D', '⏱️ 20 days, richest wins'],
  ['10L', '🎯 First to ₹10 L'], ['1CR', '🎯 First to ₹1 Cr'], ['10CR', '🎯 First to ₹10 Cr']];
const ROOM_WORDS = ['TIGER', 'MANGO', 'CHAI', 'ROCKET', 'BULL', 'BEAR', 'DIWALI', 'MASALA', 'BHAI', 'STONK'];
const PID_KEY = 'quickstock-pid', NAME_KEY = 'quickstock-name';
function parseRoom(code) {
  const m = /^[A-Z0-9]{2,12}-(\d{1,3})(D|L|CR)$/.exec(code.trim().toUpperCase());
  if (!m || +m[1] < 1) return null;
  const n = +m[1], days = m[2] === 'D';
  return { code: m[0], days, goal: days ? n : n * (m[2] === 'L' ? 1e5 : 1e7) };
}
const goalText = r => r.days ? `richest after ${r.goal} days wins` : `first to ${money(r.goal)} wins`;
const pid = () => localStorage.getItem(PID_KEY) || (localStorage.setItem(PID_KEY, crypto.randomUUID()), localStorage.getItem(PID_KEY));
const raceTime = t => `Day ${Math.floor(t / TPD) + 1} ${clock(t)}`;

function roomPush() {
  if (!SB || !S.room || quiet) return;
  const R = S.room;
  SB.from('room_scores').upsert({ room: R.code, pid: pid(), name: R.name, nw: Math.round(netWorth()), day: day(), t: S.t, done: !!R.done, updated_at: new Date().toISOString() })
    .then(({ error }) => error && console.warn('room score', error));
}
function roomFinish() {
  S.room.done = true; S.room.at = S.t; S.room.nw = netWorth();
  save(); roomPush(); confetti(); SND.win();
  setTimeout(showRoom, 800); // give the score a moment to land before the leaderboard loads
}
function startRoom(r, name) {
  if (!r) return err('That room code looks wrong. It should look like TIGER42-10D'), false;
  name = name.trim().slice(0, 16);
  if (!name) return err('Enter your name so friends know who you are'), false;
  localStorage.setItem(NAME_KEY, name);
  history.replaceState(null, '', '?room=' + r.code);
  newGame({ ...r, name }); buildUI(); select(S.ui.sel); save(); roomPush();
  modal(`<h2>🏁 Room ${r.code}</h2><p class="big">${goalText(r)}</p><p>Everyone in this room gets the <b>same market</b>: same prices, news and IPOs. Send this code to your friends:</p>
    <p class="big"><b>${r.code}</b></p>`, [{ label: '📋 Copy invite link', fn: () => { copyInvite(); return false; } }, { label: '🚀 Start trading', cls: 'primary' }]);
}
function copyInvite() {
  const url = location.origin + location.pathname + '?room=' + S.room.code;
  const text = `Beat me on QuickStock! Room ${S.room.code}: ${goalText(S.room)}. ${url}`;
  (navigator.share ? navigator.share({ text }) : navigator.clipboard.writeText(text).then(() => toast('📋 Invite copied', 'good'))).catch(() => { });
}

async function showRoom(code) { // code: undefined = this room's leaderboard, a string = the start/join form
  if (!S.room || code != null) {
    const name = esc(localStorage.getItem(NAME_KEY) || '');
    return modal(`<h2>🏁 Play with friends</h2><p class="muted">Everyone in a room gets the same market. Starting or joining a room replaces your current solo game.</p>
      <input id="rName" placeholder="Your name" maxlength="16" value="${name}" style="width:100%;padding:10px;font-size:16px">
      <h3>Start a room</h3><select id="rGoal" style="width:100%;padding:10px;font-size:16px">${GOALS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <h3>Or join a friend</h3><input id="rCode" placeholder="Room code, e.g. TIGER42-10D" value="${esc(code || '')}" style="width:100%;padding:10px;font-size:16px;text-transform:uppercase">`, [
      { label: '➕ Start room', cls: code ? '' : 'primary', fn: () => startRoom(parseRoom(`${ROOM_WORDS[Math.random() * ROOM_WORDS.length | 0]}${10 + Math.random() * 90 | 0}-${$('#rGoal').value}`), $('#rName').value) },
      { label: '🤝 Join', cls: code ? 'primary' : '', fn: () => startRoom(parseRoom($('#rCode').value), $('#rName').value) },
      { label: 'Cancel' }]);
  }
  const R = S.room;
  let rows = null;
  if (SB) { const { data } = await SB.from('room_scores').select('pid,name,nw,day,t,done').eq('room', R.code); rows = data; }
  // Days race: richest wins. Net-worth race: finishers by time, then everyone else by net worth.
  rows?.sort((a, b) => R.days ? b.nw - a.nw : (b.done - a.done) || (a.done ? a.t - b.t : b.nw - a.nw));
  const me = pid(), line = r => R.days ? `${money(r.nw)}${r.done ? '' : ` <small>(Day ${r.day})</small>`}` : r.done ? `🏁 ${raceTime(r.t)}` : `${money(r.nw)} <small>(Day ${r.day})</small>`;
  const board = rows ? `<ol class="plain">${rows.map(r => `<li class="${r.pid === me ? 'me' : ''}">${esc(r.name)}: <b>${line(r)}</b></li>`).join('') || '<li class="muted">No scores yet</li>'}</ol>`
    : '<p class="muted">Couldn\'t load the leaderboard. Check your internet and tap Refresh.</p>';
  modal(`<h2>${R.done ? '🏆 You finished!' : '🏁 Room ' + R.code}</h2><p>Room <b>${R.code}</b>: ${goalText(R)}</p>
    ${R.done ? `<p class="big">${R.days ? `Final net worth <b>${money(R.nw)}</b>` : `Reached ${money(R.goal)} at <b>${raceTime(R.at)}</b>`}</p>` : ''}
    <h3>🏆 Leaderboard</h3>${board}`, [
    { label: '🔄 Refresh', fn: () => { setTimeout(showRoom, 0); } },
    { label: '📋 Invite', fn: () => { copyInvite(); return false; } },
    R.done ? { label: '🏁 New room', fn: () => { setTimeout(() => showRoom(''), 0); } } : { label: 'Close', cls: 'primary' }]);
}

// ---------- sound ----------
let AC;
function beep(f, d = 0.1, type = 'sine', v = 0.15, when = 0, f2) {
  if (!S?.sound || quiet) return;
  try {
    AC ||= new AudioContext();
    const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d);
  } catch { }
}
const SND = {
  buy: () => { beep(880, 0.07, 'square', 0.06); beep(1320, 0.1, 'square', 0.06, 0.06); },
  win: () => [1046, 1318, 1568, 2093].forEach((f, i) => beep(f, 0.15, 'triangle', 0.12, i * 0.07)),
  lose: () => beep(420, 0.45, 'sawtooth', 0.07, 0, 110),
  err: () => beep(160, 0.15, 'square', 0.08),
  alarm: () => { const n = Date.now(); if (n - lastSnd < 1500) return; lastSnd = n; beep(880, 0.12, 'square', 0.08); beep(660, 0.12, 'square', 0.08, 0.15); beep(880, 0.12, 'square', 0.08, 0.3); },
  siren: () => { beep(500, 0.6, 'sawtooth', 0.08, 0, 1200); beep(1200, 0.6, 'sawtooth', 0.08, 0.6, 500); },
  bell: () => { beep(1568, 0.8, 'sine', 0.12); beep(2093, 0.8, 'sine', 0.06, 0.05); },
  heart: () => { beep(65, 0.12, 'sine', 0.5); beep(55, 0.15, 'sine', 0.4, 0.18); },
  news: () => beep(1200, 0.05, 'square', 0.04),
};

// ---------- UI: effects ----------
function toast(html, kind = '') {
  if (quiet) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.innerHTML = html;
  const box = $('#toasts'); box.prepend(t);
  while (box.children.length > 5) box.lastChild.remove();
  setTimeout(() => t.remove(), 4000);
}
function breaking(text, sent) {
  if (quiet) return;
  const b = $('#breaking');
  b.className = sent < 0 ? 'neg' : 'pos';
  b.innerHTML = `<small>⚡ BREAKING NEWS ⚡</small><div>${esc(text)}</div>`;
  b.hidden = false; void b.offsetWidth; b.classList.add('show');
  document.body.classList.add('dim'); setTimeout(() => document.body.classList.remove('dim'), 500);
  clearTimeout(breaking.tm); breaking.tm = setTimeout(() => { b.hidden = true; }, 3200);
  SND.alarm();
}
function shake() { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 600); }
function confetti() {
  if (quiet) return;
  own(() => { for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    s.className = 'cf';
    s.style.cssText = `left:${rng() * 100}vw;background:${pick(['#00e676', '#ffd54f', '#4fc3f7', '#ff4081', '#fff'])};animation-duration:${1 + rng() * 1.5}s;animation-delay:${rng() * 0.3}s`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 3000);
  } });
}
function modal(html, btns = [{ label: 'OK', cls: 'primary' }]) {
  if (quiet) return;
  if (modalBtns) { modalQ.push([html, btns]); return; }
  modalBtns = btns;
  $('#modalBox').innerHTML = html + `<div class="mBtns">${btns.map((b, i) => `<button class="${b.cls || ''}" data-mi="${i}">${b.label}</button>`).join('')}</div>`;
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; modalBtns = null; if (modalQ.length) modal(...modalQ.shift()); }
function setHeadline(n) {
  const h = $('#headline');
  h.className = cls(n.sent);
  h.innerHTML = `<span class="src">${SOURCES[n.src].em}</span> ${esc(n.text)}`;
}

function showRecap(d, log, pays, nw) {
  const L = S.dayLog || { startNW: nw, trades: [] }, chg = nw - L.startNW;
  const tr = [...L.trades].sort((a, b) => b.pnl - a.pnl);
  const bizTot = log.reduce((a, b) => a + b.inc, 0);
  const all = [...S.rivals.map(r => ({ ...r })), { em: '😎', name: 'YOU', nw }].sort((a, b) => b.nw - a.nw);
  const tomorrow = S.sched.filter(e => e.kind === 'event' && e.d === d + 1);
  modal(`<h2>🌙 Day ${d} closed</h2>
    <div class="recapBig ${cls(chg)}">${arrow(chg)} ${money(chg)} <small>(${pct(L.startNW ? chg / L.startNW : 0)})</small></div>
    <p>Net worth <b>${money(nw)}</b> · Cash <b>${money(S.cash)}</b> · ${S.title}</p>
    ${tr.length ? `<p>🔁 ${tr.length} closed trades · Best <b class="up">${tr[0].sym} ${money(tr[0].pnl)}</b> · Worst <b class="${cls(tr.at(-1).pnl)}">${tr.at(-1).sym} ${money(tr.at(-1).pnl)}</b></p>` : '<p class="muted">No trades closed today.</p>'}
    ${log.length ? `<h3>🏪 Business income: <span class="${cls(bizTot)}">${money(bizTot)}</span></h3><ul class="plain">${log.map(l => `<li>${l.em} ${esc(l.name)}: <b class="${cls(l.inc)}">${money(l.inc)}</b> ${l.note ? `<small>${esc(l.note)}</small>` : ''}</li>`).join('')}</ul>` : ''}
    ${pays.length ? `<h3>🃏 Life events</h3><ul class="plain">${pays.map(p => `<li class="${p.win ? 'up' : 'dn'}">${esc(p.msg)}</li>`).join('')}</ul>` : ''}
    <h3>🏆 Leaderboard</h3><ol class="plain">${all.map(r => `<li class="${r.name === 'YOU' ? 'me' : ''}">${r.em} ${esc(r.name)}: <b>${money(r.nw)}</b></li>`).join('')}</ol>
    <p>Mood: ${REGIMES[S.regime.k].em} <b>${REGIMES[S.regime.k].name}</b>${tomorrow.length ? ` · 📅 Tomorrow: ${tomorrow.map(e => esc(e.label)).join(' · ')}` : ''}</p>`,
    [{ label: `▶ Start Day ${d + 1} <small>(Enter)</small>`, cls: 'primary' }]);
  if (chg > 0) SND.win();
}

function showHelp() {
  modal(`<h2>⚡ Welcome to QuickStock</h2>
  <p class="big">You have <b>${money(START_CASH)}</b>. Turn it into an empire. 🇮🇳🌍</p>
  <ul class="plain help">
    <li>📈 <b>${S.comps.length} companies</b> from India, the USA, Europe, Asia and beyond. Click one to see its chart and info.</li>
    <li>📰 <b>Read the news!</b> Each headline shows its source and how reliable it is. 🏛️ Official and 📊 Earnings are always true. 🐦 Social and 💬 WhatsApp Uncle are often <b>FAKE</b>, and fake news gets 🚫 DEBUNKED later.</li>
    <li>🟢 <b>BUY</b> low, 🔴 <b>SELL</b> high. Each day lasts about 75 seconds.</li>
    <li>🐂🐻 The <b>market mood</b> changes every few days. Gurus predict it the day before (not always right).</li>
    <li>🏪 Use profits to buy <b>businesses</b>. They pay you every night, depending on the market mood.</li>
    <li>🔓 Unlocks: 🐻 Shorting at ${money(UNLOCK.short)} · ⚡ Leverage at ${money(UNLOCK.lev)} · 📈📉 Options at ${money(UNLOCK.opt)}</li>
    <li>🕵️ Buy shady tips, apply for 🔔 IPOs, take risky 🃏 life events, and beat 3 rivals.</li>
    <li>🏁 <b>Play with friends:</b> tap 🏁 Friends to start a room. Everyone gets the same market. Pick a day limit or a money target.</li>
    <li>⌨️ <b>Space</b> pause · <b>B</b> buy · <b>S</b> sell · <b>1/2/3</b> speed · <b>↑↓</b> switch stock</li>
  </ul>`, [{ label: '🚀 Let\'s go!', cls: 'primary' }]);
}

// ---------- UI: build ----------
function buildUI() {
  $('#fSec').innerHTML = '<option value="">All sectors</option>' + Object.entries(SECTORS).map(([k, s]) => `<option value="${k}">${s.em} ${s.name}</option>`).join('');
  $('#fReg').innerHTML = '<option value="">🌐 All regions</option>' + Object.entries(REGIONS).map(([k, r]) => `<option value="${k}">${r}</option>`).join('');
  $('#fSec').value = S.ui.sec; $('#fReg').value = S.ui.reg; $('#sort').value = S.ui.sort; $('#search').value = S.ui.q;
  $('#list').innerHTML = '';
  S.comps.forEach(addRow);
  buildTicker();
  document.body.dataset.m = S.ui.m;
  if (window.LightweightCharts && !chart) {
    chart = LightweightCharts.createChart($('#chart'), {
      autoSize: true,
      layout: { background: { color: '#0d121b' }, textColor: '#c9d4e3', fontSize: 13 },
      grid: { vertLines: { color: '#182131' }, horzLines: { color: '#182131' } },
      timeScale: { timeVisible: true, borderColor: '#26324a', tickMarkFormatter: t => gLabel(t), rightOffset: 4 },
      rightPriceScale: { borderColor: '#26324a' },
      localization: { timeFormatter: t => gLabel(t), priceFormatter: p => '₹' + p.toFixed(2) },
      crosshair: { mode: 0 },
    });
    series = chart.addCandlestickSeries({ upColor: '#00e676', downColor: '#ff3d57', borderVisible: false, wickUpColor: '#00e676', wickDownColor: '#ff3d57' });
  } else if (!chart) $('#chart').innerHTML = '<p class="muted pad">Chart library failed to load (offline?). Trading still works.</p>';
  applyTheme();
  applyFilter();
}

function applyTheme() {
  document.documentElement.dataset.theme = S.ui.theme;
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  COL = { up: v('--up'), dn: v('--dn') };
  $('#themeBtn').textContent = S.ui.theme === 'light' ? '☀️' : '🌙';
  document.querySelector('meta[name=theme-color]').content = v('--header');
  if (chart) {
    chart.applyOptions({
      layout: { background: { color: v('--panel') }, textColor: v('--muted') },
      grid: { vertLines: { color: v('--line2') }, horzLines: { color: v('--line2') } },
      timeScale: { borderColor: v('--line') }, rightPriceScale: { borderColor: v('--line') },
    });
    series.applyOptions({ upColor: COL.up, downColor: COL.dn, wickUpColor: COL.up, wickDownColor: COL.dn });
  }
  for (const c of S.comps) if (c._cv) drawSpark(c);
}

function addRow(c) {
  const r = document.createElement('div');
  r.className = 'row'; r.dataset.act = 'sel:' + c.sym;
  r.innerHTML = `<button class="star" data-act="star:${c.sym}" title="Watchlist">☆</button>
    <div class="nm"><b>${c.em} ${c.sym}</b> <span>${COUNTRIES[c.cc][0]}</span><small>${esc(c.name)}</small></div>
    <canvas width="52" height="26"></canvas><div class="px"></div><div class="ch"></div>`;
  c._row = r; c._cv = r.querySelector('canvas'); c._px = r.querySelector('.px'); c._ch = r.querySelector('.ch'); c._st = r.querySelector('.star');
  $('#list').appendChild(r);
}

function buildTicker() {
  const items = S.comps.map(c => `<span data-act="sel:${c.sym}" data-tk="${c.sym}"><b>${c.sym}</b> <i></i></span>`).join('');
  $('#tickerTrack').innerHTML = items + items;
  $('#tickerTrack').style.animationDuration = S.comps.length * 2.2 + 's';
  for (const c of S.comps) c._tk = [];
  for (const el of document.querySelectorAll('[data-tk]')) MAP[el.dataset.tk]._tk.push(el.querySelector('i'));
}

function applyFilter() {
  const q = S.ui.q.toLowerCase();
  const vis = S.comps.filter(c => (!S.ui.sec || c.sec === S.ui.sec) && (!S.ui.reg || c.region === S.ui.reg) &&
    (!S.ui.watch || S.watch.includes(c.sym)) && (!q || (c.sym + ' ' + c.name + ' ' + COUNTRIES[c.cc][1] + ' ' + SECTORS[c.sec].name).toLowerCase().includes(q)));
  const chg = c => c.p / c.open - 1;
  const sorters = { move: (a, b) => Math.abs(chg(b)) - Math.abs(chg(a)), gain: (a, b) => chg(b) - chg(a), lose: (a, b) => chg(a) - chg(b), vol: (a, b) => b.volu - a.volu, az: (a, b) => a.sym.localeCompare(b.sym), price: (a, b) => b.p - a.p };
  vis.sort(sorters[S.ui.sort]);
  const L = $('#list'), set = new Set(vis);
  for (const c of S.comps) c._row.hidden = !set.has(c);
  for (const c of vis) L.appendChild(c._row);
  $('#listCount').textContent = `${vis.length} stocks`;
}

function select(sym) {
  const c = MAP[sym]; if (!c) return;
  S.ui.sel = sym;
  if (window.matchMedia('(max-width: 900px)').matches) setMob('pChart');
  buildTrade();
  if (series) {
    series.setData(c.candles.concat([c.cur]).map(k => ({ time: (k[0] + T0) * 900, open: k[1], high: k[2], low: k[3], close: k[4] })));
    const n = c.candles.length + 1;
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 90), to: n + 3 });
    chartSym = sym; updateEntryLine();
  }
  render(true);
}
function updateEntryLine() {
  if (!series) return;
  if (entryLine) { series.removePriceLine(entryLine); entryLine = null; }
  const p = Object.values(S.pos).find(p => p.sym === S.ui.sel);
  if (p) entryLine = series.createPriceLine({ price: p.entry, color: '#ffd54f', lineWidth: 1, lineStyle: 2, title: `Your avg ${p.side > 0 ? 'long' : 'short'}` });
}

function buildTrade() {
  const lev = [1, 2, 5, 10].map(l => {
    const lock = l > 1 && !unlocked('lev');
    return `<button class="lev ${S.ui.lev === l ? 'on' : ''}" data-act="lev:${l}" ${lock ? `disabled title="Unlocks at ${money(UNLOCK.lev)}"` : ''}>${l}x${lock ? '🔒' : ''}</button>`;
  }).join('');
  const sh = unlocked('short');
  $('#trade').innerHTML = `
    <div class="tRow"><label>Qty</label><input id="qty" type="number" min="1" value="${S.ui.qty || 10}">
      <button data-act="qty:1">1</button><button data-act="qty:10">10</button><button data-act="qty:100">100</button><button data-act="qty:max">MAX</button></div>
    <div class="tRow"><label>Leverage</label>${lev}
      <label title="Auto-sell if price moves against you by this %">🛑 SL%</label><input id="sl" type="number" min="0" placeholder="off" class="sm">
      <label title="Auto-sell when profit reaches this %">🎯 TP%</label><input id="tp" type="number" min="0" placeholder="off" class="sm"></div>
    <div class="est" id="est"></div>
    <div class="btns">
      <button class="big buy" data-act="buy">▲ BUY</button>
      <button class="big sell" data-act="sell">▼ SELL</button>
      <button class="big short" data-act="short" ${sh ? '' : `disabled title="Unlocks at ${money(UNLOCK.short)}"`}>🐻 SHORT${sh ? '' : ' 🔒'}</button>
      <button class="big cover" data-act="cover" ${sh ? '' : 'disabled'}>✓ COVER${sh ? '' : ' 🔒'}</button>
    </div>
    ${unlocked('opt') ? `<div class="btns opt"><button class="call" data-act="opt:1">📈 CALL (bet up, 3 days)</button><button class="put" data-act="opt:-1">📉 PUT (bet down, 3 days)</button><span id="prem" class="muted"></span></div>`
      : `<div class="muted small">📈📉 Options unlock at ${money(UNLOCK.opt)}</div>`}
    <div id="myPos"></div>`;
  S._tradeUnlocks = [unlocked('short'), unlocked('lev'), unlocked('opt')].join();
}

// ---------- UI: render ----------
function render(force) {
  if (!S) return;
  rc++;
  const nw = netWorth(), c = MAP[S.ui.sel], d = day();
  // header
  const nwEl = $('#nw');
  nwEl.textContent = money(nw);
  if (Math.abs(nw - lastNW) > 0.5 && lastNW) { nwEl.classList.remove('flashUp', 'flashDn'); void nwEl.offsetWidth; nwEl.classList.add(nw > lastNW ? 'flashUp' : 'flashDn'); }
  lastNW = nw;
  const dchg = S.dayLog ? nw - S.dayLog.startNW : 0;
  $('#nwChg').innerHTML = `<span class="${cls(dchg)}">${arrow(dchg)} ${money(dchg)} today</span>`;
  $('#cash').textContent = money(S.cash);
  $('#day').textContent = 'Day ' + d;
  $('#time').textContent = clock(S.t);
  $('#dayProg').style.width = (S.t % TPD) / TPD * 100 + '%';
  const R = REGIMES[S.regime.k];
  $('#mood').innerHTML = `${R.em} ${R.name}`; $('#mood').title = R.hint; $('#mood').className = 'chip mood-' + S.regime.k;
  $('#title').textContent = titleFor(S.peak);
  $('#ipoBtn').hidden = !S.ipo;
  if (S.ipo) $('#ipoBtn').textContent = `🔔 IPO: ${S.ipo.def.name}`;
  $('#sndBtn').textContent = S.sound ? '🔊' : '🔇';
  const RM = S.room;
  $('#roomBtn').textContent = !RM ? '🏁 Friends' : RM.done ? '🏆 Results' : RM.days ? `🏁 Day ${Math.min(d, RM.goal)}/${RM.goal}` : `🏁 ${Math.min(99, nw / RM.goal * 100 | 0)}% to ${money(RM.goal)}`;
  document.querySelectorAll('[data-act^="speed:"]').forEach(b => b.classList.toggle('on', S.paused ? b.dataset.act === 'speed:0' : b.dataset.act === 'speed:' + S.speed));
  document.body.classList.toggle('warn', !!S.warn);
  document.body.classList.toggle('paused', !!S.paused);

  // list rows
  const spark = force || rc % 4 === 0;
  for (const k of S.comps) {
    if (k._row.hidden) continue;
    const ch = k.p / k.open - 1;
    k._px.textContent = px(k.p);
    k._ch.textContent = (k.halt ? '🔒 ' : '') + pct(ch);
    k._ch.className = 'ch ' + cls(ch);
    k._st.textContent = S.watch.includes(k.sym) ? '⭐' : '☆';
    k._row.classList.toggle('sel', k.sym === S.ui.sel);
    k._row.classList.toggle('own', held(k.sym));
    if (spark) drawSpark(k);
  }
  if (!mouseDown && Date.now() - lastSort > 2500) { lastSort = Date.now(); applyFilter(); }
  // ticker
  if (force || rc % 2 === 0) for (const k of S.comps) {
    const ch = k.p / k.open - 1, txt = `${px(k.p)} ${arrow(ch)}${(Math.abs(ch) * 100).toFixed(2)}%`;
    for (const el of k._tk || []) { el.textContent = txt; el.className = cls(ch); }
  }
  // company
  if (c) renderCompany(c, force);
  if (S._tradeUnlocks !== [unlocked('short'), unlocked('lev'), unlocked('opt')].join()) buildTrade();
  // side tab
  if (!mouseDown) renderTab();
}

function drawSpark(c) {
  const cv = c._cv, x = cv.getContext('2d'), pts = c.candles.slice(-30).map(k => k[4]).concat(c.p);
  const mn = Math.min(...pts), mx = Math.max(...pts), w = cv.width, h = cv.height;
  x.clearRect(0, 0, w, h);
  x.strokeStyle = c.p >= c.open ? COL.up : COL.dn; x.lineWidth = 1.5; x.beginPath();
  pts.forEach((p, i) => { const X = i / (pts.length - 1) * w, Y = h - 2 - (p - mn) / ((mx - mn) || 1) * (h - 4); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
  x.stroke();
}

function ratingLabel(r) { return r > 0.08 ? '🟢 STRONG BUY' : r > 0.025 ? '🟢 BUY' : r < -0.08 ? '🔴 STRONG SELL' : r < -0.025 ? '🔴 SELL' : '🟡 HOLD'; }
function volLabel(v) { return v < 0.8 ? '😴 Low' : v < 1.5 ? '🙂 Medium' : v < 2.5 ? '🌶️ High' : '🌶️🌶️🌶️ INSANE'; }

function renderCompany(c, force) {
  const ch = c.p / c.open - 1, co = COUNTRIES[c.cc];
  $('#coHead').innerHTML = `
    <div class="coTitle"><span class="coEm">${c.em}</span><div><h2>${esc(c.name)} <small>${c.sym}</small></h2>
      <div class="muted">${co[0]} ${co[1]} · ${SECTORS[c.sec].em} ${SECTORS[c.sec].name} · <span class="chip">${ratingLabel(c.rating)}</span>
      ${c.halt ? '<span class="chip bad">🔒 CIRCUIT: FROZEN</span>' : ''}${c.nextEarn - day() <= 1 ? '<span class="chip warnc">📊 Results ' + (c.nextEarn === day() ? 'TODAY' : 'tomorrow') + '</span>' : ''}</div></div></div>
    <div class="coPx"><b class="${cls(ch)}">${px(c.p)}</b><span class="${cls(ch)}">${arrow(ch)} ${pct(ch)}</span></div>`;
  if (series && chartSym === c.sym) {
    const k = c.cur; series.update({ time: (k[0] + T0) * 900, open: k[1], high: k[2], low: k[3], close: k[4] });
  }
  // trade estimate + positions
  const q = Math.max(0, Math.floor(+($('#qty')?.value) || 0)), lev = S.ui.lev, P = c.p;
  const est = $('#est');
  if (est) est.innerHTML = `Cost <b>${money(P * q / lev)}</b>${lev > 1 ? ` <small>(controls ${money(P * q)})</small>` : ''} · Fee ${money(P * q * FEE)} · Max buy <b>${Math.floor(S.cash / (P / lev + P * FEE))}</b> · Cash ${money(S.cash)}`;
  const prem = $('#prem'); if (prem) prem.textContent = `Premium ≈ ${money(P * q * (0.015 + 0.015 * c.vol))}`;
  const mine = Object.entries(S.pos).filter(([, p]) => p.sym === c.sym);
  const myOpts = S.opts.filter(o => o.sym === c.sym);
  const mp = $('#myPos');
  if (mp && !mouseDown) mp.innerHTML = mine.length || myOpts.length ? `<h3>Your position</h3>` + mine.map(([k, p]) => posLine(k, p)).join('') + myOpts.map(optLine).join('') : '<p class="muted small">You don\'t own this stock yet.</p>';
  // info
  if (!mouseDown && (force || rc % 2 === 0 || infoSym !== c.sym)) {
    infoSym = c.sym;
    const news = S.news.filter(n => n.tags.some(t => t.sym === c.sym)).slice(0, 6);
    $('#coInfo').innerHTML = `<p class="desc">${esc(c.desc)}</p>
    <div class="facts">
      <div><small>CEO</small><b>${esc(c.ceo)}</b></div><div><small>Founded</small><b>${c.founded}</b></div>
      <div><small>Employees</small><b>${c.emp.toLocaleString('en-IN')}</b></div><div><small>Market cap</small><b>${money(c.p * c.shares)}</b></div>
      <div><small>P/E ratio</small><b>${(c.p / c.eps).toFixed(1)}</b></div><div><small>Dividend</small><b>${c.div}%</b></div>
      <div><small>Day range</small><b>${px(c.dlo)} – ${px(c.dhi)}</b></div><div><small>All-time range</small><b>${px(c.lo)} – ${px(c.hi)}</b></div>
      <div><small>Volatility</small><b>${volLabel(c.vol)}</b></div><div><small>Beta (market link)</small><b>${c.beta}</b></div>
      <div><small>Volume today</small><b>${Math.round(c.volu).toLocaleString('en-IN')}</b></div><div><small>Next results</small><b>Day ${c.nextEarn}</b></div>
    </div>
    <h3>📰 News about ${esc(c.name)}</h3>
    ${news.length ? news.map(newsItem).join('') : '<p class="muted small">No news yet. Quiet stocks can still move with their sector and the market.</p>'}`;
  }
}

function posLine(k, p) {
  const c = MAP[p.sym], v = posValue(p, c.p), pnl = v - p.margin, pc = pnl / p.margin;
  return `<div class="posRow ${cls(pnl)}" data-act="sel:${p.sym}">
    <div><b>${c.em} ${p.sym}</b> <span class="chip ${p.side > 0 ? 'good' : 'bad'}">${p.side > 0 ? 'LONG' : 'SHORT'}${p.lev > 1 ? ' ' + p.lev + 'x' : ''}</span>
    <small>${p.qty} @ ${px(p.entry)}${p.sl ? ` · 🛑${px(p.sl)}` : ''}${p.tp ? ` · 🎯${px(p.tp)}` : ''}</small></div>
    <div class="pnl"><b class="${cls(pnl)}">${money(pnl)}</b><small class="${cls(pnl)}">${pct(pc)}</small></div>
    <div class="pbtn"><button data-act="half:${k}">½</button><button class="sell" data-act="close:${k}">Close</button></div>
    ${(p.lev > 1 || p.side < 0) && v < p.margin * 0.45 ? '<div class="warnline">💓 MARGIN DANGER: close or get liquidated!</div>' : ''}
  </div>`;
}
function optLine(o) {
  const v = optValue(o), pnl = v - o.prem;
  return `<div class="posRow ${cls(pnl)}" data-act="sel:${o.sym}"><div><b>${MAP[o.sym].em} ${o.sym}</b> <span class="chip">${o.type > 0 ? '📈 CALL' : '📉 PUT'}</span>
    <small>${o.qty} @ strike ${px(o.K)} · expires Day ${o.exp} close</small></div>
    <div class="pnl"><b class="${cls(pnl)}">${money(pnl)}</b><small>worth ${money(v)}</small></div>
    <div class="pbtn"><button class="sell" data-act="exer:${o.id}">Cash out</button></div></div>`;
}

function newsItem(n) {
  const src = SOURCES[n.src];
  const tags = n.tags.map(t => t.sym && MAP[t.sym] ? `<button class="tag" data-act="sel:${t.sym}">${MAP[t.sym].em} ${t.sym}</button>` : t.label ? `<span class="tag">${esc(t.label)}</span>` : '').join('');
  return `<div class="ni ${cls(n.sent)} ${n.deb ? 'deb' : ''} ${n.isDeb ? 'isdeb' : ''}">
    <div class="nmeta"><span>${src.em} ${src.name} <i class="rel r${Math.round(src.rel * 10)}">${Math.round(src.rel * 100)}% reliable</i></span><span>D${Math.floor(n.t / TPD) + 1} ${clock(n.t)}</span></div>
    <div class="ntext">${esc(n.text)}${n.deb ? ' <b class="fake">🚫 FAKE</b>' : ''}</div><div class="ntags">${tags}</div></div>`;
}

function newsHTML() {
  const mine = new Set([...S.watch, ...Object.values(S.pos).map(p => p.sym)]);
  const list = S.news.filter(n => S.ui.nf === 'all' || (S.ui.nf === 'mine' ? n.tags.some(t => mine.has(t.sym)) : SOURCES[n.src].rel >= 0.85));
  const up = S.sched.filter(e => e.kind === 'event').sort((a, b) => a.at - b.at);
  const earn = S.comps.filter(c => mine.has(c.sym) && c.nextEarn - day() <= 2 && c.nextEarn >= day());
  return `<div class="secHead"><b>📰 News</b></div>
    <div class="nf">${[['all', '📰 All'], ['mine', '⭐ My stocks'], ['rel', '🏛️ Reliable only']].map(([k, l]) => `<button class="${S.ui.nf === k ? 'on' : ''}" data-act="nf:${k}">${l}</button>`).join('')}</div>
    ${up.length || earn.length ? `<div class="upcoming"><b>📅 Upcoming</b>${up.map(e => `<div>${esc(e.label)}</div>`).join('')}${earn.map(c => `<div>📊 ${c.em} ${c.sym} results on Day ${c.nextEarn}</div>`).join('')}</div>` : ''}
    ${list.map(newsItem).join('') || '<p class="muted pad">No news here yet.</p>'}`;
}

function portHTML() {
  const ps = Object.entries(S.pos);
  let inv = 0, val = 0;
  for (const [, p] of ps) { inv += p.margin; val += posValue(p, MAP[p.sym].p); }
  const bv = S.biz.reduce((a, b) => a + bizValue(b), 0);
  return `<div class="secHead"><b>💼 Portfolio · ${ps.length} position${ps.length === 1 ? '' : 's'}</b>${S.biz.length ? `<small>🏪 Businesses ${money(bv)}</small>` : ''}</div>
    <div class="psum"><div><small>Holdings</small><b>${money(val)}</b></div><div><small>Unrealised P&L</small><b class="${cls(val - inv)}">${money(val - inv)}</b></div><div><small>Cash</small><b>${money(S.cash)}</b></div></div>
    ${S.ipo?.applied ? `<p class="small">🔔 IPO application: <b>${money(S.ipo.applied)}</b> in ${esc(S.ipo.def.name)} (lists Day ${S.ipo.list})</p>` : ''}
    ${S.payouts.length ? `<p class="small">🃏 Pending life events: ${S.payouts.map(p => `Day ${p.d}`).join(', ')}</p>` : ''}
    ${ps.map(([k, p]) => posLine(k, p)).join('') || '<p class="muted small empty">No positions yet. Pick a stock and hit ▲ BUY.</p>'}
    ${S.opts.map(optLine).join('')}`;
}

let lastTabKey = '';
function renderTab() {
  const tab = S.ui.tab;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.act === 'tab:' + tab));
  const body = $('#tabBody');
  body.classList.toggle('isSplit', tab === 'live');
  if (tab === 'live') {
    if (!$('#livePort')) { body.innerHTML = '<div class="split"><section id="livePort"></section><section id="liveNews"></section></div>'; lastTabKey = ''; }
    $('#livePort').innerHTML = portHTML();
    const key = 'news' + newsVer + S.ui.nf;
    if (key !== lastTabKey) { lastTabKey = key; $('#liveNews').innerHTML = newsHTML(); }
    return;
  }
  let html = '';
  if (tab === 'biz') {
    const d = day(), R = REGIMES[S.regime.k];
    const yday = S.biz.reduce((a, b) => a + (b.yday || 0), 0);
    html = `<p>Mood now: ${R.em} <b>${R.name}</b>. Income is paid at each day's close. Yesterday: <b class="${cls(yday)}">${money(yday)}</b></p>` +
      BUSINESSES.map(D => {
        const b = S.biz.find(x => x.id === D.id), lvl = b?.lvl || 0;
        const est = Math.round((b ? bizBase(b) : D.inc) * bizMult(D, d));
        const loves = Object.entries(D.reg).filter(([, m]) => m > 1).map(([k]) => REGIMES[k].em + ' ' + REGIMES[k].name);
        const hates = Object.entries(D.reg).filter(([, m]) => m < 1).map(([k]) => REGIMES[k].em + ' ' + REGIMES[k].name);
        const link = D.sec ? `${SECTORS[D.sec].em} ${SECTORS[D.sec].name} ${D.k > 0 ? 'up = more 💰' : 'up = less 💰'}` : '';
        const cost = b ? bizUpCost(b) : D.cost;
        return `<div class="biz ${b ? 'owned' : ''}">
          <div class="bHead"><span class="bEm">${D.em}</span><div><b>${D.name}</b> ${b ? `<span class="stars">${'★'.repeat(lvl)}${'☆'.repeat(5 - lvl)}</span>` : ''}<small>${esc(D.desc)}</small></div></div>
          <div class="bStats"><span>Income: <b class="${cls(est)}">${D.special === 'film' ? '🎲 random' : money(est) + '/day'}</b></span>${b ? `<span>Yesterday: <b class="${cls(b.yday)}">${money(b.yday || 0)}</b></span><span>Value: ${money(bizValue(b))}</span>` : `<span>Payback ≈ ${D.inc > 0 ? Math.ceil(D.cost / D.inc) + ' days' : '🎲'}</span>`}</div>
          <div class="bTags">${loves.map(l => `<span class="tag good">❤️ ${l}</span>`).join('')}${hates.map(l => `<span class="tag bad">💔 ${l}</span>`).join('')}${link ? `<span class="tag">🔗 ${link}</span>` : ''}</div>
          <div class="bBtns">${!b ? `<button class="buy" data-act="bizBuy:${D.id}" ${S.cash < cost ? 'disabled' : ''}>Buy ${money(cost)}</button>`
            : `${lvl < 5 ? `<button class="buy" data-act="bizUp:${D.id}" ${S.cash < cost ? 'disabled' : ''}>⬆ Upgrade ${money(cost)}</button>` : '<span class="chip good">MAX LEVEL</span>'}<button class="sell" data-act="bizSell:${D.id}">Sell ${money(bizValue(b))}</button>`}</div>
        </div>`;
      }).join('');
  } else if (tab === 'rivals') {
    const nw = netWorth();
    const all = [...S.rivals.map(r => ({ ...r })), { em: '😎', name: 'YOU', nw, prev: S.dayLog?.startNW || nw }].sort((a, b) => b.nw - a.nw);
    html = `<p class="muted">Your rivals trade too. Beat all three to become 🏆 King of Dalal Street.</p>` + all.map((r, i) => {
      const ch = r.nw / r.prev - 1;
      return `<div class="rival ${r.name === 'YOU' ? 'me' : ''}"><span class="rank">${['🥇', '🥈', '🥉', '4️⃣'][i]}</span><span class="rEm">${r.em}</span><b>${esc(r.name)}</b><span class="rNw">${money(r.nw)}<small class="${cls(ch)}">${pct(ch)}</small></span></div>`;
    }).join('');
  } else if (tab === 'ach') {
    const next = TITLES.find(([v]) => v > S.peak);
    html = `<div class="titleBox"><small>Your title</small><b>${titleFor(S.peak)}</b>${next ? `<div class="bar"><i style="width:${Math.min(100, S.peak / next[0] * 100)}%"></i></div><small>Next: ${next[1]} at ${money(next[0])}</small>` : ''}</div>
      <div class="facts"><div><small>Trades</small><b>${S.stats.trades}</b></div><div><small>Wins / Losses</small><b>${S.stats.wins} / ${S.stats.losses}</b></div>
      <div><small>Business income</small><b>${money(S.stats.biz)}</b></div><div><small>Peak net worth</small><b>${money(S.peak)}</b></div>
      <div><small>Tips bought</small><b>${S.stats.tips}</b></div><div><small>Liquidations</small><b>${S.stats.liq}</b></div>
      <div><small>🏆 Best trade</small><b class="up">${money(S.stats.best)}</b></div><div><small>💀 Worst trade</small><b class="dn">${money(S.stats.worst)}</b></div></div>
      <h3>🎖️ Achievements (${Object.keys(S.ach).length}/${ACH.length})</h3>
      <div class="achs">${ACH.map(([id, name, desc]) => `<div class="ach ${S.ach[id] ? 'got' : ''}"><b>${name}</b><small>${desc}</small>${S.ach[id] ? `<i>Day ${S.ach[id]}</i>` : ''}</div>`).join('')}</div>`;
  }
  $('#tabBody').innerHTML = html;
}

function setMob(m) { S.ui.m = m; document.body.dataset.m = m; document.querySelectorAll('#mobNav button').forEach(b => b.classList.toggle('on', b.dataset.act === 'mob:' + m)); }

// ---------- input ----------
const qtyVal = () => Math.floor(+$('#qty').value || 0);
function posFor(side) {
  const sym = S.ui.sel, k = `${sym}|${side}|${S.ui.lev}`;
  return S.pos[k] ? k : Object.keys(S.pos).find(x => x.startsWith(sym + '|' + side + '|'));
}
const ACTIONS = {
  sel: s => select(s),
  star: s => { const i = S.watch.indexOf(s); i < 0 ? S.watch.push(s) : S.watch.splice(i, 1); render(true); },
  tab: t => { S.ui.tab = t; lastTabKey = ''; renderTab(); },
  nf: f => { S.ui.nf = f; lastTabKey = ''; renderTab(); },
  mob: m => setMob(m),
  qty: v => {
    const c = MAP[S.ui.sel];
    $('#qty').value = v === 'max' ? Math.max(1, Math.floor(S.cash / (c.p / S.ui.lev + c.p * FEE))) : v;
    S.ui.qty = +$('#qty').value; render(true);
  },
  lev: l => { S.ui.lev = +l; buildTrade(); render(true); },
  buy: () => { if (openPos(S.ui.sel, 1, S.ui.lev, qtyVal(), +$('#sl').value, +$('#tp').value)) after(); },
  short: () => { if (openPos(S.ui.sel, -1, S.ui.lev, qtyVal(), +$('#sl').value, +$('#tp').value)) after(); },
  sell: () => { const k = posFor(1); if (!k) return err(`You don't own ${S.ui.sel}.`); closePos(k, qtyVal() || S.pos[k].qty); after(); },
  cover: () => { const k = posFor(-1); if (!k) return err(`No short on ${S.ui.sel}.`); closePos(k, qtyVal() || S.pos[k].qty); after(); },
  close: k => { if (S.pos[k]) closePos(k, S.pos[k].qty); after(); },
  half: k => { const p = S.pos[k]; if (p) closePos(k, Math.max(1, Math.floor(p.qty / 2))); after(); },
  opt: t => { if (buyOpt(S.ui.sel, +t, qtyVal())) after(); },
  exer: id => { exerciseOpt(+id); after(); },
  bizBuy: id => { const D = BDEF[id]; if (S.biz.some(x => x.id === id)) return; if (S.cash < D.cost) return err('Not enough cash'); S.cash -= D.cost; S.biz.push({ id, lvl: 1, inv: D.cost, yday: 0 }); toast(`${D.em} You now own a <b>${D.name}</b>! Income arrives at day close.`, 'good'); SND.win(); after(); },
  bizUp: id => { const b = S.biz.find(x => x.id === id); if (!b || b.lvl >= 5) return; const cost = bizUpCost(b); if (S.cash < cost) return err('Not enough cash'); S.cash -= cost; b.inv += cost; b.lvl++; toast(`${BDEF[id].em} ${BDEF[id].name} upgraded to level ${b.lvl}!`, 'good'); SND.buy(); after(); },
  bizSell: id => { const i = S.biz.findIndex(x => x.id === id), b = S.biz[i], v = bizValue(b); S.cash += v; S.biz.splice(i, 1); toast(`Sold ${BDEF[id].name} for ${money(v)}`, 'info'); after(); },
  speed: v => { v = +v; if (v === 0) S.paused = !S.paused; else { S.speed = v; S.paused = false; } render(); },
  tip: () => buyTip(),
  ipo: () => showIPO(),
  snd: () => { S.sound = !S.sound; render(); },
  theme: () => { S.ui.theme = S.ui.theme === 'light' ? 'dark' : 'light'; applyTheme(); },
  help: () => showHelp(),
  room: () => showRoom(),
  cloud: () => showLogin(),
  reset: () => modal('<h2>🔄 Start a new run?</h2><p>This wipes your current game: cash, stocks, businesses and trophies.</p>',
    [{ label: '🔥 Yes, start over', cls: 'sellbtn', fn: () => { localStorage.removeItem(SAVE_KEY); newGame(); buildUI(); select(S.ui.sel); } }, { label: 'Cancel', cls: 'primary' }]),
};
function after() { lastTabKey = ''; checkAch(); updateEntryLine(); render(true); }

function bindInput() {
  document.addEventListener('pointerdown', e => { if (e.target.closest('#tabBody, #myPos, #list')) mouseDown = true; });
  document.addEventListener('pointerup', () => setTimeout(() => { mouseDown = false; }, 0));
  document.addEventListener('click', e => {
    const mi = e.target.closest('[data-mi]');
    if (mi) { const b = modalBtns[+mi.dataset.mi]; if (b.fn && b.fn() === false) return; closeModal(); return; }
    const ip = e.target.closest('[data-ipop]');
    if (ip) { $('#ipoAmt').value = Math.floor(S.cash * +ip.dataset.ipop); return; }
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const s = el.dataset.act, i = s.indexOf(':');
    ACTIONS[i < 0 ? s : s.slice(0, i)]?.(i < 0 ? undefined : s.slice(i + 1));
  });
  $('#search').addEventListener('input', e => { S.ui.q = e.target.value; applyFilter(); render(true); });
  $('#fSec').addEventListener('change', e => { S.ui.sec = e.target.value; applyFilter(); render(true); });
  $('#fReg').addEventListener('change', e => { S.ui.reg = e.target.value; applyFilter(); render(true); });
  $('#sort').addEventListener('change', e => { S.ui.sort = e.target.value; applyFilter(); render(true); });
  $('#fWatch').addEventListener('click', () => { S.ui.watch = !S.ui.watch; $('#fWatch').classList.toggle('on', S.ui.watch); applyFilter(); render(true); });
  document.addEventListener('input', e => { if (e.target.id === 'qty') S.ui.qty = +e.target.value; });
  document.addEventListener('keydown', e => {
    if (modalBtns) { if (e.key === 'Enter') { e.preventDefault(); ($('#modalBox .primary') || $('#modalBox [data-mi]'))?.click(); } return; }
    if (e.target.matches('input, select')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); ACTIONS.speed(0); }
    else if (k === 'b') ACTIONS.buy();
    else if (k === 's') ACTIONS.sell();
    else if (k === '1' || k === '2' || k === '3') ACTIONS.speed([1, 2, 4][+k - 1]);
    else if (k === 'arrowdown' || k === 'arrowup') {
      e.preventDefault();
      const rows = [...$('#list').children].filter(r => !r.hidden), i = rows.findIndex(r => r.dataset.act === 'sel:' + S.ui.sel);
      const n = rows[clamp(i + (k === 'arrowdown' ? 1 : -1), 0, rows.length - 1)];
      if (n) { select(n.dataset.act.slice(4)); n.scrollIntoView({ block: 'nearest' }); }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('beforeunload', save);
}

// ---------- self-test (?test) ----------
function selfTest() {
  const keep = S; quiet = true;
  const ok = [], near = (a, b, m) => { if (Math.abs(a - b) > 1e-6) throw new Error(`${m}: got ${a}, want ${b}`); ok.push(m); };
  try {
    newGame(); const c = S.comps[0], s = c.sym; c.p = 100; c.halt = 0; S.cash = 10000;
    openPos(s, 1, 1, 10); near(S.cash, 10000 - 1000 - 0.5, 'buy deducts cost+fee');
    c.p = 110; near(posValue(S.pos[`${s}|1|1`], 110), 1100, 'long value');
    near(closePos(`${s}|1|1`, 10), 100 - 0.55, 'long pnl'); near(S.cash, 10000 - 1000.5 + 1100 - 0.55, 'sell credits');
    c.p = 100; S.cash = 10000; openPos(s, 1, 5, 50); near(S.cash, 10000 - 1000 - 2.5, '5x margin');
    near(posValue(S.pos[`${s}|1|5`], 90), 500, '5x long value after -10%');
    S.pos = {}; S.cash = 10000; openPos(s, -1, 1, 10); near(posValue(S.pos[`${s}|-1|1`], 80), 1200, 'short gains when price falls');
    S.pos = {}; S.cash = 10000; openPos(s, 1, 10, 100); c.p = 91; checkPositions();
    near(Object.keys(S.pos).length, 0, 'liquidation closes position'); near(S.cash, 10000 - 1000 - 5 + 100 - 4.55, 'liquidation returns leftover');
    S.pos = {}; c.p = 100; S.cash = 10000; openPos(s, 1, 1, 10, 5, 10); c.p = 94; checkPositions(); near(Object.keys(S.pos).length, 0, 'stop-loss triggers');
    S.cash = 10000; c.p = 100; buyOpt(s, 1, 10); const o = S.opts[0]; c.p = 120; near(optValue(o), 200, 'call value');
    S.regime.k = 'bull'; near(bizBase({ id: 'chai', lvl: 3 }) * bizMult(BDEF.chai, 1), 4000 * 2.2, 'chai lvl3 income');
    S.regime.k = 'crash'; near(BDEF.gold.reg.crash, 3, 'gold loves crash');
    const run = play => { newGame(parseRoom('TEST1-5D')); play(); for (let i = 0; i < TPD * 3; i++) tick(); return S.comps.map(c => c.p.toFixed(4)).join(); };
    const a = run(() => { }), b = run(() => { S.cash = 1e9; openPos(S.comps[0].sym, 1, 1, 100); S.biz.push({ id: 'film', lvl: 1, inv: 1e5, yday: 0 }, { id: 'chai', lvl: 1, inv: 1e4, yday: 0 }); });
    near(+(a === b), 1, 'same room code = same market, whatever the player does');
    near(+(a !== run(() => { S.rs ^= 1; })), 1, 'different seed = different market');
    console.log('✅ QuickStock self-test passed:', ok);
    alert('✅ Self-test passed (' + ok.length + ' checks)');
  } catch (e) { console.error(e); alert('❌ Self-test FAILED: ' + e.message); }
  S = keep; buildMap(); quiet = false;
}

// ---------- boot ----------
function boot() {
  const fresh = !load();
  if (fresh) newGame();
  S.ui.theme ??= matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  if (S.ui.tab === 'news' || S.ui.tab === 'port') S.ui.tab = 'live';
  if (location.search.includes('test')) selfTest();
  buildUI(); bindInput(); select(S.ui.sel); setMob(S.ui.m);
  $('#fWatch').classList.toggle('on', S.ui.watch);
  const link = new URLSearchParams(location.search).get('room');
  if (link && link.toUpperCase() !== S.room?.code) showRoom(link);
  else if (fresh) showHelp();
  cloudInit();
  setInterval(() => {
    if (S.paused || modalBtns || S.room?.done) return;
    for (let i = 0; i < S.speed && !modalBtns; i++) tick();
    const c = MAP[S.ui.sel];
    if (series && chartSym === c.sym) { const k = c.cur; series.update({ time: (k[0] + T0) * 900, open: k[1], high: k[2], low: k[3], close: k[4] }); }
  }, 250);
  setInterval(() => render(), 500);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
}
boot();
