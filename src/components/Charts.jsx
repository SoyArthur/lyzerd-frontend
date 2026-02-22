'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, ChartTooltip, Legend, Filler);

const LABELS = {
  liquidityBalance: 'Balance Liquidez', contractSecurity: 'Seguridad Contrato', whaleDistribution: 'Distribución Whales',
  supplyMechanics: 'Mecánicas Supply', holderDistribution: 'Distribución Holders', deflationMechanics: 'Deflación',
  priceTrend: 'Tendencia Precio', technicalIndicators: 'Indicadores Técnicos', volumeMomentum: 'Momentum Volumen',
  holderGrowth: 'Crecimiento Holders', buySellPressure: 'Presión Compra/Venta', transactionActivity: 'Actividad Transacciones',
  socialPresence: 'Presencia Social', documentation: 'Documentación',
  athDistance: 'Distancia ATH', marketCapStability: 'Estabilidad MC', pricePosition: 'Posición Precio'
};

const RELATION_EXPLANATIONS = {
  liqVolMc: {
    name: 'Liq-Vol-MC',
    full: 'Liquidez × Volumen × Market Cap',
    what: 'Coherencia entre liquidez, volumen y capitalización',
    how: 'Compara los ratios para detectar desbalances',
    why: 'Volumen alto + liquidez baja = posible manipulación'
  },
  holderVolPrice: {
    name: 'Holder-Vol-Price',
    full: 'Holders × Volumen × Precio',
    what: 'Relación entre holders, actividad y precio',
    how: 'Analiza si el crecimiento de holders se alinea con volumen y precio',
    why: 'Precio sube sin holders nuevos = pump artificial'
  },
  supplyHolderMc: {
    name: 'Supply-Holder-MC',
    full: 'Supply × Holders × Market Cap',
    what: 'Distribución del supply entre holders vs market cap',
    how: 'Evalúa si la concentración se alinea con la valoración',
    why: 'MC alto con pocos holders = riesgo de concentración'
  },
  ageLiqHolder: {
    name: 'Age-Liq-Holder',
    full: 'Edad × Liquidez × Holders',
    what: 'Madurez del token vs su desarrollo',
    how: 'Compara edad con crecimiento de liquidez y holders',
    why: 'Token viejo sin liquidez = proyecto abandonado'
  },
  athPriceVol: {
    name: 'ATH-Price-Vol',
    full: 'ATH × Precio × Volumen',
    what: 'Distancia del ATH vs actividad actual',
    how: 'Analiza recuperación de precio con volumen',
    why: 'Lejos del ATH con volumen alto = oportunidad o trampa'
  },
  liqVolMcHolder: {
    name: 'Liq-Vol-MC-Holder',
    full: 'Liquidez × Volumen × MC × Holders',
    what: 'Coherencia total del ecosistema',
    how: 'Geometría cuadrada entre 4 métricas clave',
    why: 'Detecta inconsistencias multidimensionales'
  },
  supplyMcLiqAge: {
    name: 'Supply-MC-Liq-Age',
    full: 'Supply × MC × Liquidez × Edad',
    what: 'Fundamentos del token en el tiempo',
    how: 'Evalúa si la valoración se justifica con madurez',
    why: 'Token nuevo con MC alto = red flag'
  },
  priceMomentum: {
    name: 'Price Momentum',
    full: 'Precio 1h × 24h × 7d × 30d',
    what: 'Tendencia consistente del precio',
    how: 'Compara cambios en múltiples timeframes',
    why: 'Momentum alineado = tendencia sostenible'
  },
  rsiWhaleMcLiqVol: {
    name: 'RSI-Whale-MC-Liq-Vol',
    full: 'RSI × Whales × MC × Liquidez × Volumen',
    what: 'Salud técnica + fundamentales',
    how: 'Pentágono que cruza indicadores técnicos y on-chain',
    why: 'RSI alto + whales concentradas = peligro'
  },
  holderVolPriceAgeLiq: {
    name: 'Holder-Vol-Price-Age-Liq',
    full: 'Holders × Volumen × Precio × Edad × Liquidez',
    what: 'Ecosistema completo del token',
    how: 'Geometría pentagonal de todas las dimensiones',
    why: 'Coherencia global = proyecto saludable'
  },
  supplyBurnMcHolderAgeVol: {
    name: 'Supply-Burn-MC-Holder-Age-Vol',
    full: 'Supply × Burn × MC × Holders × Edad × Volumen',
    what: 'Análisis hexagonal completo',
    how: 'Máxima dimensión geométrica posible',
    why: 'La relación más compleja detecta manipulación sofisticada'
  }
};

const useLOD = () => {
  const ref = useRef();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { threshold: 0.05 });
    ref.current && obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, show];
};

