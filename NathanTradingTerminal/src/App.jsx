import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS: Scalp Command Center ───────────────────────────────
const BASE_COINS = [
  { symbol:"BTC",  pair:"BTCUSDT",  cgId:"bitcoin",         vol:"High",      oi:"Flat",   sentiment:"Neutral" },
  { symbol:"ETH",  pair:"ETHUSDT",  cgId:"ethereum",        vol:"Medium",    oi:"Flat",   sentiment:"Neutral" },
  { symbol:"SOL",  pair:"SOLUSDT",  cgId:"solana",          vol:"Medium",    oi:"Down",   sentiment:"Bearish" },
  { symbol:"HYPE", pair:"HYPEUSDT", cgId:"hyperliquid",     vol:"Very High", oi:"Rising", sentiment:"Bullish" },
  { symbol:"ZEC",  pair:"ZECUSDT",  cgId:"zcash",           vol:"High",      oi:"Rising", sentiment:"Bullish" },
];

const MACRO_TEXT = "BTC.D ~60% (Mixed) | F&G: ~52 Neutral | BTC $76.9K (off ATH $126K) | HYPE ATH $64.24 kemarin - ETF inflows kuat | Goldman Sachs dump SOL ETF | ZEC whale accumulation aktif | OI BTC $7.6B · ETH $4.6B · SOL $805M";

const SCALP_SYSTEM = `Kamu adalah AI trader profesional (quant-assisted discretionary) untuk scalping crypto di Bybit Perpetual.
PROFIL: Nathan, scalper aktif, analisis mendalam, Bybit Perpetual USDT.

RISK RULES (HARD — NO EXCEPTION):
• Leverage max 20x | Entry limit only | Max 3 posisi aktif
• Setelah 2 loss berturut-turut → STOP TRADING hari itu

TIMEFRAME: HTF Bias H4 | Entry M15/M5 | WAJIB multi-TF alignment (tidak boleh konflik)

NO TRADE JIKA (STRICT FILTER):
• Tidak ada BOS/CHOCH jelas | Tidak ada liquidity sweep | Market choppy/sideways
• Ada high impact news (CPI, FOMC, dll) | Konflik besar antar indikator utama

CONFLICT RESOLUTION HIERARCHY (WAJIB IKUTI):
On-chain (BTC.D + OI + Funding) > Struktur Market > Indikator Teknikal
→ Konflik tidak bisa diselesaikan = NO TRADE

ANALISIS WAJIB (SEMUA HARUS SEARAH):
1. Market Structure: BOS/CHOCH jelas, trend H4 valid, S/R penting
2. Liquidity: Equal highs/lows — sweep HARUS terjadi sebelum entry — entry HANYA setelah sweep+rejection
3. Entry Logic: SETIAP LEVEL WAJIB ada alasan spesifik (OB/FVG/discount/premium zone) | RR min 1:2
4. Indicator (konfirmasi saja): RSI, Stochastic, MACD, Volume
5. Elliott Wave: identifikasi wave, tidak boleh invalid
6. Fundamental: tidak ada news besar, narrative pasar mendukung
7. On-Chain (PRIORITAS TINGGI):
   BTC.D naik → hindari long alt; BTC.D turun → cari long alt
   OI naik + harga naik → bullish continuation; OI naik + harga turun → bearish continuation
   Funding terlalu positif → potensi short; Funding negatif → potensi long squeeze

CONFIDENCE SCORING — checklist 10 poin (✔/✘):
1. Struktur market jelas
2. Liquidity sweep valid
3. Entry di zona optimal (OB/FVG/discount/premium)
4. RR ≥ 1:2
5. Indikator mendukung
6. Elliott Wave valid
7. Fundamental mendukung
8. BTC Dominance mendukung
9. OI mendukung
10. Funding tidak crowded

10/10 atau 9/10 = score 9/10 | 8/10 = score 8/10 | ≤7/10 = SKIP TOTAL (jangan tampilkan)
Score < 8 → TIDAK BOLEH ditampilkan. Trade management: score ≥ 8 → TP1 then SL ke BE then TP2.

FORMAT OUTPUT WAJIB (gunakan persis ini, tanpa modifikasi):

---
COIN: [PAIR]
BIAS: [LONG / SHORT]

ALASAN:
[1 paragraf konkret: struktur + liquidity + on-chain + wave — tidak ambigu]

ENTRY: $X,XXX — [alasan level: OB/FVG/discount zone/dll]
SL: $X,XXX — [alasan: di luar struktur apa / invalidation point mana]
TP1: $X,XXX — [target liquidity / resistance mana]
TP2: $X,XXX — [extension target mana]

CHECKLIST:
✔/✘ Struktur market jelas
✔/✘ Liquidity sweep valid
✔/✘ Entry di zona optimal
✔/✘ RR ≥ 1:2
✔/✘ Indikator mendukung
✔/✘ Elliott Wave valid
✔/✘ Fundamental mendukung
✔/✘ BTC.D mendukung
✔/✘ OI mendukung
✔/✘ Funding tidak crowded

SCORE: X/10
RISK: [perhitungan size/posisi singkat]
INVALIDASI: [kondisi spesifik yang batalkan setup]
TIME LIMIT: [X jam — reasoning kenapa batas waktu segitu]
RE-ENTRY: [kondisi boleh entry ulang jika kena SL]
CONFIDENCE: [TP1 only / TP1 + TP2]
---

Jika tidak ada setup yang memenuhi standar: ⛔ NO VALID SETUP — [alasan singkat]. Maksimal 3 setup.`;

// ─── CONSTANTS: Rothschild's Terminal ──────────────────────────────
const AGENTS = [
  { id:"scanner",    label:"SCANNER",     icon:"⬡", accent:"#00ff88", desc:"Setup identification"   },
  { id:"regime",     label:"REGIME",      icon:"◎", accent:"#2299ff", desc:"Market classification"  },
  { id:"smartmoney", label:"SMART MONEY", icon:"◆", accent:"#aa44ff", desc:"Institutional tracking" },
  { id:"risk",       label:"RISK",        icon:"▲", accent:"#ff9900", desc:"Trade challenge"        },
  { id:"execution",  label:"EXECUTION",   icon:"◈", accent:"#00ffcc", desc:"Execution optimization" },
];

const SCORE_BREAKDOWN = [
  { key:"trend_strength",      label:"Trend Strength", max:25, color:"#00ff88" },
  { key:"open_interest",       label:"Open Interest",  max:20, color:"#2299ff" },
  { key:"liquidity",           label:"Liquidity",      max:15, color:"#aa44ff" },
  { key:"funding",             label:"Funding Rate",   max:10, color:"#ff9900" },
  { key:"smart_money",         label:"Smart Money",    max:15, color:"#ffcc00" },
  { key:"technical_structure", label:"Technical",      max:15, color:"#00ffcc" },
];

// Agent prompts
const P = {
  scanner: (ctx) =>
    `You are the Scanner Agent in a Bybit perpetual futures scalping system.
Extract the asset name, timeframe, and current price from the market data below.
Market Data:\n${ctx}

STRICT FILTERS: Reject if — low liquidity, weak OI confirmation, no derivatives signal, RR < 1:2, manipulated candles.

Return ONLY valid JSON, no markdown, no preamble:
{"verdict":"CANDIDATE|WEAK|REJECT","setup_type":"TREND_CONTINUATION|LIQUIDITY_SWEEP|BREAKOUT|MEAN_REVERSION|NONE","liquidity_score":0-100,"momentum_score":0-100,"derivatives_score":0-100,"rr_estimate":"1:X","filter_passed":true,"key_signals":["signal1","signal2","signal3"],"rejection_reason":null,"summary":"2-sentence verdict"}`,

  regime: (ctx, prev) =>
    `You are the Market Regime Agent in a Bybit perpetual futures scalping system.
Scanner result: ${JSON.stringify(prev.scanner || {})}
Market Data:\n${ctx}

Return ONLY valid JSON:
{"regime":"BULLISH_TREND|BEARISH_TREND|RANGING|VOLATILITY_EXPANSION|MEAN_REVERSION","directional_bias":"LONG|SHORT|NEUTRAL","bias_strength":0-100,"mtf_alignment":{"m5":"BULL|BEAR|NEUTRAL","m15":"BULL|BEAR|NEUTRAL","h1":"BULL|BEAR|NEUTRAL","h4":"BULL|BEAR|NEUTRAL"},"continuation_probability":0-100,"key_support":"price","key_resistance":"price","summary":"2-sentence regime analysis"}`,

  smartmoney: (ctx, prev) =>
    `You are the Smart Money Agent in a Bybit perpetual futures scalping system.
Pipeline so far: ${JSON.stringify({ scanner: prev.scanner, regime: prev.regime })}
Market Data:\n${ctx}

Return ONLY valid JSON:
{"sm_bias":"ACCUMULATING|DISTRIBUTING|NEUTRAL|MANIPULATING","whale_activity":"HIGH|MODERATE|LOW","exchange_flow":"STRONG_OUTFLOW|OUTFLOW|NEUTRAL|INFLOW|STRONG_INFLOW","top_trader_lean":"HEAVILY_LONG|MOSTLY_LONG|BALANCED|MOSTLY_SHORT|HEAVILY_SHORT","crowded_trade_risk":0-100,"manipulation_probability":0-100,"liquidation_hunt_risk":"HIGH|MODERATE|LOW","sm_aligned_with_bias":true,"sm_score":0-100,"flags":[],"summary":"2-sentence smart money read"}`,

  risk: (ctx, prev) =>
    `You are the Risk Agent in a Bybit perpetual futures scalping system.
Your job is to CHALLENGE this setup with maximum scrutiny. Capital preservation is priority #1.
Full pipeline: ${JSON.stringify(prev)}
Market Data:\n${ctx}

Be the devil's advocate. Find every reason to reject. Return ONLY valid JSON:
{"risk_verdict":"APPROVED|CAUTION|REJECTED","fake_breakout_prob":0-100,"liquidity_trap_prob":0-100,"overextension_risk":0-100,"funding_risk":0-100,"crowding_risk":0-100,"overall_risk":0-100,"risk_flags":["flag1"],"adjusted_confidence":0-100,"trade_quality_scores":{"trend_strength":0-25,"open_interest":0-20,"liquidity":0-15,"funding":0-10,"smart_money":0-15,"technical_structure":0-15},"risk_report":"3-4 sentence risk verdict"}`,

  execution: (ctx, prev) =>
    `You are the Execution Agent in a Bybit perpetual futures scalping system.
Extract the asset name and current price from the market data below.
Full pipeline: ${JSON.stringify(prev)}
Market Data:\n${ctx}

CONSTRAINTS: SL <= 2% spot move, leverage >= 10x, margin >= $10, RR >= 1:2.
In telegram_signal.coin use the correct ticker extracted from market data (format: XYZUSDT).
Return ONLY valid JSON:
{"direction":"LONG|SHORT","entry_type":"MARKET|LIMIT","entry":"price","sl":"price","tp1":"price","tp2":"price or null","tp3":"price or null","leverage":10,"margin":10,"sl_pct":1.5,"rr":"1:2","invalidation":"one sentence","notes":"2-3 execution tips","telegram_signal":{"coin":"XYZUSDT","bias":"LONG|SHORT","entry":"price","sl":"price","tp1":"price","tp2":"price or null","confidence":75,"risk_warning":"one key risk"}}`,
};

