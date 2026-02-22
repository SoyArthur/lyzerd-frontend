'use client';

import { useRef, useEffect, useState } from 'react';
import Tooltip from './Tooltip';
import { getColor, T, C, labels, chartLabels } from './utilities';

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

export default function AnalysisCard({ title, score, breakdown, type, hasRSI = false, isDark = true }) {
  const [ref, show] = useLOD();
  const colors = C(isDark);
  const maxScore = hasRSI ? 100 : (type === 'momentum' ? 70 : 100);
  const color = getColor(score, T[type]);
  const label = labels[type](score);
  
  if (!show) return <div ref={ref} className="h-96 bg-gray-900/50 rounded-lg animate-pulse" />;
  
  return (
    <div ref={ref} className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 backdrop-blur-sm transition-all duration-300 hover:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold font-mono tracking-tight bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
          {title}
        </h3>
        <Tooltip content={getTooltip(type)}>
          <span className="text-xs text-gray-500 cursor-help">?</span>
        </Tooltip>
      </div>
      
      {/* Score */}
      <div className="mb-6">
        <div className={`text-5xl font-bold ${colors[color].text} mb-2 font-mono`}>
          {score}
          <span className="text-2xl text-gray-500">/{maxScore}</span>
        </div>
        <div className="text-sm text-gray-400 font-mono">{label}</div>
        
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors[color].bg} transition-all duration-500`}
            style={{ width: `${(score / maxScore) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Breakdown */}
      {breakdown && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-500 uppercase font-mono tracking-wider">
            Breakdown
          </div>
          
          {type === 'safety' && (
            <>
              <Item data={breakdown.whales} label="Whale Distribution" tooltip="Score based on top holder distribution and identification" />
              <Item data={breakdown.liquidity} label="Liquidity" tooltip="Total liquidity and % locked in pools" />
              <Item data={breakdown.contract} label="Contract" tooltip="Contract verification, mint/freeze permissions" />
              <Item data={breakdown.team} label="Team" tooltip="Team transparency and doxxing status" />
              <Item data={breakdown.audit} label="Audit" tooltip="Professional security audits" />
            </>
          )}
          
          {type === 'momentum' && (
            <>
              <Item data={breakdown.volumeTrend} label="Volume Trend" tooltip="24h volume and volume change %" />
              <Item data={breakdown.priceChange} label="Price Change" tooltip="24h price movement" details={{ value: breakdown.priceChange?.value }} />
              <Item data={breakdown.pricePosition} label="Price Position" tooltip="Current price vs ATH/ATL range" />
              {hasRSI && (
                <>
                  <Item data={breakdown.rsi} label="RSI" tooltip="Relative Strength Index (14 periods)" details={{ value: breakdown.rsi?.value }} />
                  <Item data={breakdown.holdersGrowth} label="Holders Growth" tooltip="24h change in holder count" details={{ value: breakdown.holdersGrowth?.value }} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ data, label, tooltip, details, isDark = true }) {
  const colors = C(isDark);
  if (!data) return null;
  
  const { score, max } = data;
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = getColor(pct, [[80, 'green'], [60, 'blue'], [40, 'yellow'], [0, 'orange']]);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1">
          <span className="text-gray-300">{label}</span>
          <Tooltip content={
            <div className="space-y-1">
              <div className="font-bold">{label}</div>
              <div>{tooltip}</div>
              <div>Score: {score}/{max}</div>
              {details && <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">{JSON.stringify(details, null, 2)}</div>}
            </div>
          }>
            <span className="text-gray-500 cursor-help">?</span>
          </Tooltip>
        </div>
        <span className="text-gray-500">{score}/{max}</span>
      </div>
      
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color].bg} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getTooltip(type) {
  if (type === 'safety') {
    return (
      <div className="space-y-1 font-mono">
        <div className="font-bold">Safety Score (0-100)</div>
        <div className="text-xs">Evalúa seguridad del token:</div>
        <ul className="text-xs list-disc list-inside space-y-1 mt-2">
          <li>Whale distribution (30pts)</li>
          <li>Liquidity & locks (25pts)</li>
          <li>Contract verification (20pts)</li>
          <li>Team transparency (15pts)</li>
          <li>Security audits (10pts)</li>
        </ul>
      </div>
    );
  }
  
  return (
    <div className="space-y-1 font-mono">
      <div className="font-bold">Momentum Score</div>
      <div className="text-xs">Quick: 0-70 | Deep (con RSI): 0-100</div>
      <ul className="text-xs list-disc list-inside space-y-1 mt-2">
        <li>Volume trend (25pts)</li>
        <li>Price change (20-25pts)</li>
        <li>Price position (10-20pts)</li>
        <li>RSI - deep only (30pts)</li>
        <li>Holders growth - deep only (15pts)</li>
      </ul>
    </div>
  );
}