const getColorRGBA = (pct) => {
  if (pct >= 80) return 'rgba(74, 222, 128, 0.8)';
  if (pct >= 60) return 'rgba(96, 165, 250, 0.8)';
  if (pct >= 40) return 'rgba(250, 204, 21, 0.8)';
  return 'rgba(248, 113, 113, 0.8)';
};

// ============================================
// GEOMETRIC RELATIONS CHART (SPIDER/RADAR)
// ============================================
export function GeometricRelationsChart({ geometry, type = 'triangles' }) {
  const [ref, show] = useLOD();
  
  if (!show || !geometry) return <div ref={ref} className="h-80 bg-gray-900/30 rounded animate-pulse" />;
  
  const shapeData = geometry[type];
  if (!shapeData) return null;
  
  const entries = Object.entries(shapeData);
  const labels = entries.map(([key]) => RELATION_EXPLANATIONS[key]?.name || key);
  const values = entries.map(([_, val]) => val * 100);
  
  const data = {
    labels,
    datasets: [{
      label: type === 'triangles' ? 'Relaciones Triangulares (3D)' :
             type === 'squares' ? 'Relaciones Cuadradas (4D)' :
             type === 'pentagons' ? 'Relaciones Pentagonales (5D)' :
             'Relaciones Hexagonales (6D)',
      data: values,
      backgroundColor: 'rgba(34, 211, 238, 0.2)',
      borderColor: 'rgba(34, 211, 238, 1)',
      borderWidth: 2,
      pointBackgroundColor: values.map(v => getColorRGBA(v)),
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8
    }]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#d1d5db', font: { size: 11, family: 'monospace' } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const key = entries[ctx.dataIndex][0];
            const exp = RELATION_EXPLANATIONS[key];
            if (!exp) return `${ctx.parsed.r.toFixed(1)}%`;
            return [
              `${exp.full}`,
              `Coherencia: ${ctx.parsed.r.toFixed(1)}%`,
              ``,
              `📊 Qué: ${exp.what}`,
              `🔧 Cómo: ${exp.how}`,
              `⚠️ Por qué: ${exp.why}`
            ];
          }
        },
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#d1d5db',
        borderColor: 'rgba(34, 211, 238, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        bodyFont: { size: 11, family: 'monospace' },
        titleFont: { size: 12, weight: 'bold', family: 'monospace' }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#9ca3af',
          font: { size: 10, family: 'monospace' },
          callback: (v) => v + '%'
        },
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        pointLabels: {
          color: '#d1d5db',
          font: { size: 10, weight: 'bold', family: 'monospace' }
        }
      }
    }
  };
  
  return (
    <div ref={ref} className="space-y-4">
      <div className="h-80"><Radar data={data} options={opts} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {entries.map(([key, val]) => {
          const exp = RELATION_EXPLANATIONS[key];
          if (!exp) return null;
          const pct = (val * 100).toFixed(1);
          const color = val >= 0.8 ? 'text-green-400' : val >= 0.6 ? 'text-blue-400' : val >= 0.4 ? 'text-yellow-400' : 'text-red-400';
          return (
            <div key={key} className="flex items-start gap-2 p-2 bg-gray-800/30 rounded border border-gray-700/50">
              <div className={`font-bold ${color} min-w-[3rem] text-right`}>{pct}%</div>
              <div className="flex-1">
                <div className="font-bold text-gray-300">{exp.name}</div>
                <div className="text-gray-500">{exp.why}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// BREAKDOWN CHART
// ============================================
export function BreakdownChart({ breakdown, type, maxScore = 100 }) {
  const [ref, show] = useLOD();
  
  if (!show) return <div ref={ref} className="h-64 bg-gray-900/30 rounded animate-pulse" />;
  
  const labels = [], dataVals = [], maxVals = [], colors = [];
  
  for (const [k, v] of Object.entries(breakdown)) {
    if (v?.score != null) {
      labels.push(LABELS[k] || k);
      dataVals.push(v.score);
      maxVals.push(v.max);
      colors.push(getColorRGBA((v.score / v.max) * 100));
    }
  }
  
  const data = {
    labels,
    datasets: [
      { label: 'Puntaje', data: dataVals, backgroundColor: colors, borderColor: colors.map(c => c.replace('0.8', '1')), borderWidth: 2 },
      { label: 'Máximo', data: maxVals, backgroundColor: 'rgba(107, 114, 128, 0.2)', borderColor: 'rgba(107, 114, 128, 0.5)', borderWidth: 1 }
    ]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: '#d1d5db', font: { size: 11, family: 'monospace' } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            const max = ctx.datasetIndex === 1 ? val : maxVals[ctx.dataIndex];
            const pct = ((ctx.datasetIndex === 0 ? val : 0) / max * 100).toFixed(1);
            return `${ctx.dataset.label}: ${val}/${max} (${pct}%)`;
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(55, 65, 81, 0.5)' }, ticks: { color: '#9ca3af', font: { family: 'monospace' } } },
      x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10, family: 'monospace' } } }
    }
  };
  
  return <div ref={ref} className="h-64"><Bar data={data} options={opts} /></div>;
}

// ============================================
// WHALES CHART
// ============================================
export function WhalesChart({ whales }) {
  const [ref, show] = useLOD();
  
  if (!show || !whales?.length) return <div ref={ref} className="h-64 bg-gray-900/30 rounded animate-pulse" />;
  
  const top5 = whales.slice(0, 5);
  const othersPct = 100 - top5.reduce((sum, w) => sum + w.percent, 0);
  
  const data = {
    labels: [...top5.map(w => w.name || `Wallet ${w.address?.slice(0, 6)}...`), 'Otros'],
    datasets: [{
      data: [...top5.map(w => w.percent), othersPct],
      backgroundColor: [
        'rgba(74, 222, 128, 0.8)',
        'rgba(96, 165, 250, 0.8)',
        'rgba(250, 204, 21, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(248, 113, 113, 0.8)',
        'rgba(107, 114, 128, 0.4)'
      ],
      borderColor: [
        'rgba(74, 222, 128, 1)',
        'rgba(96, 165, 250, 1)',
        'rgba(250, 204, 21, 1)',
        'rgba(251, 146, 60, 1)',
        'rgba(248, 113, 113, 1)',
        'rgba(107, 114, 128, 0.8)'
      ],
      borderWidth: 2
    }]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right', labels: { color: '#d1d5db', font: { size: 10, family: 'monospace' }, padding: 8 } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(2)}%` } }
    }
  };
  
  return <div ref={ref} className="h-64"><Doughnut data={data} options={opts} /></div>;
}