const generateSample = (coin = "BTC", rawPrice = 67450) => {
  const p = parseFloat(rawPrice) || 67450;
  const fmt = (n) => Math.round(n).toLocaleString();
  return `${coin}/USDT PERPETUAL — BYBIT
Current Price: $${fmt(p)}
Analysis Timeframe: 15M

--- DERIVATIVES DATA ---
Open Interest: $12.8B (+1.9% in 1h, rising steadily with price)
OI Trend: Healthy expansion — longs building alongside spot inflow
Funding Rate: +0.009% (mild long skew, well below extreme threshold)
Long/Short Ratio: 1.21 (slight long dominance, not crowded)
Futures Volume 24h: $34.2B (12% above 30-day average)
Current Candle Volume: 2.3x average (momentum confirmed)

--- LIQUIDATIONS ---
Longs Liquidated (1h): $9.4M
Shorts Liquidated (1h): $2.3M
Liquidation Cluster Above: $${fmt(p * 1.018)}
Liquidation Cluster Below: $${fmt(p * 0.982)}
Cascade Risk: Low — clusters are spread out, no stacking

--- EXCHANGE FLOWS ---
Net Exchange Flow (4h): -2,140 ${coin} (outflow — bullish signal)
Whale Transactions >$500K (4h): 5 large buys, 1 large sell
Top Trader Long/Short: 58% long / 42% short
Stablecoin Flow: +$320M USDT into exchanges (buy pressure building)

--- TECHNICAL INDICATORS (15M) ---
RSI (14): 55 (neutral-bullish, room to run)
MACD: Bullish crossover confirmed, histogram expanding
Stochastic RSI: 63 (not overbought, mid-range)
EMA 20/50/200: All below current price (aligned bullish stack)
Volume Profile: POC at $${fmt(p * 0.997)}, value area trending higher
Bollinger Bands: Price near mid-upper range, not overextended

--- MARKET STRUCTURE ---
Trend (1H): Bullish — series of higher highs and higher lows
Recent Pattern: Bull flag consolidation (3h) approaching apex
Key Resistance: $${fmt(p * 1.013)} (liquidity pool above)
Key Support: $${fmt(p * 0.988)} (demand zone, tested and held twice)
Spread: 0.01% (tight — good liquidity)
Market Depth: Deep — top 15 assets by perpetual volume

--- SENTIMENT ---
Fear & Greed Index: 63 (Greed — not extreme)
Social Volume: Moderate — no euphoria detected
BTC Dominance: 53.2% (slightly declining — mild altcoin rotation)
Recent News: No major macro catalysts — organic price structure`;
};

// ─── SHARED UTILS ──────────────────────────────────────────────────
const fp = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
};

const calcRR = (entry, sl, tp) => {
  const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp);
  if (!e || !s || !t) return null;
  const risk = Math.abs(e - s), reward = Math.abs(t - e);
  return risk > 0 ? (reward / risk).toFixed(2) : null;
};

const S_KEY = "unified_journal_v1";
const loadJ = async () => {
  try { const raw = localStorage.getItem(S_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};
const saveJ = async (j) => {
  try { localStorage.setItem(S_KEY, JSON.stringify(j)); } catch {}
};

// ─── SCALP PLAN COMPONENTS ────────────────────────────────────────
function parseSetups(text) {
  const setups = [];
  const blocks = text.split(/\n---+\n/);
  for (const b of blocks) {
    const coin = b.match(/COIN:\s*([A-Z0-9]+)/i)?.[1]?.toUpperCase();
    const bias = b.match(/BIAS:\s*(LONG|SHORT)/i)?.[1]?.toUpperCase();
    const score = parseInt(b.match(/SCORE:\s*(\d+)\s*\/\s*10/i)?.[1] || "0");
    if (!coin || !bias || score < 8) continue;
    const pn = (rx) => { const m = b.match(rx); return m ? parseFloat(m[1].replace(/,/g, "")) : null; };
    setups.push({
      pair: coin, direction: bias, score,
      entry: pn(/ENTRY:\s*\$?([\d,]+\.?\d*)/i),
      sl: pn(/\nSL:\s*\$?([\d,]+\.?\d*)/i),
      tp1: pn(/TP1:\s*\$?([\d,]+\.?\d*)/i),
      tp2: pn(/TP2:\s*\$?([\d,]+\.?\d*)/i),
    });
  }
  return setups;
}

function ScoreBar({ score }) {
  const color = score >= 9 ? "#3fb950" : score >= 8 ? "#f0883e" : "#f85149";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"6px 0" }}>
      <div style={{ display:"flex", gap:2 }}>
        {Array.from({ length:10 }, (_, i) => (
          <div key={i} style={{ width:16, height:4, borderRadius:2, background: i < score ? color : "#1c2631" }} />
        ))}
      </div>
      <span style={{ fontSize:13, fontWeight:700, color }}>{score}/10</span>
    </div>
  );
}

function PlanBlock({ block, setup, added, onAdd }) {
  const lines = block.trim().split("\n");
  return (
    <div style={{ marginBottom:4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height:3 }} />;
        if (/^⛔/.test(line)) return <div key={i} style={{ fontSize:13, color:"#f0883e", fontWeight:700, margin:"16px 0" }}>{line}</div>;
        if (/^COIN:/i.test(line)) {
          return <div key={i} style={{ fontSize:14, fontWeight:700, color:"#dde4ec", marginBottom:5, letterSpacing:"0.02em" }}>◆ {line.replace(/^COIN:\s*/i,"")}</div>;
        }
        if (/^BIAS:/i.test(line)) {
          const val = line.replace(/^BIAS:\s*/i,"").trim();
          const isLong = /LONG/i.test(val);
          return (
            <div key={i} style={{ display:"inline-block", padding:"3px 12px", borderRadius:4, marginBottom:10, background: isLong ? "#3fb95020" : "#f8514920", border:`1px solid ${isLong ? "#3fb95077" : "#f8514977"}`, color: isLong ? "#3fb950" : "#f85149", fontSize:11, fontWeight:700 }}>
              {isLong ? "▲ LONG" : "▼ SHORT"}
            </div>
          );
        }
        if (/^SCORE:/i.test(line)) {
          const score = parseInt(line.match(/(\d+)/)?.[1] || "0");
          return <div key={i}><ScoreBar score={score} /></div>;
        }
        if (/^CHECKLIST:/i.test(line)) return <div key={i} style={{ fontSize:9, color:"#c9d1d9", marginTop:10, marginBottom:3, letterSpacing:"0.12em" }}>CHECKLIST</div>;
        if (/^ALASAN:/i.test(line)) return <div key={i} style={{ fontSize:9, color:"#c9d1d9", marginTop:10, marginBottom:3, letterSpacing:"0.12em" }}>ALASAN</div>;
        if (/^[✔✘]/.test(line)) {
          const ok = line.startsWith("✔");
          return (
            <div key={i} style={{ fontSize:11, display:"flex", alignItems:"center", gap:5, lineHeight:"1.8", color: ok ? "#3fb950" : "#f85149" }}>
              <span>{ok ? "✔" : "✘"}</span>
              <span style={{ color: ok ? "#c9d1d9" : "#7d4040" }}>{line.slice(2)}</span>
            </div>
          );
        }
        const kv = line.match(/^(ENTRY|SL|TP1|TP2|RISK|INVALIDASI|TIME LIMIT|RE-ENTRY|CONFIDENCE):\s*(.*)/i);
        if (kv) {
          const key = kv[1].toUpperCase(), val = kv[2];
          const kc = { ENTRY:"#00e5ff", SL:"#f85149", TP1:"#3fb950", TP2:"#3fb950aa", RISK:"#f0883e", INVALIDASI:"#f85149aa", "TIME LIMIT":"#c9d1d9", "RE-ENTRY":"#c9d1d9", CONFIDENCE:"#00e5ff" }[key] || "#c9d1d9";
          return (
            <div key={i} style={{ fontSize:12, display:"flex", gap:8, lineHeight:"1.85", marginBottom:1 }}>
              <span style={{ color:kc, fontWeight:700, minWidth:96, flexShrink:0 }}>{key}</span>
              <span style={{ color:"#e6edf3", flex:1 }}>{val}</span>
            </div>
          );
        }
        return <div key={i} style={{ fontSize:12, color:"#e6edf3", lineHeight:"1.7" }}>{line}</div>;
      })}
      {setup && (
        <div style={{ marginTop:14, padding:"10px 14px", background: added ? "#101a10" : "#081408", border:`1px solid ${added ? "#3fb95030" : "#3fb95080"}`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:11 }}>
            <span style={{ color:"#3fb950", fontWeight:700 }}>✦ {setup.score}/10 · {setup.direction}</span>
            {setup.entry && <span style={{ color:"#556070", marginLeft:10 }}>Entry ${fp(setup.entry)}</span>}
            {setup.sl && <span style={{ color:"#556070" }}> · SL ${fp(setup.sl)}</span>}
            {setup.tp1 && <span style={{ color:"#556070" }}> · TP1 ${fp(setup.tp1)}</span>}
          </div>
          <button onClick={() => !added && onAdd(setup)} style={{ padding:"5px 14px", borderRadius:4, fontFamily:"inherit", fontSize:10, fontWeight:700, cursor: added ? "default" : "pointer", border:`1px solid ${added ? "#3fb95030" : "#3fb950"}`, background: added ? "transparent" : "#3fb95018", color: added ? "#3a5a3a" : "#3fb950" }}>
            {added ? "✓ ADDED TO JOURNAL" : "+ ADD TO JOURNAL"}
          </button>
        </div>
      )}
    </div>
  );
}

