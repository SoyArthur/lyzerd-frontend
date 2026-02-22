// ============================================
// 🦎 LYZERD - UNIFIED UTILITIES
// ============================================

// ============================================
// FORMAT
// ============================================
export const fmt = {
  num: (n, d = 2) => {
    if (n == null || isNaN(n)) return '0';
    const a = Math.abs(n);
    if (a >= 1e9) return `${(n / 1e9).toFixed(d)}B`;
    if (a >= 1e6) return `${(n / 1e6).toFixed(d)}M`;
    if (a >= 1e3) return `${(n / 1e3).toFixed(d)}K`;
    return n.toFixed(d);
  },
  
  curr: (n, d = 2) => {
    if (n == null || isNaN(n)) return '$0';
    return '$' + fmt.num(n, d);
  },
  
  price: (p) => {
    if (p == null || isNaN(p)) return '$0.00';
    if (p >= 1) return '$' + p.toFixed(4);
    if (p >= 0.01) return '$' + p.toFixed(6);
    return '$' + p.toFixed(8);
  },
  
  pct: (n, d = 2) => {
    if (n == null || isNaN(n)) return '0%';
    return `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
  },
  
  addr: (a) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : 'N/A',
  
  int: (n) => Math.floor(n || 0).toLocaleString('en-US'),
};

// ============================================
// COLOR THRESHOLDS
// ============================================
export const T = {
  safety: [[80, 'green'], [65, 'blue'], [50, 'yellow'], [0, 'red']],
  momentum: [[75, 'green'], [60, 'blue'], [45, 'yellow'], [0, 'red']],
  rsi: [[70, 'red'], [50, 'blue'], [30, 'green'], [0, 'yellow']],
  change: [[0, 'green'], [-Infinity, 'red']],
  health: [[80, 'green'], [60, 'blue'], [40, 'yellow'], [20, 'orange'], [0, 'red']],
};

// ============================================
// COLOR RESOLVER
// ============================================
export const getColor = (val, threshold) => {
  for (const [t, c] of threshold) {
    if (val >= t) return c;
  }
  return threshold[threshold.length - 1][1];
};

// ============================================
// THEME COLORS (dark/light adaptive)
// ============================================
export const C = (isDark) => ({
  green: {
    text: isDark ? 'text-green-400' : 'text-green-600',
    bg: isDark ? 'bg-green-400' : 'bg-green-600',
    border: isDark ? 'border-green-500' : 'border-green-700',
    glow: isDark ? 'shadow-green-500/50' : 'shadow-green-600/30',
  },
  red: {
    text: isDark ? 'text-red-400' : 'text-red-600',
    bg: isDark ? 'bg-red-400' : 'bg-red-600',
    border: isDark ? 'border-red-500' : 'border-red-700',
    glow: isDark ? 'shadow-red-500/50' : 'shadow-red-600/30',
  },
  blue: {
    text: isDark ? 'text-blue-400' : 'text-blue-600',
    bg: isDark ? 'bg-blue-400' : 'bg-blue-600',
    border: isDark ? 'border-blue-500' : 'border-blue-700',
    glow: isDark ? 'shadow-blue-500/50' : 'shadow-blue-600/30',
  },
  yellow: {
    text: isDark ? 'text-yellow-400' : 'text-yellow-600',
    bg: isDark ? 'bg-yellow-400' : 'bg-yellow-600',
    border: isDark ? 'border-yellow-500' : 'border-yellow-700',
    glow: isDark ? 'shadow-yellow-500/50' : 'shadow-yellow-600/30',
  },
  orange: {
    text: isDark ? 'text-orange-400' : 'text-orange-600',
    bg: isDark ? 'bg-orange-400' : 'bg-orange-600',
    border: isDark ? 'border-orange-500' : 'border-orange-700',
    glow: isDark ? 'shadow-orange-500/50' : 'shadow-orange-600/30',
  },
  purple: {
    text: isDark ? 'text-purple-400' : 'text-purple-600',
    bg: isDark ? 'bg-purple-400' : 'bg-purple-600',
    border: isDark ? 'border-purple-500' : 'border-purple-700',
    glow: isDark ? 'shadow-purple-500/50' : 'shadow-purple-600/30',
  },
  gray: {
    text: isDark ? 'text-gray-400' : 'text-gray-600',
    bg: isDark ? 'bg-gray-400' : 'bg-gray-600',
    border: isDark ? 'border-gray-500' : 'border-gray-700',
  },
  white: {
    text: isDark ? 'text-white' : 'text-gray-900',
    bg: isDark ? 'bg-white' : 'bg-gray-900',
  },
});

// ============================================
// ANALYSIS ENRICHMENT
// ============================================
export function enrichAnalysis(a) {
  if (!a) return a;
  
  // Historical stats
  if (a.historicalData?.prices) {
    const vals = a.historicalData.prices.map(p => p.value);
    a.historicalData.stats = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((sum, v) => sum + v, 0) / vals.length,
      change: vals.length > 1 ? ((vals[vals.length - 1] - vals[0]) / vals[0]) * 100 : 0,
      volatility: vals.length > 1 ? ((Math.max(...vals) - Math.min(...vals)) / Math.min(...vals)) * 100 : 0,
    };
  }
  
  // Sentiment
  if (!a.sentimentData) {
    let s = 50;
    const vc = a.volumeChange || 0;
    const pc = a.priceChange24h || 0;
    const hc = a.holdersChange24h || 0;
    
    if (vc > 100) s += 15;
    else if (vc > 50) s += 10;
    else if (vc > 0) s += 5;
    else if (vc < -50) s -= 10;
    
    if (pc > 20) s += 20;
    else if (pc > 10) s += 15;
    else if (pc > 0) s += 5;
    else if (pc < -20) s -= 15;
    
    if (hc > 100) s += 10;
    else if (hc > 0) s += 5;
    else if (hc < -50) s -= 10;
    
    if (a.safetyScore > 80) s += 5;
    else if (a.safetyScore < 40) s -= 5;
    
    s = Math.max(0, Math.min(100, s));
    
    a.sentimentData = {
      score: s,
      label: s >= 80 ? 'veryBullish' : s >= 60 ? 'bullish' : s >= 40 ? 'neutral' : s >= 20 ? 'bearish' : 'veryBearish',
      emoji: s >= 80 ? '🚀' : s >= 60 ? '📈' : s >= 40 ? '😐' : s >= 20 ? '📉' : '💀',
    };
  }
  
  return a;
}

// ============================================
// WHALE ANALYSIS
// ============================================
export function analyzeWhales(whales) {
  if (!whales?.length) return { risk: 'high', msg: 'Sin datos', top5Pct: 0, identified: 0 };
  
  const top5 = whales.slice(0, 5);
  const top5Pct = top5.reduce((sum, w) => sum + w.percent, 0);
  const identified = top5.filter(w => w.name).length;
  
  let risk = 'high', msg = '';
  
  if (top5Pct > 80) {
    risk = 'high';
    msg = '🔴 RIESGO EXTREMO: Top 5 controla >80% del supply';
  } else if (top5Pct > 60) {
    risk = 'high';
    msg = '⚠️ RIESGO ALTO: Concentración peligrosa en top 5';
  } else if (top5Pct > 40) {
    risk = 'medium';
    msg = '🟡 RIESGO MEDIO: Distribución aceptable pero mejorable';
  } else {
    risk = 'low';
    msg = '✅ RIESGO BAJO: Distribución saludable';
  }
  
  return { risk, msg, top5Pct, identified };
}

// ============================================
// HEALTH SCORE
// ============================================
export function calcHealth(a) {
  let s = 0;
  
  // Liquidity (30)
  s += ((a.liquidity?.lockedPercent || 0) / 100) * 30;
  
  // Distribution (25)
  const top3 = a.whales?.slice(0, 3).reduce((sum, w) => sum + w.percent, 0) || 50;
  s += ((100 - top3) / 100) * 25;
  
  // Volume (20)
  const volToMC = (a.volume24h / a.marketCap) * 100;
  s += Math.min((volToMC / 20) * 20, 20);
  
  // Safety (25)
  s += (a.safetyScore / 100) * 25;
  
  return Math.round(s);
}

// ============================================
// LABEL HELPERS
// ============================================
export const labels = {
  safety: (s) => s >= 80 ? 'Excelente' : s >= 60 ? 'Bueno' : s >= 40 ? 'Moderado' : s >= 20 ? 'Riesgoso' : 'Peligroso',
  momentum: (s) => s >= 70 ? 'Fuerte' : s >= 50 ? 'Alcista' : s >= 30 ? 'Neutral' : s >= 15 ? 'Bajista' : 'Débil',
  rsi: (r) => r > 70 ? 'Sobrecomprado ⚠️' : r < 30 ? 'Sobrevendido 💰' : r >= 45 && r <= 65 ? 'Zona óptima ✅' : 'Neutral',
  health: (h) => h >= 80 ? '🟢 Excelente' : h >= 60 ? '🔵 Bueno' : h >= 40 ? '🟡 Regular' : h >= 20 ? '🟠 Malo' : '🔴 Crítico',
};

// ============================================
// CHART LABEL FORMATTER
// ============================================
export const chartLabels = {
  whales: 'Whales',
  liquidity: 'Liquidez',
  contract: 'Contrato',
  team: 'Equipo',
  audit: 'Auditoría',
  volumeTrend: 'Volumen',
  priceChange: 'Precio 24h',
  pricePosition: 'Posición',
  rsi: 'RSI',
  holdersGrowth: 'Holders',
};
