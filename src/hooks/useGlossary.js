import { useMemo } from 'react';

// ============================================
// THRESHOLDS (del scoring system)
// ============================================
const THRESHOLDS = {
  concentration: { safe: 0.4, risky: 0.6, extreme: 0.7 },
  liqDepth: { thin: 0.01, moderate: 0.05, healthy: 0.1 },
  volToLiq: { healthy: [0.5, 1.5], synthetic: 2.0, dead: 0.3 },
  volRate: { low: 0.05, moderate: 0.2, high: 0.5 },
  mcFdv: { healthy: 0.7, concerning: 0.5, critical: 0.3 },
  circulation: { low: 0.5, healthy: 0.7, full: 0.9 },
  rsi: { oversold: 0.25, balanced: [0.4, 0.6], overbought: 0.75 },
  lockedLiq: { critical: 0.3, moderate: 0.5, safe: 0.8 }
};

// ============================================
// SCENARIOS (español/inglés)
// ============================================
const SCENARIOS = {
  concentration_risk: {
    high: {
      impact: '⚠️ Riesgo ALTO de dump coordinado',
      detail: 'Las ballenas controlan el mercado. Liquidación coordinada puede borrar 60-70% del valor en minutos.',
      trigger: 'Decisión de grupo pequeño de ballenas',
      timeframe: 'minutos a horas',
    },
    medium: {
      impact: '💧 Riesgo MODERADO de manipulación',
      detail: 'Venta coordinada puede causar caídas del 30-45%.',
      trigger: 'Toma de ganancias sincronizada',
      timeframe: '1-3 días',
    },
    low: {
      impact: '✅ Distribución SALUDABLE',
      detail: 'Distribución descentralizada reduce riesgo de manipulación.',
      trigger: 'N/A',
      timeframe: 'riesgo mitigado',
    }
  },
  
  volume_liquidity_ratio: {
    synthetic: {
      impact: '🤖 Volumen ARTIFICIAL detectado',
      detail: 'Volumen inflado por bots o wash trading. Espera impacto de precio 12-18% en órdenes reales.',
      trigger: 'Órdenes reales chocan con liquidez limitada',
      timeframe: 'al ejecutar',
    },
    healthy: {
      impact: '✅ Proporción SALUDABLE',
      detail: 'Volumen y liquidez balanceados. Puedes operar sin impacto significativo.',
      trigger: 'N/A',
      timeframe: 'protección normal',
    },
    dead: {
      impact: '💀 Mercado MUERTO',
      detail: 'Casi sin actividad real. Cualquier orden mueve el precio significativamente.',
      trigger: 'Falta de traders activos',
      timeframe: 'problema persistente',
    }
  },
  
  liquidity_depth: {
    thin: {
      impact: '⚠️ Liquidez PELIGROSAMENTE BAJA',
      detail: 'Alto riesgo de impacto. Solo órdenes pequeñas pueden ejecutarse sin mover precio 15-30%.',
      trigger: 'Tu orden consume porcentaje significativo',
      timeframe: 'al ejecutar',
    },
    moderate: {
      impact: '💧 Liquidez MODERADA',
      detail: 'Soporta operaciones pequeñas a medianas. Órdenes grandes empiezan a impactar 3-8%.',
      trigger: 'Órdenes grandes impactan',
      timeframe: 'durante ejecución',
    },
    deep: {
      impact: '✅ Liquidez PROFUNDA',
      detail: 'Soporta operaciones institucionales. El mercado absorbe sin problema.',
      trigger: 'N/A',
      timeframe: 'protección alta',
    }
  },
  
  rsi_extreme: {
    overbought: {
      impact: '🔥 SOBRECOMPRA EXTREMA',
      detail: 'RSI >75 históricamente precede correcciones del 18-28% en 2-3 semanas.',
      trigger: 'Sobrecompra técnica + toma de ganancias masiva',
      timeframe: '2-3 semanas',
    },
    oversold: {
      impact: '❄️ SOBREVENTA EXTREMA',
      detail: 'RSI <25 genera rebotes técnicos del 25-45% en 1-2 semanas (68% de casos históricos).',
      trigger: 'Sobreventa + compras de value hunters',
      timeframe: '1-2 semanas',
    },
    balanced: {
      impact: '⚖️ RSI BALANCEADO',
      detail: 'Indicador técnico en zona neutral. Sin señales extremas.',
      trigger: 'N/A',
      timeframe: 'neutral',
    }
  },
  
  mcfdv_ratio: {
    healthy: {
      impact: '✅ Baja DILUCIÓN futura',
      detail: 'Mayoría del supply ya circulando. Protección contra dilución.',
      trigger: 'N/A',
      timeframe: 'bajo riesgo',
    },
    concerning: {
      impact: '💧 DILUCIÓN moderada pendiente',
      detail: 'Unlocks futuros pueden causar presión bajista del 15-30%.',
      trigger: 'Desbloqueos programados',
      timeframe: 'según vesting',
    },
    critical: {
      impact: '⚠️ DILUCIÓN MASIVA pendiente',
      detail: 'Supply bloqueado puede inundar mercado. Riesgo de colapso 50-80% en unlocks.',
      trigger: 'Unlocks masivos team/VC',
      timeframe: 'según cliff/vesting',
    }
  }
};