function PlanRenderer({ text, addedPairs, onAdd }) {
  if (!text) return null;
  const setups = parseSetups(text);
  const setupMap = {};
  setups.forEach(s => { setupMap[s.pair] = s; });
  if (/NO VALID SETUP/i.test(text) && setups.length === 0) {
    return (
      <div style={{ padding:"30px 0", textAlign:"center" }}>
        <div style={{ fontSize:14, color:"#f0883e", fontWeight:700, marginBottom:6 }}>⛔ NO VALID SETUP</div>
        <div style={{ fontSize:12, color:"#e6edf3" }}>{text.replace(/⛔\s*NO VALID SETUP\s*[—-]?\s*/i,"").trim()}</div>
      </div>
    );
  }
  const blocks = text.split(/\n---+\n/);
  return (
    <div>
      {blocks.map((block, bi) => {
        const coinMatch = block.match(/COIN:\s*([A-Z0-9]+)/i);
        const pair = coinMatch?.[1]?.toUpperCase();
        const setup = pair ? setupMap[pair] : null;
        const added = setup ? addedPairs.has(setup.pair) : false;
        return (
          <div key={bi}>
            {bi > 0 && <hr style={{ border:"none", borderTop:"1px solid #131a22", margin:"16px 0" }} />}
            <PlanBlock block={block} setup={setup} added={added} onAdd={onAdd} />
          </div>
        );
      })}
    </div>
  );
}

