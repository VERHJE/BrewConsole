// Bouwt de ontwerpborden (HTML → PNG) voor ronde 3. Gebruik: node docs/engine3/ontwerp/maak-borden.mjs
// De schermen zijn echte HTML met de echte receptgetallen uit de app; foto's van zakken zijn illustraties (plaatsvervanger).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : HERE;
const PHOTO = (n) => `file://${path.resolve(HERE, '../../../photos', n)}`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e9e5dc;font-family:Inter,system-ui,sans-serif;color:#222}
.board{padding:56px 64px 64px;width:max-content}
.board h1{font:700 40px/1.1 Inter;margin-bottom:6px;color:#1b1a17}
.board .lede{font:400 18px/1.4 Inter;color:#55514a;margin-bottom:34px;max-width:1500px}
.grid{display:grid;gap:34px 54px;align-items:start}
.colhead{font:600 15px/1.35 Inter;color:#1b1a17;padding-bottom:6px}
.colhead small{display:block;font-weight:400;color:#6b665d;font-size:13px;margin-top:2px}
.rowlabel{font:600 15px/1.3 Inter;color:#1b1a17;margin:6px 0 10px;display:flex;align-items:center;gap:10px}
.rowlabel i{font-style:normal;background:#1b1a17;color:#fff;border-radius:99px;padding:2px 10px;font-size:13px}
.cap{font:500 13px/1.3 Inter;color:#55514a;margin-top:10px;text-align:center}

/* telefoon */
.phone{width:390px;height:812px;border-radius:48px;border:10px solid #0a0a0a;overflow:hidden;position:relative;background:var(--bg);color:var(--text);box-shadow:0 26px 50px rgba(0,0,0,.28);font-family:Inter}
.notch{position:absolute;top:9px;left:50%;transform:translateX(-50%);width:104px;height:28px;border-radius:20px;background:#000;z-index:9}
.status{height:46px;display:flex;justify-content:space-between;align-items:flex-end;padding:0 30px 4px;font-size:14px;font-weight:600;position:relative;z-index:8}
.head{font-family:var(--head)}
.serif{--head:'Fraunces',Georgia,serif;--headw:600;--headtrack:-.01em}
.sans{--head:Inter,system-ui,sans-serif;--headw:700;--headtrack:-.02em}
.lux{--bg:#120e0a;--bg2:#1b1510;--surface:#211911;--line:rgba(240,215,180,.15);--text:#f5ecdf;--text2:#cdbda6;--accent:#d9a65a;--on:#1a1108;--ring:rgba(255,255,255,.13);--warn:#e2b04d;--ok:#8fcf9d}
.org{--bg:#f4efe4;--bg2:#ece6d6;--surface:#fcfaf4;--line:#e0d9c7;--text:#1d261c;--text2:#515c4e;--accent:#3f6b3c;--on:#ffffff;--ring:#e2dccb;--warn:#8a5a00;--ok:#2f6b3f}
.min{--bg:#ffffff;--bg2:#f5f5f4;--surface:#ffffff;--line:#e6e6e4;--text:#0f0f0f;--text2:#575755;--accent:#111111;--on:#ffffff;--ring:#ecebe8;--warn:#8a5a00;--ok:#2f6b3f;--spot:#a4552a}
.screen{position:absolute;inset:46px 0 0 0;display:flex;flex-direction:column}
.pad{padding:0 20px}
.eyebrow{font:600 12px/1 Inter;letter-spacing:.09em;text-transform:uppercase;color:var(--text2)}
h1.t{font:var(--headw) 30px/1.1 var(--head);letter-spacing:var(--headtrack);color:var(--text)}
h2.t{font:var(--headw) 21px/1.15 var(--head);letter-spacing:var(--headtrack)}
.summary{display:flex;align-items:center;gap:10px;padding:8px 12px 8px 8px;border:1px solid var(--line);background:var(--surface);border-radius:16px;margin:10px 20px 12px}
.summary .th{width:36px;height:36px;border-radius:10px;overflow:hidden;flex:none;background:var(--bg2)}
.summary .th svg,.summary .th img{width:100%;height:100%;object-fit:cover;display:block}
.summary b{font:600 14px/1.2 Inter;display:block}
.summary small{font:400 12px/1.2 Inter;color:var(--text2)}
.summary .edit{margin-left:auto;font:600 13px Inter;color:var(--accent)}
.lux .summary .edit{color:var(--accent)}
.nums{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 20px}
.num{border:1px solid var(--line);background:var(--surface);border-radius:14px;padding:10px 10px 9px}
.num b{display:block;font:700 22px/1.05 Inter;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.num small{font:400 11px/1.2 Inter;color:var(--text2)}
.min .num{border:0;border-top:1px solid var(--line);border-radius:0;padding:10px 0 4px;background:transparent}
.nums.big2{grid-template-columns:1fr 1fr;gap:8px}.nums.big2 .num b{font-size:28px}.nums.big2 .num{padding:10px 14px}.why{margin:10px 22px 0;font:400 13px/1.35 Inter;color:var(--text2)}
.sched{margin:12px 20px 0;font-variant-numeric:tabular-nums}
.sched div{display:flex;gap:12px;padding:7px 2px;border-bottom:1px solid var(--line);font-size:14px;color:var(--text2)}
.sched div b{color:var(--text);font-weight:600;width:44px}
.sched div span:last-child{margin-left:auto;color:var(--text)}
.startbar{position:absolute;left:0;right:0;bottom:64px;padding:10px 20px 10px;background:linear-gradient(to top,var(--bg) 70%,transparent)}
.btn{display:flex;align-items:center;justify-content:center;height:56px;border-radius:16px;background:var(--accent);color:var(--on);font:700 17px Inter}
.min .btn{border-radius:14px}
.tabbar{position:absolute;left:0;right:0;bottom:0;height:64px;border-top:1px solid var(--line);background:var(--bg);display:flex;padding-bottom:6px}
.tabbar span{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font:500 11px Inter;color:var(--text2)}
.tabbar span.on{color:var(--accent);font-weight:700}
.min .tabbar span.on{color:var(--text)}
.tabbar svg{width:22px;height:22px}
.hero{position:relative;margin:0 20px 10px;border-radius:22px;overflow:hidden;height:150px;background:#000}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero:after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(10,6,3,.86) 0%,rgba(10,6,3,.55) 42%,rgba(10,6,3,.05) 80%)}
.hero .tx{position:absolute;left:16px;right:16px;bottom:13px;z-index:2;color:#f7efe3}
.hero .tx small{font:500 12px Inter;color:#e3d4bd;letter-spacing:.06em;text-transform:uppercase}
.hero .tx h2{font:var(--headw) 26px/1.1 var(--head);letter-spacing:var(--headtrack)}
.range{margin:0 20px 10px;padding:12px 14px;border:1px solid var(--line);background:var(--surface);border-radius:16px}
.range .r1{display:flex;justify-content:space-between;font:600 13px Inter}
.range .ok{color:var(--ok)}
.bar{height:8px;border-radius:99px;background:var(--ring);margin-top:9px;position:relative}
.bar i{position:absolute;left:34%;width:34%;top:0;bottom:0;border-radius:99px;background:var(--accent);opacity:.9}
.bar b{position:absolute;left:52%;top:-4px;width:3px;height:16px;border-radius:2px;background:var(--text)}
.org .photo,.org .hero2{border-radius:24px}
.hero2{margin:0 20px 10px;height:112px;border-radius:24px;overflow:hidden;position:relative;background:#cfc6b0}
.hero2 img{width:100%;height:100%;object-fit:cover;object-position:50% 40%;display:block;filter:saturate(.9)}
.big{font:700 72px/1 Inter;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.totaal{font:500 12px Inter;letter-spacing:.09em;text-transform:uppercase;color:var(--text2);margin-top:2px}
.ringwrap{display:flex;gap:14px;align-items:center;margin:12px 20px 6px;padding:14px;border:2px solid var(--accent);border-radius:20px;background:var(--surface)}
.min .ringwrap{border:1px solid var(--line);border-radius:0;border-left:0;border-right:0;background:transparent;padding:16px 0}
.ring{position:relative;width:148px;height:148px;flex:none}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring .tr{fill:none;stroke:var(--ring);stroke-width:9}
.ring .pr{fill:none;stroke:var(--spot,var(--accent));stroke-width:9;stroke-linecap:round}
.ring span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 34px Inter;font-variant-numeric:tabular-nums}
.ringwrap h2{font:var(--headw) 26px/1.15 var(--head);letter-spacing:var(--headtrack);margin-bottom:4px}
.ringwrap p{font:400 15px/1.4 Inter;color:var(--text2)}
.next{margin:8px 22px 10px;font:500 15px Inter;color:var(--text2)}
.steps{margin:0 20px;font-variant-numeric:tabular-nums}
.steps div{display:flex;gap:14px;padding:10px 12px;border-radius:12px;font-size:15.5px;color:var(--text2)}
.steps div.go{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--text);font-weight:600}
.btnrow{position:absolute;left:20px;right:20px;bottom:20px}
.btn2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.btn2 div{height:48px;border:1px solid var(--line);border-radius:14px;display:flex;align-items:center;justify-content:center;font:600 15px Inter;background:var(--surface)}

/* zakken */
.stack{position:relative;margin:8px 20px 0;height:330px}
.card{position:absolute;left:0;right:0;border-radius:26px;overflow:hidden;border:1px solid var(--line)}
.card.c3{top:0;transform:scale(.88);opacity:.55;height:300px;transform-origin:50% 0}
.card.c2{top:20px;transform:scale(.94);opacity:.8;height:300px;transform-origin:50% 0}
.card.c1{top:44px;height:288px;box-shadow:0 18px 30px rgba(0,0,0,.25)}
.card .bagbg{height:176px;display:flex;align-items:center;justify-content:center}
.card .bagbg svg{height:150px}
.card .info{padding:12px 16px;background:var(--surface);height:112px}
.card .info h2{font:var(--headw) 22px/1.1 var(--head);letter-spacing:var(--headtrack)}
.card .info p{font:400 13px/1.35 Inter;color:var(--text2);margin-top:3px}
.chip{display:inline-flex;align-items:center;gap:5px;font:600 12px Inter;padding:4px 10px;border-radius:99px;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--text);margin:8px 6px 0 0}
.row{display:flex;gap:12px;align-items:center;margin:0 20px 10px;padding:10px;border:1px solid var(--line);background:var(--surface);border-radius:16px}
.row .th{width:46px;height:46px;border-radius:12px;overflow:hidden;flex:none}
.row b{display:block;font:600 15px Inter}.row small{font:400 12.5px Inter;color:var(--text2)}
.row .st{margin-left:auto;font:600 13px Inter;color:var(--accent)}
.min .row .st{color:var(--text)}
.dhero{height:268px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.lux .dhero ~ *{}
.dhero svg.bag{height:210px;position:relative;z-index:1}
.dhero .back,.dhero .fav{position:absolute;top:54px;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:2;color:#fff;font-size:18px}
.dhero .back{left:16px}.dhero .fav{right:16px}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;margin:10px 20px 0}
.facts div{padding:8px 0;border-bottom:1px solid var(--line)}
.facts small{display:block;font:500 11px Inter;letter-spacing:.07em;text-transform:uppercase;color:var(--text2)}
.facts b{font:600 15px Inter}
.fit{margin:12px 20px 0;display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.fit .v{font:700 26px Inter;color:var(--ok)}
.fit p{font:400 13px/1.3 Inter;color:var(--text2)}
.spark{margin:10px 20px 0;height:84px;width:350px}
.startbar.low{bottom:0;padding-bottom:22px}
`;

const icon = {
  brew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3v3M12 3v3"/></svg>',
  bean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4.5 0-8 3.6-8 8.5S7.5 21 12 21s8-4.6 8-9.5S16.5 3 12 3z"/><path d="M9 5c4 2 2 6 4 8s2 4 1 7"/></svg>',
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>'
};
const tabbar = (on) => `<div class="tabbar">${[['brew', 'Zetten'], ['bean', 'Zakken'], ['log', 'Logboek'], ['more', 'Meer']].map(([k, l]) => `<span class="${on === k ? 'on' : ''}">${icon[k]}${l}</span>`).join('')}</div>`;
const status = `<div class="notch"></div><div class="status"><span>09:41</span><span>●●● 5G ▮</span></div>`;

// Zak-illustratie (plaatsvervanger voor een eigen foto): papieren zak met etiket.
const bag = (c1, c2, name, sub) => `<svg class="bag" viewBox="0 0 140 180" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g${name.length}${c1.length}" x1="0" x2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M20 26 L120 26 L128 168 Q70 180 12 168 Z" fill="url(#g${name.length}${c1.length})"/><path d="M20 26 L120 26 L116 40 L24 40 Z" fill="#000" opacity=".16"/><rect x="34" y="70" width="72" height="62" rx="5" fill="#f7f0e3"/><text x="70" y="94" text-anchor="middle" font-family="Fraunces,serif" font-weight="600" font-size="11" fill="#2b2118">${name}</text><text x="70" y="108" text-anchor="middle" font-family="Inter" font-size="7.5" fill="#6b5a45">${sub}</text><circle cx="70" cy="122" r="3" fill="#a4552a"/></svg>`;

const sparkline = (stroke) => {
  const v = [2, 3, 3, 4, 4, 3, 5, 5];
  const pts = v.map((y, i) => [20 + i * 44, 64 - (y - 1) * 10]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return `<svg class="spark" viewBox="0 0 350 84"><path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${stroke}" stroke="var(--bg)" stroke-width="2"/>`).join('')}<text x="${pts[7][0] - 6}" y="${pts[7][1] - 10}" text-anchor="end" font-family="Inter" font-size="11" font-weight="700" fill="var(--text)">5 van 5</text></svg>`;
};

// ── Zetten ───────────────────────────────────────────────
function zetten(dir, type) {
  const cls = `phone ${dir} ${type}`;
  const thumb = `<div class="th">${bag('#8a5a34', '#c28a52', 'Verloop', 'Colombia')}</div>`;
  const summary = `<div class="summary">${thumb}<div><b>Verloopzak</b><small>250 g · Helder en fris</small></div><span class="edit">Wijzig</span></div>`;
  const nums = `<div class="nums big2"><div class="num"><b>22 g</b><small>koffie</small></div><div class="num"><b>292 g</b><small>water</small></div><div class="num"><b>92 °C</b><small>temperatuur</small></div><div class="num"><b>klik 22</b><small>Timemore C3S Pro</small></div></div>`;
  const ROWS = [['0:00', '+49 g', '49 g'], ['0:45*', '+68 g', '117 g'], ['1:30*', '+58 g', '175 g'], ['2:10*', '+59 g', '234 g'], ['2:40*', '+58 g', '292 g']];
  const rowsHtml = (n) => ROWS.slice(0, n).map(r => `<div><b>${r[0]}</b><span>${r[1]}</span><span>→ ${r[2]}</span></div>`).join('');
  const sched = dir === 'lux' ? `<div class="sched">${rowsHtml(5)}</div>`
    : dir === 'org' ? `<div class="sched">${rowsHtml(3)}<div><b>…</b><span>nog 2 gietstappen</span><span>→ 292 g</span></div></div>`
    : `<div class="sched">${rowsHtml(5)}</div><p class="why">Waarom: je laatste kop was iets slap, dus iets meer koffie.</p>`;
  const start = `<div class="startbar"><div class="btn">Start zetsel · klaar rond 3:18–3:41</div></div>`;
  let body;
  if (dir === 'lux') {
    body = `<div class="pad" style="padding-top:2px"><span class="eyebrow">Vandaag zetten</span></div>${summary}
      <div class="hero"><img src="${PHOTO('brew-v60-square.webp')}"><div class="tx"><small>Hario V60 · Kasuya 4:6</small><h2>Een heldere, zoete kop</h2></div></div>${nums}${sched}`;
  } else if (dir === 'org') {
    body = `<div class="pad" style="padding-top:2px"><h1 class="t">Zetten</h1></div>${summary}
      <div class="range"><div class="r1"><span>Sterkte-doel</span><span class="ok">Binnen bereik ✓</span></div><div class="bar"><i></i><b></b></div></div>
      <div class="hero2"><img src="${PHOTO('home-hero.webp')}"></div>${nums}${sched}`;
  } else {
    body = `<div class="pad" style="padding-top:2px"><h1 class="t">Zetten</h1></div>${summary}
      <div class="nums" style="grid-template-columns:1fr 1fr;gap:0 24px;row-gap:2px"><div class="num"><b class="big" style="font-size:44px">22 g</b><small>koffie</small></div><div class="num"><b class="big" style="font-size:44px">292 g</b><small>water</small></div><div class="num"><b class="big" style="font-size:44px">92 °C</b><small>temperatuur</small></div><div class="num"><b class="big" style="font-size:44px">klik 22</b><small>Timemore C3S Pro</small></div></div>${sched}`;
  }
  return `<div class="${cls}">${status}<div class="screen">${body}</div>${start}${tabbar('brew')}</div>`;
}

// ── Timer ────────────────────────────────────────────────
function timer(dir, type) {
  const C = 2 * Math.PI * 52;
  return `<div class="phone ${dir} ${type}">${status}<div class="screen">
    <div style="text-align:center;padding-top:10px"><div class="big">0:20</div><div class="totaal">totaal</div></div>
    <div class="ringwrap"><div class="ring"><svg viewBox="0 0 120 120"><circle class="tr" cx="60" cy="60" r="52"/><circle class="pr" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * 0.58).toFixed(1)}"/></svg><span>0:25</span></div>
      <div><h2>Giet 1</h2><p>49 g tot 49 g, in spiraal.</p></div></div>
    <div class="next">Hierna giet 2: 68 g tot 117 g om 0:45.</div>
    <div class="steps"><div class="go"><span>0:00</span><span>+49 g</span><span>→ 49 g</span></div><div><span>0:45</span><span>+68 g</span><span>→ 117 g</span></div><div><span>1:30</span><span>+58 g</span><span>→ 175 g</span></div><div><span>2:10</span><span>+59 g</span><span>→ 234 g</span></div><div><span>2:40</span><span>+58 g</span><span>→ 292 g</span></div></div>
    <div class="btnrow"><div class="btn">Erdoor</div><div class="btn2"><div>Pauze</div><div>Stop</div></div></div>
  </div></div>`;
}

// ── Zakken ───────────────────────────────────────────────
const BAGS = [
  ['#8a5a34', '#c28a52', 'Verloopzak', 'Colombia'],
  ['#3d5a45', '#6f8f6d', 'Kiambu', 'Kenia'],
  ['#6b3f4a', '#a5707a', 'Halo', 'Ethiopië']
];
function zakken(dir, type) {
  const tint = dir === 'lux' ? ['#3a2a1c', '#2a1e14'] : ['#e6dcc4', '#d9cdb1'];
  const tint2 = dir === 'lux' ? ['#2b3a2f', '#1e2b22'] : ['#d7e0cd', '#c8d3bc'];
  const tint3 = dir === 'lux' ? ['#3b2530', '#2a1a22'] : ['#e8d6d6', '#dcc4c6'];
  const card = (i, b, t) => `<div class="card c${i}"><div class="bagbg" style="background:linear-gradient(160deg,${t[0]},${t[1]})">${bag(...b)}</div><div class="info">${i === 1 ? `<h2>${b[2]}</h2><p>Finca La Esperanza · ${b[3]}, Huila</p><span class="chip">12 d na branding</span><span class="chip">★ 4,3 · 8 koppen</span>` : ''}</div></div>`;
  return `<div class="phone ${dir} ${type}">${status}<div class="screen">
    <div class="pad" style="padding-top:2px"><h1 class="t">Zakken</h1></div>
    <div class="stack">${card(3, BAGS[2], tint3)}${card(2, BAGS[1], tint2)}${card(1, BAGS[0], tint)}</div>
    <div style="height:14px"></div>
    <div class="row"><div class="th">${bag(...BAGS[1])}</div><div><b>Kiambu</b><small>Kenia · 4 d na branding</small></div><span class="st">★ 4,6</span></div>
    <div class="row"><div class="th">${bag(...BAGS[2])}</div><div><b>Halo</b><small>Ethiopië · 31 d na branding</small></div><span class="st">★ 4,0</span></div>
    <div class="row"><div class="th">${bag('#5a4a2a','#9a8250','Gesha','Panama')}</div><div><b>Gesha</b><small>Panama · rust nog 3 d</small></div><span class="st">nieuw</span></div>
  </div>${tabbar('bean')}</div>`;
}
function detail(dir, type) {
  const t = dir === 'lux' ? ['#3a2a1c', '#14100b'] : ['#e6dcc4', '#d4c8a8'];
  return `<div class="phone ${dir} ${type}">${status}<div class="screen" style="inset:0">
    <div class="dhero" style="background:linear-gradient(170deg,${t[0]},${t[1]});padding-top:46px"><span class="back">‹</span><span class="fav">★</span>${bag(...BAGS[0])}</div>
    <div class="pad" style="padding-top:14px"><span class="eyebrow">Gewassen · Licht gebrand</span><h1 class="t" style="font-size:32px;margin-top:6px">Finca La Esperanza</h1>
      <div><span class="chip">Jasmijn</span><span class="chip">Perzik</span><span class="chip">Zwarte thee</span></div></div>
    <div class="facts"><div><small>Land</small><b>Colombia</b></div><div><small>Regio</small><b>Huila</b></div><div><small>Hoogte</small><b>1.800 m</b></div><div><small>Variëteit</small><b>Caturra</b></div></div>
    <div class="fit"><span class="v">+0,4</span><p>Past bij je smaak: je waardeerde fruitige, lichte koppen hoger dan je gemiddelde.</p></div>
    ${sparkline(dir === 'lux' ? '#d9a65a' : '#3f6b3c')}
  </div><div class="startbar low"><div class="btn">Zet deze zak</div></div></div>`;
}

const page = (inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${inner}</body></html>`;
const colhead = (t, s) => `<div class="colhead">${t}<small>${s}</small></div>`;
const rowlabel = (k, t) => `<div class="rowlabel"><i>${k}</i>${t}</div>`;

const DIRS = [
  ['lux', '1 · Quiet Luxury (donker)', 'Warm bruin en goud; foto als held'],
  ['org', '3 · Organic Light (licht)', 'Crème en rustig groen; natuurlijk'],
  ['min', '6 · Minimal Pro (licht)', 'Grote getallen, alleen typografie']
];

function recipeBoard(title, lede, fn) {
  const head = DIRS.map(d => colhead(d[1], d[2])).join('');
  const row = (type) => DIRS.map(d => `<div>${fn(d[0], type)}<div class="cap">${d[1].split(' · ')[1].split(' (')[0]}</div></div>`).join('');
  return `<div class="board"><h1>${title}</h1><p class="lede">${lede}</p>
    <div class="grid" style="grid-template-columns:repeat(3,410px)">${head}</div>
    ${rowlabel('A', 'Serif voor koppen (Fraunces), schreefloos voor getallen en tekst')}
    <div class="grid" style="grid-template-columns:repeat(3,410px)">${row('serif')}</div>
    ${rowlabel('B', 'Alles schreefloos (Inter)')}
    <div class="grid" style="grid-template-columns:repeat(3,410px)">${row('sans')}</div></div>`;
}

function zakkenBoard() {
  const cols = [['lux', 'stack'], ['lux', 'detail'], ['org', 'stack'], ['org', 'detail']];
  const head = [colhead('Quiet Luxury · zakkenlijst', 'Kaartenstapel, foto per zak'), colhead('Quiet Luxury · zakdetail', 'Verhaal van de herkomst'), colhead('Organic Light · zakkenlijst', 'Dezelfde stapel, licht'), colhead('Organic Light · zakdetail', 'Herkomst, smaakpasvorm, verloop')].join('');
  const row = (type) => cols.map(([d, k]) => `<div>${k === 'stack' ? zakken(d, type) : detail(d, type)}</div>`).join('');
  return `<div class="board"><h1>Zakken: foto per zak, kaartenstapel en herkomstverhaal</h1><p class="lede">Alle gegevens op het detail komen uit de zak zelf: land, regio, hoogte, variëteit, proces, smaaknotities, en 'past bij je smaak' uit het logboek. De zakken hier zijn illustraties; in de app komt je eigen foto van de verpakking.</p>
    <div class="grid" style="grid-template-columns:repeat(4,410px)">${head}</div>
    ${rowlabel('A', 'Serif voor koppen (Fraunces)')}<div class="grid" style="grid-template-columns:repeat(4,410px)">${row('serif')}</div>
    ${rowlabel('B', 'Alles schreefloos (Inter)')}<div class="grid" style="grid-template-columns:repeat(4,410px)">${row('sans')}</div></div>`;
}

function eisenBoard() {
  const S = `.eis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;width:1700px}.k{background:#fffdf8;border:1px solid #d9d2c2;border-radius:20px;padding:26px 28px}.k h2{font:700 22px Inter;margin-bottom:12px}.k h3{font:700 15px Inter;margin:14px 0 6px;color:#3f3a31}.k li{font:400 15.5px/1.45 Inter;margin:0 0 7px 18px;color:#2b2822}.k li b{font-weight:600}.tag{display:inline-block;font:600 12px Inter;padding:2px 9px;border-radius:99px;margin-right:6px}.ja{background:#dcebd9;color:#245a2a}.nee{background:#f2d9d4;color:#8a2a1f}.deels{background:#f1e5c4;color:#7a5600}.bron{font:400 13px/1.4 Inter;color:#6b665d;margin-top:14px}`;
  return `<style>${S}</style><div class="board"><h1>Ontwerpeisen voor Brew Console · ronde 3</h1><p class="lede">Wat 2026 vraagt, wat standhoudt en waar elk ontwerp aan moet voldoen. Eerlijk over de bronnen: veel trendartikelen zijn vooral meningen van bureaus; de toegankelijkheidscijfers komen uit de richtlijnen zelf.</p>
  <div class="eis">
   <div class="k"><h2>Wat 2026 vraagt (en houdt stand)</h2>
    <ul><li><span class="tag ja">past</span><b>Eenvoud en snelheid.</b> Alle bronnen noemen het; weinig harde cijfers.</li>
    <li><span class="tag ja">past</span><b>Duim-navigatie</b> (menu onderaan) en gebaren.</li>
    <li><span class="tag ja">past</span><b>Licht én donker</b>, volgt het toestel.</li>
    <li><span class="tag ja">past</span><b>Haptiek en geluid</b> bij stappen. Trilling hebben we, geluid nog niet.</li>
    <li><span class="tag deels">deels</span><b>Expressief ontwerp</b> (Material 3 Expressive): grotere cijfers, kleur en vorm voor hiërarchie. Google meldt sneller vinden van hoofdzaken, maar waarschuwt zelf dat helderheid voorgaat.</li>
    <li><span class="tag nee">liever niet</span><b>Doorschijnend glas over inhoud</b> (iOS 26 Liquid Glass): kritiek op tekstcontrast over wisselende achtergronden; Apple voegde in 26.1 een 'Tinted'-optie toe om het af te zwakken.</li>
    <li><span class="tag nee">nee</span><b>AI-eerst</b>: past niet bij jouw kostenbesluit.</li></ul>
    <p class="bron">Bronnen: trendartikelen van bureaus (mening), MacRumors en Infinum over Liquid Glass, Google-onderzoek over Material 3 Expressive (via secundaire berichten).</p></div>
   <div class="k"><h2>Eisen aan elk ontwerp (meetbaar)</h2>
    <h3>Toegankelijkheid</h3><ul><li>Tekstcontrast ≥ 4,5 : 1, bedieningselementen ≥ 3 : 1, in licht én donker. <b>Getest met axe.</b></li>
    <li>Tikvlakken ≥ 48 px (WCAG 2.2 vraagt minimaal 24 px).</li>
    <li>Ondersteunt tekstvergroting tot 200 % en 'minder beweging'.</li>
    <li>WCAG 2.1 AA is nu de wettelijke maat (Europese toegankelijkheidswet); 2.2 AA is ons doel.</li></ul>
    <h3>Leesbaarheid tijdens het zetten</h3><ul><li>Tijd, doel en actie zijn op een armlengte leesbaar: cijfers ≥ 22 px, ronde getallen.</li>
    <li>Tekst over een foto krijgt altijd een donkere verloop-laag (≥ 55 %), nooit blur.</li>
    <li>Geen informatie alleen via kleur.</li></ul>
    <h3>Techniek</h3><ul><li>Werkt offline. Geen laadsprongen.</li><li>Het koppenlettertype laadt alleen voor koppen (subset), met terugval op Georgia.</li></ul></div>
   <div class="k"><h2>Foto per zak</h2>
    <ul><li><b>Optioneel.</b> Zonder foto staat er een getekende zak met de naam.</li>
    <li>De foto blijft <b>op het toestel</b> (IndexedDB) en wordt verkleind: lange zijde 1080 px, WebP, ≲ 150 kB.</li>
    <li>Foto's gaan <b>niet mee in de synchronisatieblokken</b> (limiet ≈ 900 kB per blok), of alleen als kleine miniatuur.</li>
    <li>Camera of fotobibliotheek; foto's verlaten je telefoon niet (zoals BeanBench belooft).</li>
    <li>Verwijderen met één tik; ook in de back-up optioneel.</li></ul>
    <h3>Wat ik niet toepas</h3><ul><li>Glas met blur, 3D-draaiing, vloeiende achtergrondanimaties.</li><li>Foto's van anderen: alleen jouw eigen beeld en de hero-foto's die al in de repo staan.</li></ul>
    <p class="bron">Hero-foto's: de bestaande beelden van de V60 en de Chemex uit de oude app.</p></div>
  </div></div>`;
}

const boards = [
  ['bord-0-eisen', eisenBoard(), 1740],
  ['bord-1-zetten', recipeBoard('Zetten: drie richtingen, twee lettertype-opties', 'Dezelfde gegevens (22 g · 292 g · 92 °C · klik 22) in de drie gekozen richtingen. Boven: serif voor koppen; onder: alles schreefloos.', zetten), 1500],
  ['bord-2-timer', recipeBoard('Timer: één stap tegelijk met ring en "Hierna"', 'De timer blijft in alle richtingen functioneel: totale tijd, ring met aftelling, opdracht, volgende stap, grote Erdoor-knop.', timer), 1500],
  ['bord-3-zakken', zakkenBoard(), 1980]
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox', '--allow-file-access-from-files'] });
for (const [name, html, width] of boards) {
  fs.writeFileSync(path.join(OUT, name + '.html'), page(html));
  const p = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1.4 });
  await p.goto('file://' + path.join(OUT, name + '.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  await p.close();
  console.log('klaar', name);
}
await browser.close();