// ============================================
// PRICE HISTORY CHART
// ============================================
export function PriceHistoryChart({ historicalData, currentPrice, days = 30 }) {
  const [ref, show] = useLOD();
  
  if (!show || !historicalData?.prices) return <div ref={ref} className="h-80 bg-gray-900/30 rounded animate-pulse" />;
  
  const prices = historicalData.prices.slice(-days);
  const vals = prices.map(p => p.value);
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min;
  const first = vals[0], last = vals[vals.length - 1];
  const change = ((last - first) / first) * 100;
  
  const data = {
    labels: prices.map((p, i) => {
      const d = new Date(p.timestamp < 1e12 ? p.timestamp * 1000 : p.timestamp);
      return (i % 3 === 0 || i === prices.length - 1) ? `${d.getDate()}/${d.getMonth() + 1}` : '';
    }),
    datasets: [{
      label: 'Precio (USD)',
      data: vals,
      borderColor: change >= 0 ? 'rgba(74, 222, 128, 1)' : 'rgba(248, 113, 113, 1)',
      backgroundColor: change >= 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 6,
      pointBackgroundColor: change >= 0 ? 'rgba(74, 222, 128, 1)' : 'rgba(248, 113, 113, 1)',
    }]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Cambio ${days}d: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        color: change >= 0 ? '#4ade80' : '#f87171',
        font: { size: 13, weight: 'bold', family: 'monospace' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = ctx.parsed.y;
            const c = ((p - first) / first) * 100;
            return [`Precio: $${p.toFixed(8)}`, `Cambio: ${c >= 0 ? '+' : ''}${c.toFixed(2)}%`];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: min - (range * 0.1),
        max: max + (range * 0.1),
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        ticks: {
          color: '#9ca3af',
          font: { family: 'monospace' },
          callback: (v) => v >= 1 ? '$' + v.toFixed(4) : '$' + v.toFixed(8)
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 9, family: 'monospace' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
      }
    }
  };
  
  return (
    <div ref={ref} className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex gap-4">
          <span className="text-gray-400">Mín: <span className="text-red-400">${min.toFixed(8)}</span></span>
          <span className="text-gray-400">Máx: <span className="text-green-400">${max.toFixed(8)}</span></span>
        </div>
        <span className="text-gray-400">Actual: <span className="text-blue-400">${last.toFixed(8)}</span></span>
      </div>
      
      <div className="h-64"><Line data={data} options={opts} /></div>
      
      <div className="text-xs text-gray-500 text-center font-mono">
        Volatilidad: {((range / min) * 100).toFixed(1)}%
      </div>
    </div>
  );
}