// ─── JOURNAL COMPONENTS ───────────────────────────────────────────
function JournalForm({ prefill, editIdx, onSave, onCancel, timeframe }) {
  const init = prefill || { pair:"", direction:"Long", confidence:0, entry:"", sl:"", tp1:"", tp2:"", result:"", pnl:"", timeframe: timeframe || "5m", notes:"" };
  const [f, setF] = useState(init);
  const set = (k, v) => setF(p => ({ ...p, [k]:v }));
  const rr = calcRR(f.entry, f.sl, f.tp1);
  const rrNum = rr ? parseFloat(rr) : 0;
  const pnlNum = parseFloat(f.pnl) || 0;
  const pnlWarnLoss = f.result === "Loss" && pnlNum > 0;
  const pnlWarnWin = f.result === "Win" && pnlNum < 0;

  const handleResult = (v) => {
    setF(p => {
      let pnl = parseFloat(p.pnl) || 0;
      if (v === "Loss" && pnl > 0) pnl = -Math.abs(pnl);
      if (v === "Win" && pnl < 0) pnl = Math.abs(pnl);
      if (v === "BE") pnl = 0;
      return { ...p, result:v, pnl: pnl === 0 ? "0" : pnl.toString() };
    });
  };

  const handleSave = () => {
    if (!f.pair || !f.result) return;
    let pnl = parseFloat(f.pnl) || 0;
    if (f.result === "Loss") pnl = -Math.abs(pnl);
    else if (f.result === "Win") pnl = Math.abs(pnl);
    else pnl = 0;
    onSave({ ...f, pnl, entry: parseFloat(f.entry) || 0, sl: parseFloat(f.sl) || 0, tp1: parseFloat(f.tp1) || 0, tp2: parseFloat(f.tp2) || 0, confidence: parseInt(f.confidence) || 0,
      date: f.date || new Date().toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" }),
      time: f.time || new Date().toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" }),
    }, editIdx);
  };

  const IS = { background:"#070b0f", border:"1px solid #1c2631", color:"#c9d1d9", padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:12, width:"100%", outline:"none" };
  const LS = { fontSize:9, color:"#4a5568", marginBottom:4, letterSpacing:"0.1em" };
  const rc = f.result === "Win" ? "#3fb950" : f.result === "Loss" ? "#f85149" : f.result === "BE" ? "#f0883e" : "#1c2631";

  return (
    <div style={{ background:"#080f14", border:"1px solid #1a3040", borderRadius:8, padding:16, marginBottom:14 }}>
      <div style={{ fontSize:11, color:"#00e5ff", fontWeight:700, marginBottom:12, letterSpacing:"0.06em" }}>
        {prefill ? "◎ ADD TRADE FROM PLAN" : editIdx !== null ? "✎ EDIT TRADE" : "+ LOG TRADE MANUAL"}
      </div>
      {prefill && <div style={{ fontSize:10, color:"#3fb950", background:"#3fb95010", border:"1px solid #3fb95033", borderRadius:4, padding:"5px 10px", marginBottom:12 }}>✦ Auto-filled dari plan — isi Result dan PnL setelah trade selesai</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <div><div style={LS}>PAIR</div><input style={IS} value={f.pair} onChange={e => set("pair", e.target.value.toUpperCase())} placeholder="BTCUSDT" /></div>
        <div><div style={LS}>DIRECTION</div><select style={IS} value={f.direction} onChange={e => set("direction", e.target.value)}><option>Long</option><option>Short</option></select></div>
        <div><div style={LS}>CONFIDENCE</div><input style={{ ...IS, borderColor: f.confidence >= 8 ? "#3fb95055" : "#1c2631", color: f.confidence >= 8 ? "#3fb950" : "#c9d1d9" }} type="number" min="1" max="10" value={f.confidence} onChange={e => set("confidence", e.target.value)} /></div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <div><div style={LS}>ENTRY $</div><input style={IS} type="number" value={f.entry} onChange={e => set("entry", e.target.value)} /></div>
        <div><div style={LS}>STOP LOSS $</div><input style={{ ...IS, borderColor: f.sl ? "#f8514933" : "#1c2631" }} type="number" value={f.sl} onChange={e => set("sl", e.target.value)} /></div>
        <div>
          <div style={LS}>TP1 $ {rr && <span style={{ marginLeft:4, color: rrNum >= 2 ? "#3fb950" : "#f85149" }}>RR 1:{rr}</span>}</div>
          <input style={{ ...IS, borderColor: rr ? (rrNum >= 2 ? "#3fb95055" : "#f8514955") : "#1c2631" }} type="number" value={f.tp1} onChange={e => set("tp1", e.target.value)} />
        </div>
        <div><div style={LS}>TP2 $ (opsional)</div><input style={IS} type="number" value={f.tp2} onChange={e => set("tp2", e.target.value)} /></div>
      </div>
      {rr && <div style={{ fontSize:11, padding:"5px 10px", borderRadius:4, marginBottom:10, background: rrNum >= 2 ? "#3fb95010" : "#f8514910", border:`1px solid ${rrNum >= 2 ? "#3fb95033" : "#f8514933"}`, color: rrNum >= 2 ? "#3fb950" : "#f85149" }}>{rrNum >= 2 ? "✔" : "✘"} RR aktual 1:{rr} {rrNum >= 2 ? "— memenuhi minimum 1:2" : "— kurang dari minimum 1:2"}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <div><div style={LS}>RESULT</div>
          <select style={{ ...IS, borderColor:`${rc}66`, color: f.result ? rc : "#c9d1d9" }} value={f.result} onChange={e => handleResult(e.target.value)}>
            <option value="">— pilih —</option><option value="Win">Win</option><option value="Loss">Loss</option><option value="BE">Break Even</option>
          </select>
        </div>
        <div><div style={LS}>PnL (USDT)</div><input style={{ ...IS, borderColor:(pnlWarnLoss || pnlWarnWin) ? "#f0883e66" : "#1c2631" }} type="number" step="0.01" value={f.pnl} onChange={e => set("pnl", e.target.value)} placeholder="±0.00" /></div>
        <div><div style={LS}>TIMEFRAME</div><select style={IS} value={f.timeframe} onChange={e => set("timeframe", e.target.value)}>{["1m","3m","5m","15m","1h","4h"].map(t => <option key={t}>{t}</option>)}</select></div>
      </div>
      {(pnlWarnLoss || pnlWarnWin) && <div style={{ fontSize:10, color:"#f0883e", background:"#f0883e0a", border:"1px solid #f0883e33", borderRadius:4, padding:"5px 10px", marginBottom:10 }}>⚠ PnL {pnlWarnLoss ? "positif tapi result Loss" : "negatif tapi result Win"} — akan otomatis dikoreksi saat disimpan</div>}
      <div style={{ marginBottom:10 }}><div style={LS}>NOTES</div><textarea style={{ ...IS, resize:"vertical", minHeight:52 }} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Setup name, mistake, lesson learned..." /></div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={handleSave} disabled={!f.pair || !f.result} style={{ padding:"8px 18px", borderRadius:5, fontFamily:"inherit", fontSize:11, fontWeight:700, cursor:!f.pair || !f.result ? "not-allowed" : "pointer", background:"#00e5ff18", border:"1px solid #00e5ff66", color:"#00e5ff", opacity:!f.pair || !f.result ? 0.4 : 1 }}>
          {editIdx !== null ? "SIMPAN PERUBAHAN" : "SIMPAN TRADE"}
        </button>
        <button onClick={onCancel} style={{ padding:"8px 14px", borderRadius:5, fontFamily:"inherit", fontSize:11, cursor:"pointer", background:"transparent", border:"1px solid #1c2631", color:"#556070" }}>BATAL</button>
      </div>
    </div>
  );
}

function JournalCard({ entry, idx, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const rr = calcRR(entry.entry, entry.sl, entry.tp1);
  const rrNum = rr ? parseFloat(rr) : 0;
  const bc = entry.result === "Win" ? "#3fb95020" : entry.result === "Loss" ? "#f8514920" : "#1c2631";
  return (
    <div style={{ background:"#0d1117", border:`1px solid ${bc}`, borderRadius:8, padding:"11px 14px", marginBottom:8 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#dde4ec" }}>{entry.pair}</span>
            {[
              { val: entry.direction === "Long" ? "▲ LONG" : "▼ SHORT", c: entry.direction === "Long" ? "#3fb950" : "#f85149" },
              { val: entry.result === "Win" ? "✔ WIN" : entry.result === "Loss" ? "✘ LOSS" : "◯ BE", c: entry.result === "Win" ? "#3fb950" : entry.result === "Loss" ? "#f85149" : "#f0883e" },
            ].map((b, bi) => <span key={bi} style={{ fontSize:10, padding:"2px 8px", borderRadius:3, fontWeight:700, background:`${b.c}18`, border:`1px solid ${b.c}44`, color:b.c }}>{b.val}</span>)}
            {entry.confidence >= 8 && <span style={{ fontSize:9, color:"#00e5ff66", padding:"2px 7px", borderRadius:3, border:"1px solid #00e5ff22" }}>{entry.confidence}/10</span>}
          </div>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", fontSize:11, color:"#556070", marginBottom: entry.notes ? 4 : 0 }}>
            {entry.entry > 0 && <span>Entry <span style={{ color:"#c9d1d9" }}>${fp(entry.entry)}</span></span>}
            {entry.sl > 0 && <span>SL <span style={{ color:"#f85149" }}>${fp(entry.sl)}</span></span>}
            {entry.tp1 > 0 && <span>TP1 <span style={{ color:"#3fb950" }}>${fp(entry.tp1)}</span></span>}
            {rr && <span>RR <span style={{ color: rrNum >= 2 ? "#3fb950" : "#f0883e" }}>1:{rr}</span></span>}
            {entry.timeframe && <span>{entry.timeframe}</span>}
            {entry.date && <span style={{ color:"#3a4050" }}>{entry.date}{entry.time ? " " + entry.time : ""}</span>}
          </div>
          {entry.notes && <div style={{ fontSize:11, color:"#3a5060", marginTop:3 }}>{entry.notes}</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color: entry.pnl > 0 ? "#3fb950" : entry.pnl < 0 ? "#f85149" : "#556070" }}>
            {entry.pnl > 0 ? "+" : ""}{(entry.pnl || 0).toFixed(2)}
          </div>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={() => onEdit(idx)} style={{ padding:"3px 9px", borderRadius:3, fontFamily:"inherit", fontSize:9, cursor:"pointer", background:"#00e5ff10", border:"1px solid #00e5ff33", color:"#00e5ff88" }}>✎ Edit</button>
            {!confirm
              ? <button onClick={() => setConfirm(true)} style={{ padding:"3px 9px", borderRadius:3, fontFamily:"inherit", fontSize:9, cursor:"pointer", background:"#f8514910", border:"1px solid #f8514933", color:"#f8514988" }}>✕ Hapus</button>
              : <span style={{ display:"flex", gap:3 }}>
                  <button onClick={() => onDelete(idx)} style={{ padding:"3px 9px", borderRadius:3, fontFamily:"inherit", fontSize:9, cursor:"pointer", background:"#f8514920", border:"1px solid #f85149", color:"#f85149", fontWeight:700 }}>Hapus!</button>
                  <button onClick={() => setConfirm(false)} style={{ padding:"3px 9px", borderRadius:3, fontFamily:"inherit", fontSize:9, cursor:"pointer", background:"transparent", border:"1px solid #1c2631", color:"#556070" }}>Batal</button>
                </span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROTHSCHILD AGENT PIPELINE COMPONENTS ─────────────────────────
function AgentPipelineSidebar({ statuses, results, activeId, setActive, score, scoreInfo }) {
  const MN = { fontFamily:"'Share Tech Mono', monospace" };
  const sColor = (id) => {
    const s = statuses[id];
    return s === "done" ? "#00ff88" : s === "running" ? "#ffcc00" : s === "error" ? "#ff2255" : "#474768";
  };
  const agentChip = (id, r) => {
    if (!r) return null;
    const map = {
      scanner:    { v: r.verdict, c: r.verdict === "CANDIDATE" ? "#00ff88" : r.verdict === "WEAK" ? "#ffcc00" : "#ff2255" },
      regime:     { v: r.regime?.replace(/_/g," "), c:"#2299ff" },
      smartmoney: { v: r.sm_bias, c:"#aa44ff" },
      risk:       { v: r.risk_verdict, c: r.risk_verdict === "APPROVED" ? "#00ff88" : r.risk_verdict === "CAUTION" ? "#ffcc00" : "#ff2255" },
      execution:  { v: r.direction ? `${r.direction}  ${r.rr}` : null, c: r.direction === "LONG" ? "#00ff88" : "#ff2255" },
    };
    return map[id];
  };
  return (
    <div style={{ padding:"14px 10px", overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
      <div style={{ fontSize:10, letterSpacing:2, color:"#8888b8", fontWeight:700, textTransform:"uppercase", fontFamily:"'Rajdhani', sans-serif", marginBottom:8, paddingLeft:2 }}>Pipeline</div>
      {AGENTS.map((agent, i) => {
        const done = statuses[agent.id] === "done";
        const actv = statuses[agent.id] === "running";
        const chip = agentChip(agent.id, results[agent.id]);
        return (
          <div key={agent.id}>
            <div onClick={() => results[agent.id] && setActive(agent.id)} style={{ padding:"8px 8px", background: activeId === agent.id ? `${agent.accent}0e` : "transparent", border:`1px solid ${(activeId === agent.id || done) ? agent.accent + "44" : "#1a1a30"}`, borderRadius:2, cursor: results[agent.id] ? "pointer" : "default", opacity:!Object.keys(results).length && i > 0 ? 0.35 : 1, transition:"all 0.2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13, minWidth:16, color: done ? agent.accent : actv ? "#ffcc00" : "#474768", animation: actv ? "pulse 0.9s infinite" : "none" }}>{agent.icon}</span>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color: done ? agent.accent : actv ? "#ffcc00" : "#dde0f0" }}>{agent.label}</div>
                  <div style={{ fontSize:9, color:"#7070a0", marginTop:1 }}>{agent.desc}</div>
                </div>
              </div>
              {chip?.v && <div style={{ marginTop:4, paddingLeft:22 }}><span style={{ ...MN, fontSize:9.5, color:chip.c }}>{chip.v}</span></div>}
            </div>
            {i < AGENTS.length - 1 && <div style={{ width:1, height:8, marginLeft:16, background: done ? agent.accent + "55" : "#1a1a30", transition:"background 0.5s" }} />}
          </div>
        );
      })}
      {results.risk?.trade_quality_scores && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#8888b8", fontWeight:700, textTransform:"uppercase", fontFamily:"'Rajdhani', sans-serif", marginBottom:6, paddingLeft:2 }}>Score</div>
          {SCORE_BREAKDOWN.map(({ key, label, max, color }) => {
            const val = results.risk.trade_quality_scores[key] || 0;
            return (
              <div key={key} style={{ marginBottom:5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:9, fontWeight:600, color:"#6868a0", textTransform:"uppercase" }}>{label}</span>
                  <span style={{ ...MN, fontSize:9, color }}>{val}/{max}</span>
                </div>
                <div style={{ height:2, background:"#1a1a30", borderRadius:1 }}>
                  <div style={{ height:"100%", width:`${(val/max)*100}%`, background:color, borderRadius:1, transition:"width 0.7s ease" }} />
                </div>
              </div>
            );
          })}
          {scoreInfo && (
            <div style={{ marginTop:8, padding:"4px 6px", border:`1px solid ${scoreInfo.color}33`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ ...MN, fontSize:11, color:scoreInfo.color }}>{score}/100</span>
              <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:10, fontWeight:700, letterSpacing:1.5, color:scoreInfo.color }}>{scoreInfo.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RothschildSignal({ results, score, scoreInfo, onNewAnalysis }) {
  const MN = { fontFamily:"'Share Tech Mono', monospace" };
  const LS = { fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:"#8888b8", fontWeight:700, fontFamily:"'Rajdhani', sans-serif" };
  const exec = results.execution;
  const riskRes = results.risk;
  if (!exec) return <div style={{ color:"#474768", ...MN, textAlign:"center", paddingTop:60 }}>Signal not yet generated. Run the pipeline first.</div>;

  const sig = exec.telegram_signal || {};
  const dir = (sig.bias || exec.direction) === "LONG" ? "#00ff88" : "#ff2255";
  const conf = Number(sig.confidence || 0);

  return (
    <div style={{ maxWidth:560 }}>
      {scoreInfo && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", background:`${scoreInfo.color}0c`, border:`1px solid ${scoreInfo.color}33`, marginBottom:12, borderRadius:4 }}>
          <div>
            <div style={{ ...LS, color:scoreInfo.color, marginBottom:4 }}>System Score</div>
            <div style={{ fontFamily:"'Orbitron', monospace", fontSize:44, fontWeight:900, color:scoreInfo.color, lineHeight:1 }}>{score}</div>
            <div style={{ ...MN, fontSize:9, color:"#474768", marginTop:3 }}>/ 100 POINTS</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"'Orbitron', monospace", fontSize:20, fontWeight:900, color:scoreInfo.color, letterSpacing:4 }}>{scoreInfo.label}</div>
            <div style={{ ...LS, marginTop:6 }}>Execution Decision</div>
            <div style={{ ...MN, fontSize:9.5, color:"#474768", marginTop:5 }}>
              {score >= 80 ? "All criteria met — execute with discipline" : score >= 70 ? "Monitor — conditions borderline" : "Stand down — criteria not met"}
            </div>
          </div>
        </div>
      )}
      {riskRes?.trade_quality_scores && (
        <div style={{ padding:"12px 16px", background:"#0f0f22", border:"1px solid #1a1a30", marginBottom:12, borderRadius:4 }}>
          <div style={{ ...LS, marginBottom:10 }}>Score Breakdown</div>
          {SCORE_BREAKDOWN.map(({ key, label, max, color }) => {
            const val = riskRes.trade_quality_scores[key] || 0;
            return (
              <div key={key} style={{ marginBottom:7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontFamily:"'Rajdhani', sans-serif", fontSize:11, fontWeight:600, color:"#7070a0", textTransform:"uppercase" }}>{label}</span>
                  <span style={{ ...MN, fontSize:11, color }}>{val}/{max}</span>
                </div>
                <div style={{ height:3, background:"#1a1a30", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${(val/max)*100}%`, background:color, borderRadius:2, transition:"width 0.7s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ background:"#0f0f22", border:"1px solid #262644", marginBottom:12, borderRadius:4 }}>
        <div style={{ padding:"9px 16px", borderBottom:"1px solid #1a1a30", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0a0a18" }}>
          <div style={LS}>Signal Output - Telegram Format</div>
          <span style={{ ...MN, fontSize:10.5, color:"#7070a0" }}>BYBIT PERP  SCALP</span>
        </div>
        <div style={{ padding:"14px 18px", ...MN, fontSize:12.5, lineHeight:2.4 }}>
          {[
            ["COIN",  sig.coin || "—",          "#dde0f0", true ],
            ["BIAS",  sig.bias || exec.direction, dir,      true ],
            ["ENTRY", sig.entry || exec.entry,   "#dde0f0", false],
            ["SL",    sig.sl || exec.sl,         "#ff2255", false],
            ["TP1",   sig.tp1 || exec.tp1,       "#00ff88", false],
            ...((sig.tp2 || exec.tp2) ? [["TP2", sig.tp2 || exec.tp2, "#00ff88", false]] : []),
            ...((sig.tp3 || exec.tp3) ? [["TP3", sig.tp3 || exec.tp3, "#00ff88", false]] : []),
          ].map(([k, v, c, bold]) => (
            <div key={k} style={{ display:"flex" }}>
              <span style={{ color:"#6868a0", minWidth:90 }}>{k}</span>
              <span style={{ color:c, fontWeight: bold ? 700 : 400 }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop:"1px solid #1a1a30", margin:"4px 0 0" }} />
          {[
            ["LEVERAGE", `${exec.leverage}x`,    "#ffcc00"],
            ["MARGIN",   `$${exec.margin} USDT`, "#dde0f0"],
            ["R:R",      exec.rr,                "#00ffcc"],
            ["CONF",     `${conf}%`,             conf >= 70 ? "#00ff88" : conf >= 50 ? "#ffcc00" : "#ff2255"],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display:"flex" }}>
              <span style={{ color:"#6868a0", minWidth:90 }}>{k}</span>
              <span style={{ color:c }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop:"1px solid #1a1a30", margin:"4px 0 0" }} />
          <div style={{ display:"flex", alignItems:"flex-start" }}>
            <span style={{ color:"#6868a0", minWidth:90, flexShrink:0 }}>RISK</span>
            <span style={{ color:"#ff9900", fontSize:11.5, lineHeight:1.5 }}>{sig.risk_warning}</span>
          </div>
          {exec.invalidation && <div style={{ display:"flex", alignItems:"flex-start" }}>
            <span style={{ color:"#6868a0", minWidth:90, flexShrink:0 }}>VOID IF</span>
            <span style={{ color:"#7070a0", fontSize:11.5, lineHeight:1.5 }}>{exec.invalidation}</span>
          </div>}
        </div>
      </div>
      {exec.notes && <div style={{ padding:"12px 16px", background:"#0f0f22", border:"1px solid #1a1a30", marginBottom:12, borderRadius:4 }}><div style={{ ...LS, marginBottom:8 }}>Execution Notes</div><div style={{ ...MN, fontSize:11.5, color:"#dde0f0", lineHeight:1.85 }}>{exec.notes}</div></div>}
      {riskRes?.risk_report && (
        <div style={{ padding:"12px 16px", background:"#ff990008", border:"1px solid #ff990033", marginBottom:12, borderRadius:4 }}>
          <div style={{ ...LS, color:"#ff9900", marginBottom:8 }}>Risk Assessment</div>
          <div style={{ ...MN, fontSize:11.5, color:"#dde0f0", lineHeight:1.85 }}>{riskRes.risk_report}</div>
          {riskRes.risk_flags?.length > 0 && (
            <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:5 }}>
              {riskRes.risk_flags.map((f, i) => <span key={i} style={{ ...MN, fontSize:10.5, padding:"2px 8px", background:"#ff990012", border:"1px solid #ff990033", color:"#ff9900", borderRadius:2 }}>{f}</span>)}
            </div>
          )}
        </div>
      )}
      <button onClick={onNewAnalysis} style={{ width:"100%", padding:"11px 0", background:"none", border:"1px solid #1a1a30", color:"#7070a0", fontSize:11, letterSpacing:2, cursor:"pointer", fontFamily:"'Rajdhani', sans-serif", fontWeight:700, textTransform:"uppercase", borderRadius:4 }}>NEW ANALYSIS</button>
    </div>
  );
}

// ─── STATS / PNL HEATMAP ──────────────────────────────────────────
function StatsPanel({ journal }) {
  const wins = journal.filter(j => j.result === "Win");
  const losses = journal.filter(j => j.result === "Loss");
  const bes = journal.filter(j => j.result === "BE");
  const closed = wins.length + losses.length;
  const winRate = closed > 0 ? ((wins.length / closed) * 100).toFixed(1) : null;
  const totalPnl = journal.reduce((s, j) => s + (j.pnl || 0), 0);
  const avgWin = wins.length > 0 ? (wins.reduce((s, j) => s + (j.pnl || 0), 0) / wins.length).toFixed(2) : null;
  const avgLoss = losses.length > 0 ? (losses.reduce((s, j) => s + Math.abs(j.pnl || 0), 0) / losses.length).toFixed(2) : null;
  const profitFactor = avgLoss && avgLoss > 0 ? (parseFloat(avgWin || 0) / parseFloat(avgLoss)).toFixed(2) : null;

  const pairStats = {};
  journal.forEach(j => {
    if (!j.pair) return;
    if (!pairStats[j.pair]) pairStats[j.pair] = { wins:0, losses:0, pnl:0 };
    if (j.result === "Win") pairStats[j.pair].wins++;
    if (j.result === "Loss") pairStats[j.pair].losses++;
    pairStats[j.pair].pnl += j.pnl || 0;
  });

  const IS = { background:"#0a0e13", border:"1px solid #131a22", borderRadius:7, padding:"10px 14px", textAlign:"center" };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))", gap:8, marginBottom:16 }}>
        {[
          { l:"WIN RATE", v: winRate ? `${winRate}%` : "—", c: winRate && parseFloat(winRate) >= 55 ? "#3fb950" : "#f0883e" },
          { l:"TOTAL PnL", v:`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}`, c: totalPnl >= 0 ? "#3fb950" : "#f85149" },
          { l:"TRADES", v:journal.length, c:"#dde4ec" },
          { l:"WINS", v:wins.length, c:"#3fb950" },
          { l:"LOSSES", v:losses.length, c:"#f85149" },
          { l:"AVG WIN", v: avgWin ? `+$${avgWin}` : "—", c:"#3fb950" },
          { l:"AVG LOSS", v: avgLoss ? `-$${avgLoss}` : "—", c:"#f85149" },
          { l:"PROFIT FACTOR", v: profitFactor || "—", c: profitFactor && parseFloat(profitFactor) >= 1.5 ? "#3fb950" : "#f0883e" },
        ].map(s => (
          <div key={s.l} style={IS}>
            <div style={{ fontSize:8, color:"#4a5568", letterSpacing:"0.1em", marginBottom:3 }}>{s.l}</div>
            <div style={{ fontSize:15, fontWeight:700, color:s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {Object.keys(pairStats).length > 0 && (
        <div style={{ background:"#0a0e13", border:"1px solid #131a22", borderRadius:7, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:9, color:"#4a5568", letterSpacing:"0.1em", marginBottom:10 }}>PERFORMANCE BY PAIR</div>
          {Object.entries(pairStats).sort((a, b) => b[1].pnl - a[1].pnl).map(([pair, s]) => {
            const tot = s.wins + s.losses;
            const wr = tot > 0 ? ((s.wins / tot) * 100).toFixed(0) : 0;
            const barW = Math.min(100, Math.abs(s.pnl) / 5);
            return (
              <div key={pair} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:11, color:"#dde4ec", fontWeight:700 }}>{pair}</span>
                  <span style={{ fontSize:11, color: s.pnl >= 0 ? "#3fb950" : "#f85149" }}>{s.pnl >= 0 ? "+" : ""}{s.pnl.toFixed(2)} USDT</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, height:4, background:"#131a22", borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${barW}%`, background: s.pnl >= 0 ? "#3fb950" : "#f85149", borderRadius:2 }} />
                  </div>
                  <span style={{ fontSize:9, color:"#4a5568" }}>{s.wins}W/{s.losses}L · {wr}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {journal.length === 0 && <div style={{ textAlign:"center", color:"#1c2631", padding:"48px 0", fontSize:11 }}><div style={{ fontSize:24, marginBottom:8 }}>◈</div>Belum ada trade untuk dianalisis.</div>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
  // ── Scalp Plan state
  const [capital, setCapital] = useState("500");
  const [risk, setRisk] = useState("1");
  const [leverage, setLeverage] = useState("10");
  const [timeframe, setTimeframe] = useState("5m");
  const [session, setSession] = useState("Asia");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [plan, setPlan] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [stream, setStream] = useState("");
  const [addedPairs, setAddedPairs] = useState(new Set());
  const streamRef = useRef("");

  // ── Journal state
  const [journal, setJournal] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [formPrefill, setFormPrefill] = useState(null);

  // ── Rothschild Agent Pipeline state
  const [ctx, setCtx] = useState("");
  const [agentStatuses, setAgentStatuses] = useState({});
  const [agentResults, setAgentResults] = useState({});
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineTab, setPipelineTab] = useState("setup");
  const [pipelineError, setPipelineError] = useState(null);
  const [agentScore, setAgentScore] = useState(null);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const abortRef = useRef(false);

  // ── Navigation
  const [mainTab, setMainTab] = useState("scalp");

  useEffect(() => { loadJ().then(j => setJournal(j)); }, []);

  // ── Live price state
  const [liveCoins, setLiveCoins] = useState(
    BASE_COINS.map(c => ({ ...c, price: null, change24h: null, funding: null, priceFlash: null }))
  );
  const prevPrices = useRef({});

  const fetchPrices = async () => {
    try {
      const ids = BASE_COINS.map(c => c.cgId).join(",");
      const res = await fetch(
        `/cg/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
      );
      const data = await res.json();

      setLiveCoins(prev => prev.map(c => {
        const d = data[c.cgId];
        if (!d) return c;
        const price = d.usd;
        const change24h = parseFloat((d.usd_24h_change || 0).toFixed(2));
        const prev24 = prevPrices.current[c.pair];
        const flash = prev24 !== undefined ? (price > prev24 ? "up" : price < prev24 ? "down" : null) : null;
        prevPrices.current[c.pair] = price;
        // keep existing funding string since CoinGecko doesn't have it
        return { ...c, price, change24h, priceFlash: flash };
      }));
    } catch (e) {
      // silently fail
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived: journal stats
  const wins = journal.filter(j => j.result === "Win");
  const losses = journal.filter(j => j.result === "Loss");
  const closed = wins.length + losses.length;
  const winRate = closed > 0 ? ((wins.length / closed) * 100).toFixed(0) : null;
  const totalPnl = journal.reduce((s, j) => s + (j.pnl || 0), 0);
  const lossStreak = journal.length >= 2 && journal[0]?.result === "Loss" && journal[1]?.result === "Loss";

  const riskUsdt = ((parseFloat(capital) || 0) * (parseFloat(risk) || 1) / 100).toFixed(2);

  // ── Agent score info
  const scoreInfo = agentScore == null ? null
    : agentScore >= 80 ? { label:"EXECUTE",   color:"#00ff88" }
    : agentScore >= 70 ? { label:"WATCHLIST", color:"#ffcc00" }
    :                    { label:"IGNORE",    color:"#ff2255" };

  // ── Scalp Plan API
  const COINS = liveCoins;
  const buildContext = () => {
    const lossCtx = losses.length > 0
      ? `\nTRADE LOSS TERKINI (JANGAN ULANGI POLA SERUPA):\n${losses.slice(0, 3).map(l => `- ${l.pair} ${l.direction} @ $${l.entry}: ${l.notes || "no notes"} → -$${Math.abs(l.pnl || 0).toFixed(2)}`).join("\n")}`
      : "";
    return `DATA MARKET (${new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}):\nMacro: ${MACRO_TEXT}\nHarga:\n${COINS.map(c => `${c.pair}: $${fp(c.price)} | 24h: ${c.change24h}% | Vol: ${c.vol} | OI: ${c.oi} | Funding: ${c.funding} | Sentiment: ${c.sentiment}`).join("\n")}\nPARAMETER: Modal $${capital} USDT | Risk ${risk}% = $${riskUsdt} USDT | Leverage ${leverage}x | TF: ${timeframe} | Sesi: ${session}\n${lossCtx}\nTUGAS: Trading plan scalping hari ini. Filter ketat: confidence ≥ 8/10, RR ≥ 1:2. Maks 3 setup. Tidak ada yang layak → NO VALID SETUP.`;
  };

  const generatePlan = async () => {
    setLoadingPlan(true); setPlan(""); setStream(""); streamRef.current = "";
    setAddedPairs(new Set());
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:SCALP_SYSTEM, messages:[{ role:"user", content:buildContext() }] })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "⛔ Gagal mendapat respons.";
      let i = 0;
      const tick = setInterval(() => {
        if (i < text.length) { streamRef.current += text[i]; setStream(streamRef.current); i += 10; }
        else { clearInterval(tick); setPlan(text); setStream(""); setPlanTime(new Date().toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" })); setLoadingPlan(false); }
      }, 14);
    } catch { setPlan("⛔ Gagal terhubung ke AI. Periksa koneksi."); setLoadingPlan(false); }
  };

  const handleAddFromPlan = (setup) => {
    setFormPrefill({ pair:setup.pair, direction: setup.direction === "LONG" ? "Long" : "Short", confidence:setup.score, entry:setup.entry?.toString() || "", sl:setup.sl?.toString() || "", tp1:setup.tp1?.toString() || "", tp2:setup.tp2?.toString() || "", result:"", pnl:"", timeframe, notes:`Plan ${planTime || ""}` });
    setEditIdx(null); setShowForm(true);
    setAddedPairs(prev => new Set([...prev, setup.pair]));
    setMainTab("journal");
  };

  // ── Journal CRUD
  const handleSave = async (entry, idx) => {
    const updated = idx !== null && idx !== undefined
      ? journal.map((j, i) => i === idx ? { ...j, ...entry } : j)
      : [entry, ...journal];
    setJournal(updated); await saveJ(updated);
    setShowForm(false); setEditIdx(null); setFormPrefill(null);
  };
  const handleEdit = (idx) => {
    const e = journal[idx];
    setFormPrefill({ ...e, entry:e.entry?.toString() || "", sl:e.sl?.toString() || "", tp1:e.tp1?.toString() || "", tp2:e.tp2?.toString() || "", pnl:Math.abs(e.pnl || 0).toString() });
    setEditIdx(idx); setShowForm(true);
  };
  const handleDelete = async (idx) => {
    const updated = journal.filter((_, i) => i !== idx);
    setJournal(updated); await saveJ(updated);
  };

  // ── Rothschild Pipeline API
  const callClaude = async (prompt) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:"You are a specialized trading AI agent. Respond ONLY with a valid JSON object. No markdown fences, no preamble. Raw JSON only.", messages:[{ role:"user", content:prompt }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.content.map(b => b.text || "").join("").replace(/```json\n?|```/g,"").trim();
    return JSON.parse(raw);
  };

  const runPipeline = async () => {
    if (!ctx.trim()) { setPipelineError("Paste market context or click Generate Sample."); return; }
    setPipelineRunning(true); setPipelineError(null); setAgentResults({}); setAgentStatuses({}); setAgentScore(null);
    setPipelineTab("pipeline"); abortRef.current = false;
    const res = {};
    try {
      for (const agent of AGENTS) {
        if (abortRef.current) break;
        setAgentStatuses(p => ({ ...p, [agent.id]:"running" }));
        setActiveAgentId(agent.id);
        const prompts = {
          scanner:    () => P.scanner(ctx),
          regime:     () => P.regime(ctx, res),
          smartmoney: () => P.smartmoney(ctx, res),
          risk:       () => P.risk(ctx, res),
          execution:  () => P.execution(ctx, res),
        };
        try {
          const result = await callClaude(prompts[agent.id]());
          res[agent.id] = result;
          setAgentResults(p => ({ ...p, [agent.id]:result }));
          setAgentStatuses(p => ({ ...p, [agent.id]:"done" }));
        } catch (e) {
          setAgentStatuses(p => ({ ...p, [agent.id]:"error" }));
          throw new Error(`${agent.label} agent failed: ${e.message}`);
        }
      }
      if (res.risk?.trade_quality_scores) {
        const s = res.risk.trade_quality_scores;
        setAgentScore(Math.min(100, Math.round(Object.values(s).reduce((a, v) => a + (Number(v) || 0), 0))));
      }
      setActiveAgentId(null);
      setPipelineTab("signal");
    } catch (e) { setPipelineError(e.message); }
    finally { setPipelineRunning(false); }
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Shared Styles
  const IS = { background:"#070b0f", border:"1px solid #1c2631", color:"#c9d1d9", padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:12, width:"100%", outline:"none" };
  const LS = { fontSize:9, color:"#4a5568", marginBottom:4, letterSpacing:"0.1em" };
  const displayText = loadingPlan ? stream : plan;

  const sColor = (id) => {
    const s = agentStatuses[id];
    return s === "done" ? "#00ff88" : s === "running" ? "#ffcc00" : s === "error" ? "#ff2255" : "#474768";
  };

  const MN = { fontFamily:"'Share Tech Mono', monospace" };

  return (
    <div style={{ fontFamily:"'JetBrains Mono','Fira Code',monospace", color:"#c9d1d9", padding:0, margin:0, background:"#07090c", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@700;800;900&family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#00e5ff22;border-radius:2px}
        select option{background:#0d1117!important}
        textarea{resize:vertical}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .pulse{animation:blink 1.8s ease-in-out infinite}
      `}</style>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div style={{ background:"#07090c", borderBottom:"1px solid #131a22", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div>
            <div style={{ fontSize:8, letterSpacing:"0.2em", color:"#00e5ff44", marginBottom:2 }}>◉ BYBIT PERPETUAL · NATHAN'S UNIFIED TERMINAL</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:"#e6edf3", letterSpacing:"-0.02em" }}>SCALP <span style={{ color:"#00e5ff" }}>COMMAND</span></span>
              <span style={{ fontSize:9, color:"#474768", fontWeight:400 }}>×</span>
              <span style={{ fontFamily:"'Orbitron',monospace", fontSize:13, fontWeight:900, color:"#00ff88", letterSpacing:2 }}>ROTHSCHILD'S</span>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {/* Agent status dots */}
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            {AGENTS.map(a => (
              <div key={a.id} title={a.label} style={{ width:6, height:6, borderRadius:"50%", background:sColor(a.id), boxShadow: agentStatuses[a.id] === "done" ? `0 0 5px ${a.accent}88` : "none", animation: agentStatuses[a.id] === "running" ? "pulse 0.9s infinite" : "none", transition:"background 0.3s" }} />
            ))}
          </div>

          {/* Score badge */}
          {scoreInfo && (
            <div style={{ ...MN, fontSize:11, color:scoreInfo.color, border:`1px solid ${scoreInfo.color}33`, padding:"2px 8px", letterSpacing:1 }}>
              {agentScore}/100 · {scoreInfo.label}
            </div>
          )}

          {/* Quick stats */}
          <div style={{ display:"flex", gap:6 }}>
            {[
              { l:"WIN RATE", v: winRate ? `${winRate}%` : "—", c: winRate && parseInt(winRate) >= 55 ? "#3fb950" : "#f0883e" },
              { l:"PnL", v:`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(1)}`, c: totalPnl >= 0 ? "#3fb950" : "#f85149" },
              { l:"TRADES", v:journal.length, c:"#dde4ec" },
            ].map(s => (
              <div key={s.l} style={{ background:"#0a0e13", border:"1px solid #1c2631", borderRadius:5, padding:"4px 9px", textAlign:"center", minWidth:54 }}>
                <div style={{ fontSize:7, color:"#4a5568", letterSpacing:"0.1em", marginBottom:1 }}>{s.l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MARKET TICKER ─────────────────────────────────────── */}
      <div style={{ background:"#0a0d10", borderBottom:"1px solid #0e1318", padding:"8px 20px", display:"flex", alignItems:"flex-start", gap:20 }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ fontSize:7, color:"#c9d1d9", letterSpacing:"0.1em", marginBottom:6 }}>LIVE PRICES</div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {liveCoins.map(c => {
              const priceColor = c.priceFlash === "up" ? "#3fb950" : c.priceFlash === "down" ? "#f85149" : "#dde4ec";
              return (
              <div key={c.symbol} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#c9d1d9", letterSpacing:"0.08em", minWidth:36 }}>{c.symbol}</span>
                <span style={{ fontSize:12, fontWeight:700, color:priceColor, minWidth:72, transition:"color 0.4s" }}>{c.price != null ? "$"+fp(c.price) : <span style={{color:"#2d3748"}}>...</span>}</span>
                <span style={{ fontSize:10, color: c.change24h == null ? "#2d3748" : c.change24h >= 0 ? "#3fb950" : "#f85149", minWidth:52 }}>{c.change24h != null ? (c.change24h >= 0 ? "+" : "")+c.change24h+"%" : "—"}</span>
                <span style={{ fontSize:10, color:"#c9d1d9" }}>{c.funding ?? "—"}</span>
              </div>
              );
            })}
          </div>
        </div>
        <div style={{ width:1, alignSelf:"stretch", background:"#1c2631", flexShrink:0 }} />
        <div style={{ fontSize:8, color:"#c9d1d9", letterSpacing:"0.07em", lineHeight:"1.9", alignSelf:"center" }}>
          {MACRO_TEXT.split(" | ").map((seg, i) => (
            <div key={i}>◈ {seg}</div>
          ))}
        </div>
      </div>

      {/* ── LOSS STREAK ALERT ─────────────────────────────────── */}
      {lossStreak && (
        <div style={{ background:"#160404", borderBottom:"1px solid #f85149", padding:"7px 20px", fontSize:11, color:"#f85149", fontWeight:700 }}>
          🛑 2 LOSS BERTURUT-TURUT TERDETEKSI — STOP TRADING HARI INI. Evaluasi ulang besok.
        </div>
      )}

      {/* ── MAIN NAV TABS ─────────────────────────────────────── */}
      <div style={{ background:"#07090c", borderBottom:"1px solid #131a22", padding:"0 20px", display:"flex" }}>
        {[
          { id:"scalp",    label:"SCALP PLAN", dot: plan ? "●" : null },
          { id:"pipeline", label:"AGENT PIPELINE", dot: agentResults.execution ? "●" : null },
          { id:"journal",  label:`JOURNAL (${journal.length})` },
          { id:"stats",    label:"STATS" },
          { id:"market",   label:"MARKET DATA" },
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} style={{ padding:"10px 16px", fontFamily:"inherit", fontSize:10, cursor:"pointer", background:"transparent", border:"none", letterSpacing:"0.08em", color: mainTab === t.id ? "#00e5ff" : "#4a5568", borderBottom:`2px solid ${mainTab === t.id ? "#00e5ff" : "transparent"}`, transition:"all 0.15s" }}>
            {t.label}{t.dot && <span style={{ marginLeft:5, color: t.id === "scalp" ? "#00e5ff" : "#00ff88", fontSize:8 }}>{t.dot}</span>}
          </button>
        ))}
      </div>

      {/* ── CONTENT AREA ──────────────────────────────────────── */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"16px 16px" }}>

        {/* ════════ SCALP PLAN TAB ════════ */}
        {mainTab === "scalp" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ background:"#0d1117", border:"1px solid #1c2631", borderRadius:8, padding:"12px 14px", marginBottom:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:10, alignItems:"end" }}>
                {[
                  { label:"MODAL (USDT)", el:<input style={IS} type="number" value={capital} onChange={e => setCapital(e.target.value)} /> },
                  { label:"RISK %", el:<select style={IS} value={risk} onChange={e => setRisk(e.target.value)}><option value="0.5">0.5% Konservatif</option><option value="1">1% Moderat</option><option value="2">2% Agresif</option></select> },
                  { label:"LEVERAGE", el:<input style={IS} type="number" min="1" max="20" value={leverage} onChange={e => setLeverage(e.target.value)} /> },
                  { label:"TIMEFRAME", el:<select style={IS} value={timeframe} onChange={e => setTimeframe(e.target.value)}>{["1m","3m","5m","15m"].map(t => <option key={t}>{t}</option>)}</select> },
                  { label:"SESI", el:<select style={IS} value={session} onChange={e => setSession(e.target.value)}>{["Asia","London","New York","Overlap"].map(s => <option key={s}>{s}</option>)}</select> },
                ].map(({ label, el }) => <div key={label}><div style={LS}>{label}</div>{el}</div>)}
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10, flexWrap:"wrap", gap:8 }}>
                <div style={{ fontSize:11, color:"#4a5568" }}>
                  Risk per trade: <span style={{ color:"#f0883e", fontWeight:700 }}>${riskUsdt} USDT</span>
                  {losses.length > 0 && <span style={{ marginLeft:12, color:"#f85149", fontSize:10 }}>⚠ {losses.length} loss di journal → AI analisis</span>}
                </div>
                <button onClick={generatePlan} disabled={loadingPlan} style={{ padding:"9px 20px", borderRadius:6, fontFamily:"inherit", fontSize:12, fontWeight:700, cursor: loadingPlan ? "not-allowed" : "pointer", background:"#00e5ff18", border:"1px solid #00e5ff66", color:"#00e5ff", opacity: loadingPlan ? 0.6 : 1, letterSpacing:"0.04em" }}>
                  {loadingPlan ? <span className="pulse">◌ AI ANALYZING...</span> : "▶ GET TODAY'S PLAN"}
                </button>
              </div>
            </div>

            <div style={{ background:"#0d1117", border:"1px solid #131a22", borderRadius:8, padding:20, minHeight:300 }}>
              {!displayText && !loadingPlan && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:260, gap:10, color:"#1a2530" }}>
                  <div style={{ fontSize:28 }}>⬡</div>
                  <div style={{ fontSize:10, letterSpacing:"0.15em" }}>KLIK "GET TODAY'S PLAN" UNTUK MULAI</div>
                  <div style={{ fontSize:9, color:"#131a22" }}>AI analisis {COINS.length} pair · Multi-TF · On-chain · Elliott Wave · Conflict Resolution</div>
                </div>
              )}
              {displayText && (
                <>
                  {planTime && !loadingPlan && <div style={{ fontSize:9, color:"#c9d1d9", marginBottom:14, letterSpacing:"0.08em" }}>GENERATED {planTime} WIB · MIN 8/10 · RR ≥ 1:2 · MAX 3 SETUP</div>}
                  {loadingPlan
                    ? <div style={{ whiteSpace:"pre-wrap", fontSize:12, color:"#e6edf3", lineHeight:"1.7" }}>{displayText}</div>
                    : <PlanRenderer text={displayText} addedPairs={addedPairs} onAdd={handleAddFromPlan} />
                  }
                  {plan && !loadingPlan && (
                    <div style={{ marginTop:18, paddingTop:12, borderTop:"1px solid #131a22", display:"flex", gap:8 }}>
                      <button onClick={handleCopy} style={{ padding:"7px 16px", borderRadius:5, fontFamily:"inherit", fontSize:10, fontWeight:700, cursor:"pointer", background: copied ? "#3fb95018" : "#00e5ff10", border:`1px solid ${copied ? "#3fb95066" : "#00e5ff44"}`, color: copied ? "#3fb950" : "#00e5ff", transition:"all 0.2s" }}>{copied ? "✔ COPIED!" : "⎘ COPY PLAN"}</button>
                      <button onClick={() => { setFormPrefill(null); setEditIdx(null); setShowForm(true); setMainTab("journal"); }} style={{ padding:"7px 14px", borderRadius:5, fontFamily:"inherit", fontSize:10, cursor:"pointer", background:"transparent", border:"1px solid #1c2631", color:"#c9d1d9" }}>+ Log Manual</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ════════ AGENT PIPELINE TAB ════════ */}
        {mainTab === "pipeline" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ display:"flex", gap:14, height:"calc(100vh - 240px)", minHeight:500 }}>

              {/* Left sidebar: agent pipeline */}
              <div style={{ width:190, flexShrink:0, background:"#0d1117", border:"1px solid #131a22", borderRadius:8, overflowY:"auto" }}>
                <AgentPipelineSidebar statuses={agentStatuses} results={agentResults} activeId={activeAgentId} setActive={setActiveAgentId} score={agentScore} scoreInfo={scoreInfo} />
              </div>

              {/* Right: sub-tabs + content */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#0d1117", border:"1px solid #131a22", borderRadius:8, overflow:"hidden" }}>
                {/* Sub-tab bar */}
                <div style={{ borderBottom:"1px solid #131a22", padding:"0 16px", display:"flex", background:"#0a0e13", flexShrink:0 }}>
                  {[
                    { id:"setup",    label:"SETUP" },
                    { id:"pipeline", label:"PIPELINE", off: !pipelineRunning && Object.keys(agentResults).length === 0 },
                    { id:"signal",   label:"SIGNAL",   off: !agentResults.execution },
                  ].map(t => (
                    <button key={t.id} onClick={() => !t.off && setPipelineTab(t.id)} style={{ background:"none", border:"none", borderBottom:`2px solid ${pipelineTab === t.id ? "#00ff88" : "transparent"}`, padding:"10px 14px", marginBottom:-1, color: pipelineTab === t.id ? "#00ff88" : t.off ? "#272745" : "#7070a0", fontSize:10, letterSpacing:2, fontWeight:700, cursor: t.off ? "default" : "pointer", fontFamily:"'Rajdhani', sans-serif", textTransform:"uppercase", transition:"color 0.2s" }}>
                      {t.id === "signal" && agentResults.execution && <span style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background:scoreInfo?.color || "#00ff88", marginRight:6, verticalAlign:"middle" }} />}
                      {t.label}
                    </button>
                  ))}
                  <div style={{ flex:1 }} />
                  <div style={{ display:"flex", alignItems:"center", fontSize:11, letterSpacing:2, fontWeight:700, fontFamily:"'Rajdhani', sans-serif", color: pipelineRunning ? "#ffcc00" : agentResults.execution ? "#00ff88" : "#5a5a80", padding:"0 8px" }}>
                    {pipelineRunning ? "● PROCESSING" : agentResults.execution ? "● SIGNAL READY" : "● STANDBY"}
                  </div>
                </div>

                <div style={{ flex:1, overflow:"auto", padding:"16px 18px" }}>

                  {/* SETUP sub-tab */}
                  {pipelineTab === "setup" && (
                    <div style={{ maxWidth:640 }}>
                      <div style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                          <div style={{ fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:"#8888b8", fontWeight:700, fontFamily:"'Rajdhani', sans-serif" }}>Market Intelligence Context</div>
                          <button onClick={() => setCtx(generateSample("BTC", "67450"))} style={{ background:"none", border:"1px solid #1a1a30", color:"#7070a0", padding:"3px 10px", fontSize:10, letterSpacing:1, cursor:"pointer", fontFamily:"'Rajdhani', sans-serif", fontWeight:700, textTransform:"uppercase", borderRadius:3 }}>Generate Sample</button>
                        </div>
                        <textarea value={ctx} onChange={e => setCtx(e.target.value)} rows={18} placeholder={"Paste Neurodex Pro output here...\n\nSistem akan otomatis membaca: coin, timeframe, harga,\nOI, Funding Rate, Long/Short Ratio, Liquidations,\nExchange Flows, Whale Activity, Indikator Teknikal,\nMarket Structure, dan Sentiment.\n\nAtau klik 'Generate Sample' untuk tes dengan data BTC."} style={{ width:"100%", padding:12, background:"#0c0c1a", border:"1px solid #1a1a30", color:"#dde0f0", ...MN, fontSize:11.5, lineHeight:1.7, outline:"none", borderRadius:3, resize:"vertical" }} />
                      </div>
                      {pipelineError && <div style={{ ...MN, fontSize:11, padding:"9px 14px", marginBottom:12, border:"1px solid #ff225544", background:"#ff22550e", color:"#ff2255", borderRadius:3 }}>ERROR  {pipelineError}</div>}
                      <button onClick={runPipeline} disabled={pipelineRunning} style={{ width:"100%", padding:"12px 0", background: pipelineRunning ? "transparent" : "#00ff8812", border:`1px solid ${pipelineRunning ? "#272745" : "#00ff88"}`, color: pipelineRunning ? "#474768" : "#00ff88", fontSize:11.5, letterSpacing:3, fontWeight:700, cursor: pipelineRunning ? "not-allowed" : "pointer", fontFamily:"'Rajdhani', sans-serif", textTransform:"uppercase", transition:"all 0.2s", borderRadius:3 }}>
                        {pipelineRunning ? `EXECUTING  ${AGENTS.find(a => a.id === activeAgentId)?.label || ""}...` : "RUN FULL AGENT PIPELINE"}
                      </button>
                      <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:"#272745", fontWeight:700, fontFamily:"'Rajdhani', sans-serif", textAlign:"center", marginTop:10 }}>
                        Scanner → Regime → Smart Money → Risk → Execution
                      </div>
                    </div>
                  )}

                  {/* PIPELINE sub-tab */}
                  {pipelineTab === "pipeline" && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      {AGENTS.map(agent => {
                        const r = agentResults[agent.id];
                        const st = agentStatuses[agent.id] || "idle";
                        const agentChipMap = {
                          scanner:    r && { v:r.verdict, c: r.verdict === "CANDIDATE" ? "#00ff88" : r.verdict === "WEAK" ? "#ffcc00" : "#ff2255" },
                          regime:     r && { v:r.regime?.replace(/_/g," "), c:"#2299ff" },
                          smartmoney: r && { v:r.sm_bias, c:"#aa44ff" },
                          risk:       r && { v:r.risk_verdict, c: r.risk_verdict === "APPROVED" ? "#00ff88" : r.risk_verdict === "CAUTION" ? "#ffcc00" : "#ff2255" },
                          execution:  r && { v:r.direction ? `${r.direction}  ${r.rr}` : null, c: r?.direction === "LONG" ? "#00ff88" : "#ff2255" },
                        };
                        const chip = agentChipMap[agent.id];
                        return (
                          <div key={agent.id} style={{ background:"#0f0f22", border:`1px solid ${st === "done" ? agent.accent + "44" : "#1a1a30"}`, borderRadius:3, padding:14, gridColumn: agent.id === "execution" ? "span 2" : undefined }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <span style={{ fontSize:18, color: st === "done" ? agent.accent : st === "running" ? "#ffcc00" : "#474768", animation: st === "running" ? "pulse 0.9s infinite" : "none" }}>{agent.icon}</span>
                                <div>
                                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color: st === "done" ? agent.accent : "#dde0f0" }}>{agent.label}</div>
                                  <div style={{ fontSize:10, color:"#7070a0", marginTop:2 }}>{agent.desc}</div>
                                </div>
                              </div>
                              <div style={{ ...MN, fontSize:10, padding:"2px 8px", background:`${sColor(agent.id)}14`, border:`1px solid ${sColor(agent.id)}33`, color:sColor(agent.id), letterSpacing:1, borderRadius:2 }}>{st.toUpperCase()}</div>
                            </div>
                            {chip?.v && <div style={{ marginBottom:8 }}><span style={{ ...MN, fontSize:10, padding:"2px 9px", background:`${chip.c}12`, border:`1px solid ${chip.c}44`, color:chip.c, borderRadius:2 }}>{chip.v}</span></div>}
                            {r
                              ? <pre style={{ ...MN, fontSize:10.5, color:"#dde0f0", whiteSpace:"pre-wrap", wordBreak:"break-word", maxHeight:200, overflow:"auto", lineHeight:1.55, margin:0 }}>{JSON.stringify(r, null, 2)}</pre>
                              : <div style={{ ...MN, fontSize:11, color:"#474768", textAlign:"center", padding:"20px 0" }}>{st === "running" ? "Processing..." : "Awaiting execution"}</div>
                            }
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SIGNAL sub-tab */}
                  {pipelineTab === "signal" && (
                    <RothschildSignal results={agentResults} score={agentScore} scoreInfo={scoreInfo} onNewAnalysis={() => { setPipelineTab("setup"); setCtx(""); setAgentResults({}); setAgentStatuses({}); setAgentScore(null); }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ JOURNAL TAB ════════ */}
        {mainTab === "journal" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            {!showForm && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
                <button onClick={() => { setFormPrefill(null); setEditIdx(null); setShowForm(true); }} style={{ padding:"7px 14px", borderRadius:5, fontFamily:"inherit", fontSize:10, fontWeight:700, cursor:"pointer", background:"#00e5ff10", border:"1px solid #00e5ff44", color:"#00e5ff" }}>+ LOG TRADE</button>
              </div>
            )}
            {showForm && (
              <JournalForm
                key={editIdx !== null ? `edit-${editIdx}` : formPrefill ? `pre-${formPrefill.pair}` : "new"}
                prefill={formPrefill}
                editIdx={editIdx}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditIdx(null); setFormPrefill(null); }}
                timeframe={timeframe}
              />
            )}
            {journal.length === 0 && !showForm && (
              <div style={{ textAlign:"center", color:"#1c2631", padding:"48px 0", fontSize:11 }}>
                <div style={{ fontSize:24, marginBottom:8 }}>◎</div>
                Belum ada trade di journal.
              </div>
            )}
            {journal.map((entry, idx) => (
              <JournalCard key={idx} entry={entry} idx={idx} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {/* ════════ STATS TAB ════════ */}
        {mainTab === "stats" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <StatsPanel journal={journal} />
          </div>
        )}

        {/* ════════ MARKET DATA TAB ════════ */}
        {mainTab === "market" && (
          <div style={{ animation:"fadeIn 0.2s ease" }}>
            <div style={{ fontSize:9, color:"#4a5568", marginBottom:12, letterSpacing:"0.12em" }}>MARKET SNAPSHOT · BYBIT PERPETUAL</div>
            <div style={{ overflowX:"auto", marginBottom:16, background:"#0d1117", border:"1px solid #131a22", borderRadius:8, padding:14 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr>{["PAIR","PRICE","24H","VOLUME","OI TREND","FUNDING","SENTIMENT"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"6px 10px", fontSize:9, color:"#4a5568", letterSpacing:"0.1em", borderBottom:"1px solid #131a22" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {liveCoins.map(c => {
                    const fNum = parseFloat(c.funding);
                    const fc = fNum > 0.01 ? "#f85149" : fNum < 0 ? "#3fb950" : "#556070";
                    const sc = c.sentiment === "Bullish" ? "#3fb950" : c.sentiment === "Bearish" ? "#f85149" : "#f0883e";
                    return (
                      <tr key={c.symbol} style={{ borderBottom:"1px solid #0e1318" }}>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:"#dde4ec" }}>{c.pair}</td>
                        <td style={{ padding:"8px 10px", color:"#c9d1d9" }}>${fp(c.price)}</td>
                        <td style={{ padding:"8px 10px", color: c.change24h >= 0 ? "#3fb950" : "#f85149", fontWeight:700 }}>{c.change24h >= 0 ? "+" : ""}{c.change24h}%</td>
                        <td style={{ padding:"8px 10px", color:"#556070" }}>{c.vol}</td>
                        <td style={{ padding:"8px 10px", color: c.oi === "Rising" ? "#3fb950" : c.oi === "Down" ? "#f85149" : "#556070" }}>{c.oi}</td>
                        <td style={{ padding:"8px 10px", color:fc, fontWeight:600 }}>{c.funding}</td>
                        <td style={{ padding:"8px 10px" }}><span style={{ padding:"2px 8px", borderRadius:3, fontSize:10, background:`${sc}18`, border:`1px solid ${sc}44`, color:sc }}>{c.sentiment}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div style={{ background:"#0a0e13", border:"1px solid #131a22", borderRadius:7, padding:12 }}>
                <div style={{ fontSize:9, color:"#00e5ff66", marginBottom:8, letterSpacing:"0.1em" }}>CONFLICT RESOLUTION HIERARCHY</div>
                {["1. On-chain (BTC.D, OI, Funding) — TERTINGGI","2. Market Structure (BOS/CHOCH, H4 trend)","3. Technical Indicators (RSI, MACD, dll)","→ Konflik tidak resolve = NO TRADE"].map((t, i) => (
                  <div key={i} style={{ fontSize:11, color: i === 3 ? "#f85149" : "#556070", padding:"3px 0", lineHeight:"1.6" }}>{t}</div>
                ))}
              </div>
              <div style={{ background:"#0a0e13", border:"1px solid #131a22", borderRadius:7, padding:12 }}>
                <div style={{ fontSize:9, color:"#f8514966", marginBottom:8, letterSpacing:"0.1em" }}>NO TRADE CONDITIONS</div>
                {["Tidak ada BOS/CHOCH jelas","Tidak ada liquidity sweep","Market choppy/sideways","High impact news aktif","Konflik indikator tidak bisa resolve"].map((t, i) => (
                  <div key={i} style={{ fontSize:11, color:"#4a4050", padding:"3px 0", display:"flex", gap:6, lineHeight:"1.6" }}>
                    <span style={{ color:"#5a2020" }}>✘</span>{t}
                  </div>
                ))}
              </div>
              <div style={{ background:"#0a0e13", border:"1px solid #131a22", borderRadius:7, padding:12 }}>
                <div style={{ fontSize:9, color:"#00ff8866", marginBottom:8, letterSpacing:"0.1em" }}>SCORE THRESHOLDS (ROTHSCHILD)</div>
                {[
                  { v:"≥ 80/100", l:"EXECUTE — All criteria met", c:"#00ff88" },
                  { v:"70-79/100", l:"WATCHLIST — Monitor conditions", c:"#ffcc00" },
                  { v:"< 70/100", l:"IGNORE — Stand down", c:"#ff2255" },
                  { v:"≥ 8/10", l:"Scalp Plan min threshold", c:"#00e5ff" },
                ].map((t, i) => (
                  <div key={i} style={{ fontSize:11, padding:"3px 0", display:"flex", gap:8, lineHeight:"1.6" }}>
                    <span style={{ color:t.c, minWidth:72, fontWeight:700 }}>{t.v}</span>
                    <span style={{ color:"#4a5568" }}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
