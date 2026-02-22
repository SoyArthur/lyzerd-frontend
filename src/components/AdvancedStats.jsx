'use client';

import { useState, useRef, useEffect } from 'react';
import Tooltip from './Tooltip';
import { fmt, getColor, T, C, calcHealth, labels, analyzeWhales } from './utilities';

const useLOD = () => {
  const ref = useRef();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { threshold: 0.1 });
    ref.current && obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, show];
};

export default function AdvancedStats({ analysis, historicalData, isDark = true }) {
  const [tab, setTab] = useState('overview');
  const [ref, show] = useLOD();
  const colors = C(isDark);
  
  if (!analysis) return null;
  if (!show) return <div ref={ref} className="h-96 bg-gray-900/50 rounded-xl animate-pulse" />;
  
  const tabs = [
    { id: 'overview', label: '📊 Resumen', icon: '📊' },
    { id: 'distribution', label: '🐋 Distribución', icon: '🐋' },
    { id: 'performance', label: '📈 Performance', icon: '📈' },
    { id: 'health', label: '❤️ Salud', icon: '❤️' },
  ];
  
  return (
    <div ref={ref} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-3 text-sm font-bold font-mono transition-all ${
              tab === t.id
                ? 'bg-green-500/20 text-green-400 border-b-2 border-green-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
            }`}
          >
            <span className="mr-2">{t.icon}</span>
            <span className="hidden md:inline">{t.label.split(' ')[1]}</span>
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-6">
        {tab === 'overview' && <Overview a={analysis} h={historicalData} colors={colors} />}
        {tab === 'distribution' && <Distribution a={analysis} colors={colors} />}
        {tab === 'performance' && <Performance a={analysis} h={historicalData} colors={colors} />}
        {tab === 'health' && <Health a={analysis} colors={colors} />}
      </div>
    </div>
  );
}

// ============================================
// OVERVIEW TAB
// ============================================
function Overview({ a, h, colors }) {
  const mcCat = a.marketCap >= 1e9 ? 'Large' : a.marketCap >= 100e6 ? 'Medium' : a.marketCap >= 10e6 ? 'Small' : 'Micro';
  const volToMC = a.volume24h / a.marketCap;
  const s = h?.stats || {};
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Market Cap" value={fmt.curr(a.marketCap)} sub={mcCat} color={mcCat === 'Large' ? 'green' : mcCat === 'Small' ? 'red' : 'blue'} colors={colors} />
        <Card label="Volumen 24h" value={fmt.curr(a.volume24h)} sub={`${(volToMC * 100).toFixed(1)}% del MC`} color={volToMC > 0.1 ? 'green' : 'yellow'} colors={colors} />
        <Card label="Holders" value={fmt.int(a.holders)} sub={`${a.holdersChange24h >= 0 ? '+' : ''}${a.holdersChange24h || 0} hoy`} color={a.holdersChange24h > 0 ? 'green' : 'red'} colors={colors} />
        <Card label="Liquidez Locked" value={`${a.liquidity?.lockedPercent || 0}%`} sub={a.liquidity?.lockedPercent > 80 ? 'Muy seguro' : a.liquidity?.lockedPercent > 50 ? 'Moderado' : 'Riesgoso'} color={a.liquidity?.lockedPercent > 80 ? 'green' : a.liquidity?.lockedPercent > 50 ? 'yellow' : 'red'} colors={colors} />
      </div>
      
      {s.min && (
        <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-800">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2 font-mono text-gray-300">💰 Stats Precio (30d)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div><div className="text-xs text-gray-500 mb-1 font-mono">Mínimo</div><div className={`text-lg font-bold ${colors.red.text} font-mono`}>${s.min.toFixed(8)}</div></div>
            <div><div className="text-xs text-gray-500 mb-1 font-mono">Promedio</div><div className={`text-lg font-bold ${colors.blue.text} font-mono`}>${s.avg.toFixed(8)}</div></div>
            <div><div className="text-xs text-gray-500 mb-1 font-mono">Máximo</div><div className={`text-lg font-bold ${colors.green.text} font-mono`}>${s.max.toFixed(8)}</div></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-sm font-mono">
            <span className="text-gray-500">Cambio Total:</span>
            <span className={`font-bold ${colors[getColor(s.change, T.change)].text}`}>{fmt.pct(s.change)}</span>
          </div>
        </div>
      )}
      
      {a.ath && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-500 mb-2 font-mono">ATH</div>
            <div className={`text-2xl font-bold ${colors.green.text} mb-1 font-mono`}>${a.ath.toFixed(8)}</div>
            <div className="text-xs text-gray-500 font-mono">{((a.ath - a.price) / a.ath * 100).toFixed(1)}% abajo</div>
          </div>
          <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-500 mb-2 font-mono">ATL</div>
            <div className={`text-2xl font-bold ${colors.red.text} mb-1 font-mono`}>${a.atl.toFixed(8)}</div>
            <div className="text-xs text-gray-500 font-mono">{((a.price - a.atl) / a.atl * 100).toFixed(1)}% arriba</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// DISTRIBUTION TAB
// ============================================
function Distribution({ a, colors }) {
  if (!a.whales?.length) return <div className="text-center py-8 text-gray-500 font-mono">Sin datos</div>;
  
  const top10 = a.whales.slice(0, 10);
  const top10Pct = top10.reduce((sum, w) => sum + w.percent, 0);
  const identified = top10.filter(w => w.name).length;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-950/50 rounded-lg p-4 text-center border border-gray-800">
          <div className={`text-3xl font-bold ${colors.blue.text} mb-1 font-mono`}>{top10Pct.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 font-mono">Top 10</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-4 text-center border border-gray-800">
          <div className={`text-3xl font-bold ${colors.green.text} mb-1 font-mono`}>{identified}</div>
          <div className="text-xs text-gray-500 font-mono">Identificados</div>
        </div>
        <div className="bg-gray-950/50 rounded-lg p-4 text-center border border-gray-800">
          <div className={`text-3xl font-bold ${colors.orange.text} mb-1 font-mono`}>{10 - identified}</div>
          <div className="text-xs text-gray-500 font-mono">Anónimos</div>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-bold mb-3 font-mono text-gray-300">🐋 Top 10 Whales</h4>
        <div className="space-y-2">
          {top10.map((w, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-950/50 rounded-lg hover:bg-gray-900/70 transition-colors border border-gray-800">
              <div className="text-sm font-bold text-gray-600 w-6 font-mono">#{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate text-gray-200 font-mono">{w.name || fmt.addr(w.address)}</div>
                <div className="text-xs text-gray-500 capitalize font-mono">{w.category}</div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${colors.green.text} font-mono`}>{w.percent.toFixed(2)}%</div>
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
                  <div className={`h-full ${colors.green.bg}`} style={{ width: `${Math.min(w.percent * 2, 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PERFORMANCE TAB
// ============================================
function Performance({ a, h, colors }) {
  const changes = [
    { label: '24h', value: a.priceChange24h },
    { label: '7d', value: a.priceChange7d },
    { label: '30d', value: a.priceChange30d },
  ];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {changes.map(({ label, value }) => (
          <div key={label} className="bg-gray-950/50 rounded-lg p-4 text-center border border-gray-800">
            <div className="text-xs text-gray-500 mb-2 font-mono">{label}</div>
            <div className={`text-2xl font-bold ${colors[getColor(value, T.change)].text} font-mono`}>{fmt.pct(value)}</div>
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full ${colors[getColor(value, T.change)].bg}`} style={{ width: `${Math.min(Math.abs(value), 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      
      {a.rsi && (
        <div className="bg-gray-950/50 rounded-lg p-4 text-center border border-gray-800">
          <div className="text-xs text-gray-500 mb-2 font-mono">RSI (14)</div>
          <div className={`text-4xl font-bold ${colors[getColor(a.rsi, T.rsi)].text} font-mono`}>{a.rsi}</div>
          <div className="text-sm text-gray-500 mt-2 font-mono">{labels.rsi(a.rsi)}</div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HEALTH TAB
// ============================================
function Health({ a, colors }) {
  const h = calcHealth(a);
  const wa = analyzeWhales(a.whales);
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`text-6xl font-bold ${colors[getColor(h, T.health)].text} mb-2 font-mono`}>{h}</div>
        <div className="text-lg text-gray-400 mb-2 font-mono">{labels.health(h)}</div>
        <div className="text-sm text-gray-500 font-mono">{h >= 80 ? 'Token muy saludable, bajo riesgo' : h >= 60 ? 'Token en buen estado, riesgo moderado' : h >= 40 ? 'Token con algunos problemas, monitorear' : 'Token con problemas, alto riesgo'}</div>
      </div>
      
      <div className="space-y-2 text-sm font-mono">
        {h >= 80 && <div className={colors.green.text}>✅ Excelente estado - Bajo riesgo para holder</div>}
        {h >= 60 && h < 80 && <div className={colors.blue.text}>💧 Buen estado - Riesgo moderado, monitorear</div>}
        {h < 60 && <div className={colors.red.text}>⚠️ Con problemas - Alto riesgo, cuidado</div>}
        {(a.liquidity?.lockedPercent || 0) < 50 && <div className={colors.orange.text}>🔒 Mejora: Aumentar liquidez locked</div>}
        {wa.top5Pct > 60 && <div className={colors.orange.text}>🐋 Mejora: Diversificar distribución</div>}
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================
function Card({ label, value, sub, color, colors }) {
  return (
    <div className="bg-gray-950/50 rounded-lg p-4 border border-gray-800">
      <div className="text-xs text-gray-500 mb-1 font-mono">{label}</div>
      <div className={`text-xl font-bold mb-1 ${colors[color].text} font-mono`}>{value}</div>
      <div className="text-xs text-gray-500 font-mono">{sub}</div>
    </div>
  );
}
