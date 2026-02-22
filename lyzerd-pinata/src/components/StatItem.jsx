'use client';

import { useRef, useEffect, useState } from 'react';
import Tooltip from './Tooltip';
import { fmt, getColor, T, C, labels } from './utilities';

// ============================================
// LOD HOOK
// ============================================
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

// ============================================
// UNIFIED METRIC COMPONENT
// ============================================
export default function Metric({ label, value, change, tooltip, icon = '📊', type = 'default', analysis, isDark = true }) {
  const [ref, show] = useLOD();
  const colors = C(isDark);
  
  if (!show) return <div ref={ref} className="h-24 bg-gray-900/50 rounded-lg animate-pulse" />;
  
  // Type-specific rendering
  if (type === 'holders') return <HoldersMetric ref={ref} analysis={analysis} colors={colors} />;
  if (type === 'rsi') return <RSIMetric ref={ref} value={value} colors={colors} />;
  
  // Default metric
  const color = change != null ? getColor(change, T.change) : 'blue';
  
  return (
    <div ref={ref} className="relative overflow-hidden group">
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/70">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{icon}</span>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">{label}</span>
            {tooltip && (
              <Tooltip content={tooltip}>
                <span className="text-xs text-gray-500 cursor-help">?</span>
              </Tooltip>
            )}
          </div>
        </div>
        
        <div className={`text-2xl font-bold ${colors[color].text} mb-1 font-mono`}>
          {value}
        </div>
        
        {change != null && !isNaN(change) && (
          <div className={`text-sm ${colors[getColor(change, T.change)].text} font-mono`}>
            {fmt.pct(change)}
          </div>
        )}
      </div>
      
      {/* Subtle glow on hover */}
      <div className={`absolute inset-0 ${colors[color].glow} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl pointer-events-none`} />
    </div>
  );
}

// ============================================
// HOLDERS METRIC (special case)
// ============================================
const HoldersMetric = ({ analysis, colors }) => {
  const { holders, holdersChange24h } = analysis;
  const growthPct = holders > 0 ? ((holdersChange24h / holders) * 100).toFixed(2) : 0;
  const color = getColor(holdersChange24h, T.change);
  
  const emoji = holdersChange24h > 100 ? '🚀' : holdersChange24h > 50 ? '📈' : holdersChange24h > 0 ? '👥' : holdersChange24h < -50 ? '📉' : '😐';
  
  return (
    <div className="relative overflow-hidden">
      {holdersChange24h > 100 && (
        <div className="absolute inset-0 bg-green-500/10 animate-pulse rounded-lg" />
      )}
      
      <div className="relative bg-gray-900/50 border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{emoji}</span>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Holders</span>
            <Tooltip content={`Total: ${fmt.int(holders)} | Cambio 24h: ${holdersChange24h >= 0 ? '+' : ''}${holdersChange24h} | Crecimiento: ${growthPct}%`}>
              <span className="text-xs text-gray-500 cursor-help">?</span>
            </Tooltip>
          </div>
        </div>
        
        <div className={`text-2xl font-bold ${colors[color].text} mb-1 font-mono`}>
          {fmt.int(holders)}
        </div>
        
        {holdersChange24h !== 0 && (
          <div className="space-y-1">
            <div className={`text-sm font-bold ${colors[color].text} font-mono`}>
              {holdersChange24h > 0 ? '+' : ''}{fmt.int(holdersChange24h)}
            </div>
            <div className="text-xs text-gray-500 font-mono">
              ({growthPct > 0 ? '+' : ''}{growthPct}% hoy)
            </div>
          </div>
        )}
        
        {Math.abs(growthPct) > 0.1 && (
          <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[color].bg} transition-all duration-500`}
              style={{ width: `${Math.min(Math.abs(parseFloat(growthPct)), 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// RSI METRIC (special case)
// ============================================
const RSIMetric = ({ value, colors }) => {
  const color = getColor(value, T.rsi);
  
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📈</span>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">RSI (14)</span>
          <Tooltip content="Relative Strength Index - indica si está sobrecomprado o sobrevendido">
            <span className="text-xs text-gray-500 cursor-help">?</span>
          </Tooltip>
        </div>
      </div>
      
      <div className={`text-2xl font-bold ${colors[color].text} mb-1 font-mono`}>
        {value}
      </div>
      
      <div className="text-xs text-gray-500 font-mono">
        {labels.rsi(value)}
      </div>
    </div>
  );
};

// ============================================
// STATS GRID - Replacement for ImprovedStatsSection
// ============================================
export function StatsGrid({ analysis, isDark = true }) {
  const [ref, show] = useLOD();
  const colors = C(isDark);
  
  if (!show) return <div ref={ref} className="h-48 bg-gray-900/50 rounded-xl animate-pulse" />;
  
  const growthPct = analysis.holders > 0 ? ((analysis.holdersChange24h / analysis.holders) * 100).toFixed(2) : 0;
  
  return (
    <div ref={ref} className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📊</span>
        <h3 className="text-xl font-bold font-mono tracking-tight bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          MÉTRICAS CLAVE
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Market Cap" value={fmt.curr(analysis.marketCap)} tooltip="Capitalización de mercado total" icon="💰" isDark={isDark} />
        <Metric label="Volumen 24h" value={fmt.curr(analysis.volume24h)} change={analysis.volumeChange} tooltip="Volumen de trading en las últimas 24 horas" icon="📊" isDark={isDark} />
        <Metric label="Holders" type="holders" analysis={analysis} isDark={isDark} />
        {analysis.rsi ? (
          <Metric label="RSI (14)" type="rsi" value={analysis.rsi} isDark={isDark} />
        ) : (
          <Metric label="Precio 24h" value={fmt.pct(analysis.priceChange24h)} tooltip="Cambio de precio en 24 horas" icon="💹" isDark={isDark} />
        )}
      </div>
      
      {/* Additional info bar */}
      <div className="mt-6 pt-6 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-500 mb-1 font-mono">Liquidez Locked</div>
          <div className={`text-lg font-bold font-mono ${colors[getColor(analysis.liquidity?.lockedPercent || 0, [[80, 'green'], [50, 'yellow'], [0, 'red']])].text}`}>
            {analysis.liquidity?.lockedPercent || 0}%
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1 font-mono">Top 3 Whales</div>
          <div className="text-lg font-bold text-blue-400 font-mono">
            {analysis.whales ? analysis.whales.slice(0, 3).reduce((sum, w) => sum + w.percent, 0).toFixed(1) : 0}%
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-500 mb-1 font-mono">Whales ID</div>
          <div className="text-lg font-bold text-green-400 font-mono">
            {analysis.whales ? analysis.whales.filter(w => w.name).length : 0}/{analysis.whales?.length || 0}
          </div>
        </div>
      </div>
      
      {/* Cache info */}
      {analysis.cached && (
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-xs font-mono">
          <span className="text-blue-400">⚡</span>
          <span className="text-gray-500">
            Cache hit • {analysis.metadata?.cacheHitPercent || 0}% fresh
          </span>
          {analysis.fromBuffer && <span className="text-green-400">(Gratis)</span>}
        </div>
      )}
    </div>
  );
}
