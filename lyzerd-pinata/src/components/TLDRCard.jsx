'use client';

import { useState } from 'react';
import { C } from './utilities';

export default function TLDRCard({ analysis, language = 'es', isDark = true }) {
  const [exp, setExp] = useState(false);
  
  if (!analysis?.aiAnalysis) return null;
  
  const tldr = extract(analysis.aiAnalysis, 'tldr');
  const scales = extract(analysis.aiAnalysis, 'scales');
  const type = extract(analysis.aiAnalysis, 'type');
  const colors = C(isDark);
  
  if (!tldr) return null;
  
  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-green-900/20 border-2 border-blue-500/30 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="bg-blue-500/10 px-6 py-4 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="text-lg font-bold font-mono tracking-tight bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                {language === 'es' ? 'RESUMEN EJECUTIVO' : 'EXECUTIVE SUMMARY'}
              </h3>
              <div className="text-xs text-gray-500 font-mono">
                {language === 'es' ? 'Lo que necesitas saber YA' : 'What you need to know NOW'}
              </div>
            </div>
          </div>
          
          {type && <Badge type={type} lang={language} />}
        </div>
      </div>
      
      {/* Content */}
      <div className="px-6 py-5">
        <div className="text-base leading-relaxed text-gray-200 whitespace-pre-line font-mono">
          {tldr}
        </div>
        
        {/* Scales */}
        {scales && (
          <div className="mt-6 pt-6 border-t border-gray-800 space-y-4">
            {scales.risk != null && <Scale label={language === 'es' ? 'Riesgo de inversión' : 'Investment risk'} value={scales.risk} max={10} color="red" icon="⚠️" colors={colors} />}
            {scales.shortTerm != null && <Scale label={language === 'es' ? 'Potencial (corto plazo)' : 'Potential (short-term)'} value={scales.shortTerm} max={10} color="green" icon="🚀" colors={colors} />}
            {scales.longTerm != null && <Scale label={language === 'es' ? 'Potencial (largo plazo)' : 'Potential (long-term)'} value={scales.longTerm} max={10} color="blue" icon="🎯" colors={colors} />}
          </div>
        )}
        
        {/* Expand */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <button
            onClick={() => setExp(!exp)}
            className="w-full text-sm text-blue-400 hover:text-green-400 transition-colors flex items-center justify-center gap-2 font-mono"
          >
            <span>{exp ? (language === 'es' ? 'Ver menos' : 'Show less') : (language === 'es' ? 'Ver análisis completo' : 'See full analysis')}</span>
            <span className="transform transition-transform" style={{ transform: exp ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
        </div>
      </div>
      
      {/* Full */}
      {exp && (
        <div className="px-6 pb-6">
          <div className="bg-gray-950/50 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-line leading-relaxed font-mono">
            {analysis.aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
}

function Scale({ label, value, max, color, icon, colors }) {
  const pct = (value / max) * 100;
  const c = colors[color];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-gray-300 font-mono">{label}</span>
        </div>
        <div className={`text-xl font-bold ${c.text} font-mono`}>{value}/{max}</div>
      </div>
      
      <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
        <div className={`h-full ${c.bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 font-mono">
        <span>{value <= 3 ? '✅ Bajo' : value <= 6 ? '⚠️ Medio' : '💀 Alto'}</span>
        <span>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

function Badge({ type, lang }) {
  const badges = {
    es: {
      SEGURA: { c: 'bg-green-500/20 text-green-400 border-green-500', i: '✅' },
      CONSERVADORA: { c: 'bg-blue-500/20 text-blue-400 border-blue-500', i: '🛡️' },
      MODERADA: { c: 'bg-yellow-500/20 text-yellow-400 border-yellow-500', i: '⚖️' },
      ARRIESGADA: { c: 'bg-orange-500/20 text-orange-400 border-orange-500', i: '🎲' },
      PELIGROSA: { c: 'bg-red-500/20 text-red-400 border-red-500', i: '⚠️' },
      SUICIDA: { c: 'bg-red-700/20 text-red-300 border-red-700', i: '💀' },
    },
    en: {
      SAFE: { c: 'bg-green-500/20 text-green-400 border-green-500', i: '✅' },
      CONSERVATIVE: { c: 'bg-blue-500/20 text-blue-400 border-blue-500', i: '🛡️' },
      MODERATE: { c: 'bg-yellow-500/20 text-yellow-400 border-yellow-500', i: '⚖️' },
      RISKY: { c: 'bg-orange-500/20 text-orange-400 border-orange-500', i: '🎲' },
      DANGEROUS: { c: 'bg-red-500/20 text-red-400 border-red-500', i: '⚠️' },
      SUICIDAL: { c: 'bg-red-700/20 text-red-300 border-red-700', i: '💀' },
    },
  };
  
  const b = badges[lang][type];
  if (!b) return null;
  
  return (
    <div className={`px-4 py-2 rounded-lg border ${b.c} flex items-center gap-2 font-mono`}>
      <span className="text-lg">{b.i}</span>
      <span className="text-sm font-bold">{type}</span>
    </div>
  );
}

function extract(text, what) {
  if (what === 'tldr') {
    const m = text.match(/\*\*TL;DR\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    return m ? m[1].trim() : null;
  }
  
  if (what === 'scales') {
    const s = {};
    const r = text.match(/Riesgo de inversión:?\s*(\d+)\/(\d+)|Investment risk:?\s*(\d+)\/(\d+)/i);
    if (r) s.risk = parseInt(r[1] || r[3]);
    
    const st = text.match(/Potencial.*corto plazo.*:?\s*(\d+)\/(\d+)|Short-term.*potential.*:?\s*(\d+)\/(\d+)/i);
    if (st) s.shortTerm = parseInt(st[1] || st[3]);
    
    const lt = text.match(/Potencial.*largo plazo.*:?\s*(\d+)\/(\d+)|Long-term.*potential.*:?\s*(\d+)\/(\d+)/i);
    if (lt) s.longTerm = parseInt(lt[1] || lt[3]);
    
    return Object.keys(s).length > 0 ? s : null;
  }
  
  if (what === 'type') {
    const types = ['SEGURA', 'CONSERVADORA', 'MODERADA', 'ARRIESGADA', 'PELIGROSA', 'SUICIDA', 'SAFE', 'CONSERVATIVE', 'MODERATE', 'RISKY', 'DANGEROUS', 'SUICIDAL'];
    for (const t of types) {
      if (text.includes(t)) return t;
    }
    return null;
  }
}