// ============================================
// VOLUME HISTORY CHART
// ============================================
export function VolumeHistoryChart({ historicalData, days = 30 }) {
  const [ref, show] = useLOD();
  
  if (!show || !historicalData?.volumes) return <div ref={ref} className="h-48 bg-gray-900/30 rounded animate-pulse" />;
  
  const vols = historicalData.volumes.slice(-days);
  const avg = vols.reduce((sum, v) => sum + v.value, 0) / vols.length;
  
  const data = {
    labels: vols.map((v, i) => {
      const d = new Date(v.timestamp < 1e12 ? v.timestamp * 1000 : v.timestamp);
      return (i % 3 === 0 || i === vols.length - 1) ? `${d.getDate()}/${d.getMonth() + 1}` : '';
    }),
    datasets: [{
      label: 'Volumen (USD)',
      data: vols.map(v => v.value / 1e6),
      backgroundColor: 'rgba(96, 165, 250, 0.6)',
      borderColor: 'rgba(96, 165, 250, 1)',
      borderWidth: 1,
    }]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `Volumen promedio: $${(avg / 1e6).toFixed(2)}M`, color: '#60a5fa', font: { size: 13, family: 'monospace' } },
      tooltip: { callbacks: { label: (ctx) => `Volumen: $${ctx.parsed.y.toFixed(2)}M` } }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        ticks: { color: '#9ca3af', font: { family: 'monospace' }, callback: (v) => '$' + v.toFixed(1) + 'M' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 9, family: 'monospace' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
      }
    }
  };
  
  return <div ref={ref} className="h-48"><Bar data={data} options={opts} /></div>;
}

// ============================================
// VOLATILITY CHART
// ============================================
export function VolatilityChart({ data, days = 30 }) {
  const [ref, show] = useLOD();
  
  if (!show || !data?.length || data.length < 2) return <div ref={ref} className="h-48 bg-gray-900/30 rounded animate-pulse" />;
  
  const sliced = data.slice(-days);
  const volatilities = [];
  
  for (let i = 1; i < sliced.length; i++) {
    const curr = sliced[i].value || sliced[i].close || sliced[i];
    const prev = sliced[i-1].value || sliced[i-1].close || sliced[i-1];
    if (prev > 0) {
      const change = Math.abs((curr - prev) / prev) * 100;
      volatilities.push({ timestamp: sliced[i].timestamp, value: change });
    }
  }
  
  const avg = volatilities.reduce((sum, v) => sum + v.value, 0) / volatilities.length;
  
  const chartData = {
    labels: volatilities.map((v, i) => {
      const d = new Date(v.timestamp);
      return (i % 3 === 0 || i === volatilities.length - 1) ? `${d.getDate()}/${d.getMonth() + 1}` : '';
    }),
    datasets: [{
      label: 'Volatilidad (%)',
      data: volatilities.map(v => v.value),
      borderColor: 'rgba(251, 146, 60, 1)',
      backgroundColor: 'rgba(251, 146, 60, 0.2)',
      fill: true,
      tension: 0.3,
      pointRadius: 1,
      pointHoverRadius: 4
    }]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `Volatilidad promedio: ${avg.toFixed(2)}%`, color: '#fb923c', font: { size: 13, family: 'monospace' } },
      tooltip: { callbacks: { label: (ctx) => `Volatilidad: ${ctx.parsed.y.toFixed(2)}%` } }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        ticks: { color: '#9ca3af', font: { family: 'monospace' }, callback: (v) => v.toFixed(1) + '%' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 9, family: 'monospace' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
      }
    }
  };
  
  return <div ref={ref} className="h-48"><Line data={chartData} options={opts} /></div>;
}

// ============================================
// LIQUIDITY CHART
// ============================================
export function LiquidityChart({ data, days = 30 }) {
  const [ref, show] = useLOD();
  
  if (!show || !data?.length) return <div ref={ref} className="h-48 bg-gray-900/30 rounded animate-pulse" />;
  
  const sliced = data.slice(-days);
  const avg = sliced.reduce((sum, v) => sum + v.value, 0) / sliced.length;
  
  const chartData = {
    labels: sliced.map((v, i) => {
      const d = new Date(v.timestamp);
      return (i % 3 === 0 || i === sliced.length - 1) ? `${d.getDate()}/${d.getMonth() + 1}` : '';
    }),
    datasets: [{
      label: 'Liquidez (USD)',
      data: sliced.map(v => v.value / 1e6),
      borderColor: 'rgba(34, 211, 238, 1)',
      backgroundColor: 'rgba(34, 211, 238, 0.2)',
      fill: true,
      tension: 0.3,
      pointRadius: 1,
      pointHoverRadius: 4
    }]
  };
  
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `Liquidez promedio: $${(avg / 1e6).toFixed(2)}M`, color: '#22d3ee', font: { size: 13, family: 'monospace' } },
      tooltip: { callbacks: { label: (ctx) => `Liquidez: $${ctx.parsed.y.toFixed(2)}M` } }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        ticks: { color: '#9ca3af', font: { family: 'monospace' }, callback: (v) => '$' + v.toFixed(1) + 'M' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 9, family: 'monospace' }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
      }
    }
  };
  
  return <div ref={ref} className="h-48"><Line data={chartData} options={opts} /></div>;
}