// ============================================
// HOOK
// ============================================
export const useGlossary = (tokenData) => {
  return useMemo(() => {
    if (!tokenData) return {};
    
    // Calcular ratios
    const whaleConc = (tokenData.top10HoldersPercent || 0) / 100;
    const volAbs = tokenData.volume24h || 0;
    const liqAbs = tokenData.liquidity || 0;
    const mcAbs = tokenData.marketCap || 0;
    const liqDepth = liqAbs > 0 && mcAbs > 0 ? liqAbs / mcAbs : 0;
    const volToLiq = volAbs > 0 && liqAbs > 0 ? volAbs / liqAbs : 0;
    const rsi = (tokenData.rsi14 || 50) / 100;
    const mcFdv = tokenData.fdv && mcAbs ? mcAbs / tokenData.fdv : 1;
    
    // Determinar escenarios
    const getScenario = (type, ratio, thresholds, scenarios) => {
      let key;
      switch (type) {
        case 'concentration_risk':
          key = ratio > thresholds.extreme ? 'high' 
            : ratio > thresholds.safe ? 'medium' 
            : 'low';
          break;
        case 'volume_liquidity_ratio':
          key = ratio > thresholds.synthetic ? 'synthetic'
            : ratio < thresholds.dead ? 'dead'
            : 'healthy';
          break;
        case 'liquidity_depth':
          key = ratio < thresholds.thin ? 'thin'
            : ratio < thresholds.healthy ? 'moderate'
            : 'deep';
          break;
        case 'rsi_extreme':
          key = ratio > thresholds.overbought ? 'overbought'
            : ratio < thresholds.oversold ? 'oversold'
            : 'balanced';
          break;
        case 'mcfdv_ratio':
          key = ratio > thresholds.healthy ? 'healthy'
            : ratio > thresholds.concerning ? 'concerning'
            : 'critical';
          break;
        default:
          return null;
      }
      
      const scenario = scenarios[key];
      if (!scenario) return null;
      
      return {
        ...scenario,
        ratio: ratio,
        severity: key === 'high' || key === 'synthetic' || key === 'thin' || key === 'overbought' || key === 'critical' ? 'high'
          : key === 'medium' || key === 'moderate' || key === 'concerning' || key === 'dead' ? 'medium'
          : 'low'
      };
    };
    
    return {
      concentration: getScenario('concentration_risk', whaleConc, THRESHOLDS.concentration, SCENARIOS.concentration_risk),
      volLiq: getScenario('volume_liquidity_ratio', volToLiq, THRESHOLDS.volToLiq, SCENARIOS.volume_liquidity_ratio),
      liqDepth: getScenario('liquidity_depth', liqDepth, THRESHOLDS.liqDepth, SCENARIOS.liquidity_depth),
      rsi: getScenario('rsi_extreme', rsi, THRESHOLDS.rsi, SCENARIOS.rsi_extreme),
      mcFdv: getScenario('mcfdv_ratio', mcFdv, THRESHOLDS.mcFdv, SCENARIOS.mcfdv_ratio),
      
      // Valores raw para debug
      _raw: {
        whaleConc: (whaleConc * 100).toFixed(1) + '%',
        volToLiq: volToLiq.toFixed(2) + 'x',
        liqDepth: (liqDepth * 100).toFixed(2) + '%',
        rsi: (rsi * 100).toFixed(0),
        mcFdv: (mcFdv * 100).toFixed(0) + '%'
      }
    };
  }, [tokenData]);
};