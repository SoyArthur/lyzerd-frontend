// HOME PAGE //
'use client';
import { useState, useEffect, useCallback, useMemo, createContext, useContext, Suspense, useRef, memo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import dynamic from 'next/dynamic';
import ChatBox from '@/components/ChatBox';
import { StripeModal } from '@/components/stripeComponent';
import { useGlossary } from '@/hooks/useGlossary';
import MetricTooltip from '@/components/MetricTooltip';

const API = process.env.NEXT_PUBLIC_API_URL;

const BreakdownChart        = dynamic(() => import('@/components/Charts').then(m => m.BreakdownChart),          { ssr: false });
const WhalesChart           = dynamic(() => import('@/components/Charts').then(m => m.WhalesChart),             { ssr: false });
const PriceHistoryChart     = dynamic(() => import('@/components/Charts').then(m => m.PriceHistoryChart),       { ssr: false });
const VolatilityChart       = dynamic(() => import('@/components/Charts').then(m => m.VolatilityChart),         { ssr: false });
const LiquidityChart        = dynamic(() => import('@/components/Charts').then(m => m.LiquidityChart),          { ssr: false });
const VolumeHistoryChart    = dynamic(() => import('@/components/Charts').then(m => m.VolumeHistoryChart),      { ssr: false });
const GeometricRelationsChart = dynamic(() => import('@/components/Charts').then(m => m.GeometricRelationsChart), { ssr: false });

// ─── UTILS ────────────────────────────────────────────────────────────────────
const LS = {
  get:   k   => typeof window !== 'undefined' ? localStorage.getItem(`lyzerd_${k}`) : null,
  set:  (k,v) => typeof window !== 'undefined' && localStorage.setItem(`lyzerd_${k}`, v),
  clear: ()   => typeof window !== 'undefined' && ['api_key','user'].forEach(k => localStorage.removeItem(`lyzerd_${k}`)),
};

const U = {
  user:  () => { try { return JSON.parse(LS.get('user')||'null'); } catch { return null; } },
  email: () => U.user()?.email?.split('@')[0] || 'Usuario',
  num:   n  => { if(!n||isNaN(n)) return '0'; const a=Math.abs(n); return a>=1e9?`${(n/1e9).toFixed(2)}B`:a>=1e6?`${(n/1e6).toFixed(2)}M`:a>=1e3?`${(n/1e3).toFixed(2)}K`:n.toFixed(2); },
  curr:  n  => n ? `$${U.num(n)}` : '$0',
  pct:  (n,d=2) => n!=null&&!isNaN(n) ? `${n>=0?'+':''}${n.toFixed(d)}%` : 'N/A',
  addr:  a  => `${a?.slice(0,6)}...${a?.slice(-4)}`,
  date:  d  => { try { return new Date(d).toLocaleDateString('es-ES',{year:'numeric',month:'short',day:'numeric'}); } catch { return 'N/A'; } },
  color:(v,t) => { for(const[th,c] of t) if(v>=th) return c; return t[t.length-1][1]; },
  has:   v  => v!=null && v!==0 && !isNaN(v) && isFinite(v),
};

const cx = (...args) => args.filter(Boolean).join(' ');

const T = isDark => ({
  bg:    isDark ? 'bg-gray-900/60'   : 'bg-white/70',
  border:isDark ? 'border-cyan-500/20' : 'border-cyan-300/40',
  text:  isDark ? 'text-white'       : 'text-gray-900',
  sub:   isDark ? 'text-gray-400'    : 'text-gray-600',
  muted: isDark ? 'text-gray-500'    : 'text-gray-500',
  card:  isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-100 border-gray-300',
  input: isDark ? 'bg-gray-950/80 border-cyan-500/30 text-white placeholder-gray-500' : 'bg-white border-cyan-300 text-gray-900 placeholder-gray-400',
  badge:(color) => isDark ? `bg-${color}-500/20 border-${color}-500/30 text-${color}-300` : `bg-${color}-100 border-${color}-300 text-${color}-700`,
  pill:  isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-500',
  inner: isDark ? 'bg-gray-950/50 border-gray-700/50' : 'bg-gray-100 border-gray-200',
  track: isDark ? 'bg-gray-800'     : 'bg-gray-200',
  row:   isDark ? 'bg-gray-800/50 hover:bg-gray-800/70 border-gray-700/50' : 'bg-gray-100 hover:bg-gray-200 border-gray-300',
});

// ─── CONTEXTS ─────────────────────────────────────────────────────────────────
const ThemeCtx  = createContext();
const useTheme  = () => useContext(ThemeCtx);
const ConfigCtx = createContext();
const useConfig = () => useContext(ConfigCtx);

const ThemeProvider = memo(({ children }) => {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const s = localStorage.getItem('lyzerd_theme') || 'dark';
    setTheme(s); document.documentElement.classList.toggle('light', s==='light');
  }, []);
  const toggle = useCallback(() => setTheme(t => {
    const n = t==='dark' ? 'light' : 'dark';
    localStorage.setItem('lyzerd_theme', n);
    document.documentElement.classList.toggle('light', n==='light');
    return n;
  }), []);
  return <ThemeCtx.Provider value={useMemo(()=>({theme,toggle,isDark:theme==='dark'}),[theme,toggle])}>{children}</ThemeCtx.Provider>;
});

const FALLBACK_CONFIG = {
  thresholds: { safety:[[80,'cyan'],[65,'teal'],[50,'yellow'],[0,'red']], momentum:[[75,'cyan'],[60,'teal'],[45,'yellow'],[0,'red']], rsi:[[70,'red'],[50,'teal'],[30,'cyan'],[0,'yellow']], change:[[0,'cyan'],[-Infinity,'red']] },
  loadingSteps:[['🔮 Consultando ballenas...',15],['📡 Hackeando APIs...',30],['🧠 Alimentando IA...',45],['🔥 Detectando flags...',60],['💎 Calculando 100x...',75],['🦎 Generando análisis...',90],['✨ Puliendo...',95]],
  colors:{ DARK:{}, LIGHT:{} }, limits:{ healthInterval:12000, maxApiKeys:1 }, app:{ name:'Lyzerd', version:'6.0.0', features:[] }
};

const ConfigProvider = memo(({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const cached = LS.get('config'), cacheTime = LS.get('config_time'), now = Date.now();
    if(cached && cacheTime && (now-parseInt(cacheTime))<3600000) { try { setConfig(JSON.parse(cached)); setLoading(false); return; } catch {} }
    axios.get(`${API}/api/config`)
      .then(({data}) => { setConfig(data.config); LS.set('config',JSON.stringify(data.config)); LS.set('config_time',now.toString()); })
      .catch(() => setConfig(FALLBACK_CONFIG))
      .finally(() => setLoading(false));
  }, []);
  if(loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-white text-xl">⏳ Cargando...</div></div>;
  return <ConfigCtx.Provider value={config}>{children}</ConfigCtx.Provider>;
});

// ─── HOOKS ────────────────────────────────────────────────────────────────────
const useInView = (opts={}) => {
  const ref = useRef(); const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), {threshold:0.1,...opts});
    if(ref.current) obs.observe(ref.current); return () => obs.disconnect();
  }, []);
  return [ref, inView];
};

const useWakeup = () => useEffect(() => {
  (async () => { try { await axios.post(`${API}/health`,{timestamp:Date.now(),source:'client-init'},{timeout:10000}).catch(e => e.response?.status===404 && axios.get(`${API}/health`,{timeout:10000})); } catch(e) { console.warn('[WAKEUP]',e.message); } })();
}, []);

const useHealth = interval => {
  const [status, setStatus] = useState({ online:true, checking:true, lastCheck:null });
  const check = useCallback(async () => {
    try { const{status:s,headers:h}=await axios.get(`${API}/health`,{timeout:5000}); setStatus({online:s===200,checking:false,lastCheck:Date.now(),serverTime:h['x-server-time'],version:h['x-api-version']}); }
    catch(e) { setStatus({online:false,checking:false,lastCheck:Date.now(),error:e.message}); }
  }, []);
  useEffect(() => { check(); const i=setInterval(check,interval); return () => clearInterval(i); }, [check,interval]);
  return status;
};

const useAuth = () => {
  const [role,setRole]=useState(null); const [stats,setStats]=useState(null); const router=useRouter();
  useEffect(() => {
    const key = LS.get('api_key'); if(!key) return;
    Promise.all([
      axios.get(`${API}/api/user/role`,{headers:{Authorization:`Bearer ${key}`}}),
      axios.get(`${API}/api/user/stats`,{headers:{Authorization:`Bearer ${key}`}}),
    ]).then(([r,s]) => { setRole(r.data.role); setStats(s.data); }).catch(() => {});
  }, []);
  const logout = useCallback(() => { LS.clear(); router.push('/login'); }, [router]);
  const refreshStats = useCallback(async () => {
    const key = LS.get('api_key'); if(!key) return;
    try { const{data}=await axios.get(`${API}/api/user/stats`,{headers:{Authorization:`Bearer ${key}`}}); setStats(data); } catch {}
  }, []);
  return { role, isAdmin:['admin','superadmin'].includes(role), stats, logout, refreshStats };
};

const useAnalysis = (refresh, LOADING_STEPS) => {
  const [state, setState] = useState({loading:false,data:null,error:null,step:0});
  const [modal,setModal]=useState(false); const [pending,setPending]=useState(null); const sp=useSearchParams();
  const analyze = useCallback(async (addr, skip=false) => {
    if(!addr?.trim()) return setState(s => ({...s,error:'Ingresa dirección'}));
    if(!skip) { setPending(addr.trim()); setModal(true); return; }
    setState({loading:true,data:null,error:null,step:0});
    const int = setInterval(() => setState(s => s.step>=LOADING_STEPS.length-1 ? s : {...s,step:s.step+1}), 2000);
    try {
      const{data}=await axios.post(`${API}/api/analyze`,{address:addr.trim(),quotaCost:1.0},{headers:{Authorization:`Bearer ${LS.get('api_key')}`}});
      clearInterval(int); setState({loading:false,data,error:null,step:0});
      if(typeof document!=='undefined') document.title=`${data.symbol} - LYZERD`;
      const url=new URL(window.location.href); url.searchParams.set('address',addr.trim()); window.history.replaceState({},'',url);
      refresh?.();
    } catch(e) { clearInterval(int); setState({loading:false,data:null,error:e.response?.data?.message||e.message,step:0}); }
  }, [refresh,LOADING_STEPS]);
  const confirm = useCallback(() => { setModal(false); if(pending) analyze(pending,true); }, [pending,analyze]);
  useEffect(() => { const a=sp.get('address'); if(a&&!state.data&&!state.loading) setTimeout(()=>analyze(a),300); }, [sp]);
  return {...state, analyze, modal, setModal, confirm};
};

const useWhales = (whales, plan) => useMemo(() => {
  if(!whales?.length) return null;
  const limit   = plan==='enterprise' ? 20 : plan==='premium' ? 10 : 5;
  const visible  = whales.slice(0, limit);
  const top5     = whales.slice(0, 5);
  const top5Pct  = top5.reduce((s,w) => s+(w.percent||0), 0);
  const identified = top5.filter(w => w.name).length;
  const risk     = top5Pct>60 ? 'high' : top5Pct>40 ? 'medium' : 'low';
  return {
    visible, limit, top5, top5Pct, identified, risk,
    msg: {
      high:   `⚠️ ALTA: Top 5 = ${top5Pct.toFixed(1)}%. ${identified<3?'Mayoría anónimas - PELIGRO':'Identificadas pero concentrado'}`,
      medium: `💧 MODERADA: Top 5 = ${top5Pct.toFixed(1)}%. ${identified>=3?'Mayoría identificadas ✅':'Varias anónimas ⚠️'}`,
      low:    `✅ BUENA: Top 5 = ${top5Pct.toFixed(1)}%. ${identified>=3?'Todas identificadas':'Bien distribuido'}`,
    }[risk],
  };
}, [whales, plan]);

const useHistSlice = (prices, volumes, days) => useMemo(() => {
  if(!prices?.length) return null;
  const n=days===7?-7:days===15?-15:-30, sliced=prices.slice(n), vals=sliced.map(p=>p.value??p.close??p);
  if(!vals.length) return null;
  const min=Math.min(...vals), max=Math.max(...vals), first=vals[0], last=vals[vals.length-1];
  return { prices:sliced, volumes:volumes?.slice(n)||[], stats:{min,max,avg:vals.reduce((a,b)=>a+b,0)/vals.length,first,last,change:first>0?((last-first)/first)*100:0} };
}, [prices,volumes,days]);

const useAnalytics = period => {
  const [state,setState] = useState({loading:true,data:{trending:[],topRated:[],stats:null},error:null});
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setState(s => ({...s,loading:true,error:null}));
      try {
        const[t,r,s]=await Promise.all([
          axios.get(`${API}/api/analytics/trending?period=${period}&limit=5`),
          axios.get(`${API}/api/analytics/top-rated?limit=5&minSearches=3`),
          axios.get(`${API}/api/analytics/stats`),
        ]);
        if(!mounted) return;
        setState({loading:false,data:{trending:t.data?.data||t.data||[],topRated:r.data?.data||r.data||[],stats:s.data?.stats||s.data||null},error:null});
      } catch(err) { if(!mounted) return; setState(s => ({...s,loading:false,error:err.response?.data?.message||err.message})); }
    };
    run(); const i=setInterval(run,30000); return () => { mounted=false; clearInterval(i); };
  }, [period]);
  return state;
};

const useUserHistory = () => {
  const [state,setState] = useState({history:[],favorites:[],recent:[],stats:null,loading:true});
  useEffect(() => {
    const run = async () => {
      const key = LS.get('api_key'); if(!key) return;
      try {
        const[h,f,r,s]=await Promise.all([
          axios.get(`${API}/api/user/history?limit=50`,{headers:{Authorization:`Bearer ${key}`}}),
          axios.get(`${API}/api/user/favorites?limit=10`,{headers:{Authorization:`Bearer ${key}`}}),
          axios.get(`${API}/api/user/recent?limit=20`,{headers:{Authorization:`Bearer ${key}`}}),
          axios.get(`${API}/api/user/stats`,{headers:{Authorization:`Bearer ${key}`}}),
        ]);
        setState({history:h.data.history||[],favorites:f.data.favorites||[],recent:r.data.recent||[],stats:s.data.stats||null,loading:false});
      } catch(err) { console.error('[useUserHistory]',err); setState(s => ({...s,loading:false})); }
    };
    run();
  }, []);
  return state;
};

// ─── PA HELPERS ───────────────────────────────────────────────────────────────
const PA = {
  dirArrow:  d => ({strong_up:'↑↑',up:'↗',stable:'→',down:'↘',strong_down:'↓↓',unknown:''}[d]||''),
  dirColor: (d,C) => ({strong_up:C.cyan?.text,up:C.teal?.text,stable:C.yellow?.text,down:C.yellow?.text,strong_down:C.red?.text}[d]||''),
  signalBadge:(signal,isDark) => ({
    bullish:{label:'▲ BULLISH',bg:T(isDark).badge('cyan')},
    bearish:{label:'▼ BEARISH',bg:T(isDark).badge('red')},
    neutral:{label:'● NEUTRAL',bg:T(isDark).badge('gray')},
  }[signal]||{label:'● NEUTRAL',bg:T(isDark).badge('gray')}),
  multLabel: m => { const v=parseFloat(m); if(isNaN(v)) return null; const p=Math.round((v-1)*100); return Math.abs(p)<1?null:p>0?`+${p}% patrones`:`${p}% patrones`; },
};

const PA_CALC = {
  safety:   m => { if(!m?.rsi14) return null; const r=m.rsi14,v=m.volatility??0; return Math.round(Math.max(0,100-Math.abs(r-50)*1.8)*0.55+Math.max(0,100-v*3.5)*0.45); },
  momentum: m => { if(!m?.rsi14) return null; const r=m.rsi14,r7=m.rsi7??r,rm=Math.max(0,Math.min(100,((r-30)/40)*100)); return Math.round(Math.min(100,rm+(r7>r?Math.min(10,(r7-r)*0.5):0))); },
  scoreColor:(v,isDark) => v==null?(isDark?'text-gray-500':'text-gray-400'):v>=70?(isDark?'text-cyan-400':'text-cyan-600'):v>=50?(isDark?'text-teal-400':'text-teal-600'):v>=35?(isDark?'text-yellow-400':'text-yellow-600'):(isDark?'text-red-400':'text-red-600'),
  volColor:  (v,isDark) => v==null?(isDark?'text-gray-500':'text-gray-400'):v<3?(isDark?'text-cyan-400':'text-cyan-600'):v<8?(isDark?'text-yellow-400':'text-yellow-600'):(isDark?'text-red-400':'text-red-600'),
  bar:  (v,max=100) => v==null ? 0 : Math.round((v/max)*100),
  gradKey:(id,v) => id==='volatility' ? (v<3?'cyan':v<8?'yellow':'red') : (v>=70?'cyan':v>=50?'teal':v>=35?'yellow':'red'),
};

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────
const Glass = memo(({children,className='',glow,isDark}) => (
  <div className={cx('relative overflow-hidden rounded-2xl backdrop-blur-sm border-2 transition-all duration-200 hover:scale-[1.01]',
    isDark?'bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-gray-900/60':'bg-gradient-to-br from-white/70 via-gray-50/70 to-white/70',
    isDark?'border-cyan-500/20':'border-cyan-300/40',
    glow&&(isDark?'shadow-xl shadow-cyan-500/10':'shadow-xl shadow-cyan-400/20'),className)}>
    {children}
  </div>
));

const Btn = memo(({children,onClick,disabled,variant='primary',className='',isDark}) => {
  const v = {
    primary:  'bg-gradient-to-br from-cyan-400 via-teal-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/40',
    danger:   'bg-gradient-to-br from-red-400 via-pink-400 to-red-500 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/40',
    secondary: isDark?'bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 hover:from-gray-600':'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200',
  };
  return <button onClick={onClick} disabled={disabled} className={cx('relative px-6 py-3 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all overflow-hidden',v[variant],className)}><div className="relative z-10">{children}</div></button>;
});

const Lazy = memo(({children,delay=0}) => {
  const[ref,inView]=useInView(); const[show,setShow]=useState(false);
  useEffect(() => { if(inView) setTimeout(()=>setShow(true),delay); }, [inView,delay]);
  return <div ref={ref} className="transition-all duration-500" style={{opacity:show?1:0,transform:show?'translateY(0)':'translateY(20px)'}}>{show?children:<div className="h-20"/>}</div>;
});

const Skeleton = memo(({isDark,type='charts'}) => (
  <Glass isDark={isDark} className="p-8 animate-pulse">
    <div className={cx('h-8 rounded w-1/4 mb-6',isDark?'bg-gray-800':'bg-gray-200')}/>
    {type==='charts'
      ? <div className="grid grid-cols-2 gap-6">{[1,2].map(i=><div key={i} className={cx('h-64 rounded-xl',isDark?'bg-gray-800':'bg-gray-200')}/>)}</div>
      : <div className={cx('h-96 rounded-xl',isDark?'bg-gray-800':'bg-gray-200')}/>}
  </Glass>
));

const Metric = ({label,value,color,C,isDark}) => (
  <div>
    <div className={cx('text-xs mb-1 font-bold',T(isDark).sub)}>{label}</div>
    <div className={cx('text-lg font-bold',C[color].text)}>{value}</div>
  </div>
);

const ChartCard = ({title,children,isDark}) => (
  <Glass isDark={isDark} className="p-6">
    <h4 className={cx('text-sm font-bold mb-4 uppercase',T(isDark).sub)}>{title}</h4>
    {children}
  </Glass>
);

const MetricWithTooltip = memo(({label,value,color,tooltip,C,isDark}) => {
  const content = <div><div className={cx('text-xs mb-1 font-bold',T(isDark).sub)}>{label}</div><div className={cx('text-lg font-bold',C[color].text)}>{value}</div></div>;
  return tooltip ? <MetricTooltip scenario={tooltip} isDark={isDark}>{content}</MetricTooltip> : content;
});

const StatCard = memo(({label,value,icon,color='teal',subtitle,tooltip,isDark,C}) => {
  const t = T(isDark);
  const content = (
    <div className={cx('rounded-xl p-4 border-2 transition-all hover:scale-105 hover:shadow-xl backdrop-blur-sm',t.card)}>
      <div className="flex items-center gap-2 mb-2"><span className="text-2xl">{icon}</span><span className={cx('text-xs uppercase font-bold',t.sub)}>{label}</span></div>
      <div className={cx('text-3xl font-black',C[color].text)}>{value}</div>
      {subtitle&&<div className={cx('text-xs mt-1 font-medium',color==='cyan'||color==='red'?C[color].text:t.muted)}>{subtitle}</div>}
    </div>
  );
  return tooltip ? <MetricTooltip scenario={tooltip} isDark={isDark}>{content}</MetricTooltip> : content;
});

// ─── LAYOUT COMPONENTS ────────────────────────────────────────────────────────
const BgFx = memo(({isDark}) => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className={cx('absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-2xl opacity-15',isDark?'bg-cyan-500':'bg-cyan-300')}/>
    <div className={cx('absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-2xl opacity-10',isDark?'bg-teal-500':'bg-teal-300')}/>
  </div>
));

const Disclaimer = memo(({isDark}) => (
  <div className={cx('border-b-2 backdrop-blur-sm',isDark?'bg-red-900/40 border-red-500/50':'bg-red-100/80 border-red-400')}>
    <div className={cx('max-w-7xl mx-auto px-4 py-3 text-center text-sm font-medium',isDark?'text-red-200':'text-red-800')}>
      <span className="font-bold">⚠️ EXPERIMENTAL:</span> NO somos asesores. <a href="/terms" className="underline hover:opacity-80 font-bold">Términos</a>
    </div>
  </div>
));

const ServerStatus = memo(({status,isDark,C}) => {
  if(status.checking||status.online) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <Glass isDark={isDark} glow className="max-w-md w-full mx-4 p-8 text-center">
        <div className="text-6xl mb-4 animate-bounce">🔌</div>
        <h2 className={cx('text-3xl font-black mb-4 bg-gradient-to-r bg-clip-text text-transparent',C.red.gradient)}>SERVIDOR DESCONECTADO</h2>
        <p className={cx('mb-6',T(isDark).sub)}>No se puede conectar. Intenta más tarde.</p>
        {status.error&&<div className={cx('text-xs font-mono bg-black/20 p-3 rounded-lg',T(isDark).muted)}>{status.error}</div>}
        <div className={cx('mt-6 text-sm',T(isDark).sub)}>Último: {new Date(status.lastCheck).toLocaleTimeString()}</div>
      </Glass>
    </div>
  );
});

// ─── HEADER SUB-COMPONENTS ────────────────────────────────────────────────────
const PLAN_META = {
  free:       { label: 'Free',       icon: '🆓', color: 'text-gray-400',   ring: 'ring-gray-500/30',   bg: 'bg-gray-500/10'   },
  premium:    { label: 'Premium',    icon: '⭐', color: 'text-yellow-400', ring: 'ring-yellow-500/30', bg: 'bg-yellow-500/10' },
  enterprise: { label: 'Enterprise', icon: '💎', color: 'text-cyan-300',   ring: 'ring-cyan-500/30',   bg: 'bg-cyan-500/10'   },
};

const HeaderLogo = memo(({ appInfo }) => (
  <div className="flex items-center gap-3 select-none flex-shrink-0">
    <span className="text-3xl" style={{ display:'inline-block', animation:'bounce 3s infinite' }}>🦎</span>
    <div>
      <span className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent">
        {appInfo?.name?.toUpperCase() || 'LYZERD'}
      </span>
      <div className="text-[10px] text-gray-500 font-medium tracking-widest uppercase leading-none mt-0.5 hidden sm:block">
        Crypto Analysis
      </div>
    </div>
  </div>
));

const HeaderStatusDot = memo(({ online }) => (
  <div className="hidden sm:flex items-center gap-1.5">
    <span className={cx('w-1.5 h-1.5 rounded-full flex-shrink-0', online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
    <span className={cx('text-[10px] font-bold tracking-wider uppercase', online ? 'text-emerald-400' : 'text-red-400')}>
      {online ? 'Online' : 'Offline'}
    </span>
  </div>
));

const HeaderDivider = () => <div className="w-px h-5 bg-gray-700/80 mx-0.5 flex-shrink-0 hidden sm:block" />;

const PlanChip = memo(({ plan = 'free', onClick }) => {
  const meta = PLAN_META[plan] || PLAN_META.free;
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ring-1 transition-all hover:ring-2 cursor-pointer flex-shrink-0',
        meta.bg, meta.ring
      )}
    >
      <span className="text-sm leading-none">{meta.icon}</span>
      <span className={cx('text-[11px] font-bold uppercase tracking-wide hidden md:block', meta.color)}>
        {meta.label}
      </span>
    </button>
  );
});

const QuotaWidget = memo(({ stats }) => {
  if (!stats) return null;
  const daily = stats.daily;
  const credits = stats.credits?.daily;
  const pct = daily.limit > 0 ? Math.round((daily.remaining / daily.limit) * 100) : 0;
  const barColor = pct > 50 ? 'bg-cyan-400' : pct > 20 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="hidden lg:flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50 ring-1 ring-gray-700/40 flex-shrink-0">
      {/* Daily requests */}
      <div className="min-w-[80px]">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Diario</span>
          <span className="text-[10px] text-gray-300 font-mono font-bold">{daily.remaining.toLocaleString()}</span>
        </div>
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div className={cx('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
      {/* Credits */}
      {credits && (
        <>
          <div className="w-px h-5 bg-gray-700" />
          <div className="min-w-[80px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Créditos</span>
              <span className="text-[10px] text-gray-300 font-mono font-bold">{credits.remaining.toLocaleString()}</span>
            </div>
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-teal-400 transition-all"
                style={{ width: `${Math.min(credits.limit > 0 ? Math.round((credits.remaining / credits.limit) * 100) : 0, 100)}%` }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
});

const IconBtn = memo(({ onClick, title, children, variant = 'ghost' }) => (
  <button
    onClick={onClick}
    title={title}
    className={cx(
      'w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-base flex-shrink-0',
      variant === 'ghost'
        ? 'bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white ring-1 ring-gray-700/50'
        : 'bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
    )}
  >
    {children}
  </button>
));

const UserMenu = memo(({ email, role, isAdmin, onAdmin, onLogout, isDark }) => {
  const [open, setOpen] = useState(false);
  const isSuper = role === 'superadmin';
  const initial = email?.[0]?.toUpperCase() || 'U';

  // Cierra el menu al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest('[data-usermenu]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" data-usermenu="">
      <button
        onClick={() => setOpen(o => !o)}
        className={cx(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg ring-1 transition-all',
          isDark
            ? 'bg-gray-800/60 ring-gray-700/50 hover:bg-gray-700'
            : 'bg-gray-100 ring-gray-300 hover:bg-gray-200'
        )}
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
          {initial}
        </div>
        <span className={cx('text-xs font-medium hidden md:block max-w-[90px] truncate', isDark ? 'text-gray-300' : 'text-gray-700')}>
          {email}
        </span>
        {isSuper && <span className="text-[10px] hidden sm:block">👑</span>}
        <span className={cx('text-xs', isDark ? 'text-gray-600' : 'text-gray-400')}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={cx(
          'absolute right-0 top-full mt-2 w-52 rounded-xl ring-1 shadow-2xl overflow-hidden z-50',
          isDark ? 'bg-gray-900 ring-gray-700/80' : 'bg-white ring-gray-200'
        )}>
          {/* User info */}
          <div className={cx('px-4 py-3 border-b', isDark ? 'border-gray-800' : 'border-gray-100')}>
            <div className={cx('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>Conectado como</div>
            <div className={cx('text-sm font-bold truncate', isDark ? 'text-white' : 'text-gray-900')}>{email}</div>
            {isSuper && <div className="text-[10px] text-yellow-400 font-bold uppercase mt-0.5">Superadmin</div>}
          </div>
          {/* Actions */}
          <div className="p-1">
            {isAdmin && (
              <button
                onClick={() => { onAdmin(); setOpen(false); }}
                className={cx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left',
                  isDark ? 'text-gray-300 hover:bg-gray-800 hover:text-white' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <span>{isSuper ? '👑' : '⚙️'}</span>
                <span>{isSuper ? 'Super Admin' : 'Admin Panel'}</span>
              </button>
            )}
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all text-left"
            >
              <span>🚪</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── HEADER ───────────────────────────────────────────────────────────────────
const Header = memo(({ email, role, stats, isAdmin, onAdmin, onAuth, onTheme, onStripe, onAPIKeys, srv, isDark, C, appInfo }) => {
  const isLoggedIn = !!LS.get('api_key');
  return (
    <header className={cx(
      'border-b backdrop-blur-xl sticky top-0 z-50',
      isDark ? 'border-gray-800/80 bg-gray-950/90' : 'border-gray-200/80 bg-white/90'
    )}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2 sm:gap-3">

        {/* ── Logo ── */}
        <HeaderLogo appInfo={appInfo} />

        <HeaderDivider />
        <HeaderStatusDot online={srv.online} />

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Quota bars ── */}
        <QuotaWidget stats={stats} />

        <HeaderDivider />

        {/* ── Plan chip ── */}
        {stats && <PlanChip plan={stats.plan} onClick={onStripe} />}

        {/* ── Theme toggle ── */}
        <IconBtn onClick={onTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'} variant="ghost">
          {isDark ? '☀️' : '🌙'}
        </IconBtn>

        {/* ── API Keys ── */}
        <IconBtn onClick={onAPIKeys} title="API Keys" variant="accent">
          🔑
        </IconBtn>

        <HeaderDivider />

        {/* ── User menu / Login ── */}
        {isLoggedIn ? (
          <UserMenu
            email={email}
            role={role}
            isAdmin={isAdmin}
            onAdmin={onAdmin}
            onLogout={onAuth}
            isDark={isDark}
          />
        ) : (
          <button
            onClick={onAuth}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
          >
            🔐 <span className="hidden sm:inline">Login</span>
          </button>
        )}
      </div>
    </header>
  );
});

// ─── TOKEN COMPONENTS ─────────────────────────────────────────────────────────
const Loading = memo(({step,isDark,C,LOADING_STEPS}) => {
  const[msg,pct] = LOADING_STEPS[step]||LOADING_STEPS[0];
  return (
    <Glass isDark={isDark} glow className="mb-8 p-12">
      <div className="text-6xl mb-4 animate-bounce text-center">{msg.split(' ')[0]}</div>
      <h3 className={cx('text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent mb-2 animate-pulse text-center',C.cyan.gradient)}>{msg}</h3>
      <div className={cx('text-sm text-center mb-6',T(isDark).sub)}>Esto puede tomar unos segundos...</div>
      <div className="flex justify-between text-sm mb-3"><span className={cx('font-bold',C.cyan.text)}>Progreso</span><span className={cx('font-bold',C.teal.text)}>{pct}%</span></div>
      <div className={cx('h-4 rounded-full overflow-hidden border-2',T(isDark).track,isDark?'border-cyan-500/30':'border-cyan-300')}>
        <div className={cx('h-full bg-gradient-to-r via-teal-400 to-blue-400 transition-all duration-1000 relative',C.cyan.gradient)} style={{width:`${pct}%`}}>
          <div className="absolute inset-0 bg-white/30 animate-pulse"/>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-6">
        {LOADING_STEPS.map((_,i) => <div key={i} className={cx('h-2 rounded-full transition-all',i<=step?cx('w-8 bg-gradient-to-r shadow-lg',C.cyan.gradient,C.cyan.glow):cx('w-2',T(isDark).track))}/>)}
      </div>
    </Glass>
  );
});

const Search = memo(({addr,setAddr,loading,error,copied,hasData,onAnalyze,onShare,isDark,C}) => (
  <Glass isDark={isDark} className="mb-8 p-8">
    <div className="flex items-center gap-2 mb-4">
      <label className={cx('text-sm font-black drop-shadow-lg',C.cyan.text)}>🎯 TOKEN ADDRESS</label>
      <span className={cx('px-3 py-1 text-xs rounded-full font-bold border',isDark?'bg-cyan-500/20 text-cyan-300 border-cyan-500/30':'bg-cyan-100 text-cyan-700 border-cyan-300')}>Solana • Ethereum</span>
    </div>
    <div className="flex gap-3">
      <input type="text" value={addr} onChange={e=>setAddr(e.target.value)} onKeyPress={e=>e.key==='Enter'&&!loading&&onAnalyze()}
        placeholder="Ej: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
        className={cx('flex-1 px-6 py-5 border-2 rounded-xl font-mono text-sm focus:outline-none transition-all backdrop-blur-sm',T(isDark).input,isDark?'focus:border-cyan-500 focus:shadow-lg focus:shadow-cyan-500/30':'focus:border-cyan-600 focus:shadow-lg focus:shadow-cyan-400/30')}
        disabled={loading}/>
      <Btn onClick={onAnalyze} disabled={loading} variant="primary" isDark={isDark} className="!px-10 !py-5">{loading?'⏳ ANALIZANDO':'🔍 ANALIZAR'}</Btn>
      {addr&&hasData&&!loading&&<Btn onClick={onShare} variant="primary" isDark={isDark} className="!px-6 !py-5">{copied?'✓':'🔗'}</Btn>}
    </div>
    {error&&<div className={cx('mt-4 p-5 border-2 rounded-xl backdrop-blur-sm flex items-center gap-3',isDark?'bg-red-900/30 border-red-500':'bg-red-100 border-red-400')}><span className="text-2xl">❌</span><span className={cx('text-sm font-bold',isDark?'text-red-200':'text-red-800')}>{error}</span></div>}
  </Glass>
));

const Modal = memo(({stats,onConfirm,onCancel,isDark,C}) => {
  const requestsInsufficient = (stats?.daily?.remaining||0)<=0;
  const canProceed = !requestsInsufficient;
  const t = T(isDark);
  const Row = ({label,val,color}) => <div className="flex justify-between"><span className={t.sub}>{label}</span><span className={cx('font-bold',C[color].text)}>{val}</span></div>;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <Glass isDark={isDark} glow className="max-w-md w-full p-8">
        <div className="text-4xl mb-4 text-center animate-bounce">{canProceed?'⚠️':'🚫'}</div>
        <h3 className={cx('text-2xl font-bold mb-4 text-center',canProceed?C.yellow.text:C.red.text)}>{canProceed?'Confirmar Análisis':'Límite Alcanzado'}</h3>
        <div className={cx('rounded-xl p-6 mb-6 space-y-4 border',t.inner)}>
          <div className="space-y-2">
            <Row label="Plan:"              val={stats?.plan||'FREE'}                                                  color="cyan"/>
            <Row label="Requests diarios:"  val={`${stats?.daily?.remaining||0}/${stats?.daily?.limit||0}`}           color={requestsInsufficient?'red':'teal'}/>
            <Row label="Requests mensuales:" val={`${stats?.monthly?.remaining||0}/${stats?.monthly?.limit||0}`}      color="purple"/>
          </div>
          {stats?.api&&<div className={cx('pt-3 border-t border-gray-700 space-y-2')}>
            <div className={cx('text-xs font-bold mb-2',t.muted)}>🔑 API Limits</div>
            <Row label="Diario:"  val={`${stats.api.daily.remaining}/${stats.api.daily.limit}`}     color="yellow"/>
            <Row label="Mensual:" val={`${stats.api.monthly.remaining}/${stats.api.monthly.limit}`} color="yellow"/>
          </div>}
          {!canProceed&&<div className={cx('mt-4 p-4 border-2 rounded-lg',isDark?'bg-red-900/30 border-red-500/50':'bg-red-100 border-red-400')}>
            <div className={cx('text-sm font-bold',isDark?'text-red-200':'text-red-800')}>❌ Límite de requests alcanzado</div>
            <div className={cx('text-xs mt-1',isDark?'text-red-300':'text-red-700')}>Espera al reset diario o mejora tu plan</div>
          </div>}
        </div>
        <div className="flex gap-3">
          <Btn onClick={onCancel}  variant="secondary" isDark={isDark} className="flex-1">Cancelar</Btn>
          <Btn onClick={onConfirm} disabled={!canProceed} variant="primary" isDark={isDark} className="flex-1">Confirmar</Btn>
        </div>
      </Glass>
    </div>
  );
});

const APIKeysModal = memo(({onClose,isDark,C,maxKeys}) => {
  const[keys,setKeys]=useState([]); const[loading,setLoading]=useState(true); const[creating,setCreating]=useState(false);
  const[newKeyName,setNewKeyName]=useState(''); const[showNewKey,setShowNewKey]=useState(null);
  const apiKey = LS.get('api_key'); const t = T(isDark);
  const fetchKeys = useCallback(async () => {
    try { const{data}=await axios.get(`${API}/api/quota-keys`,{headers:{Authorization:`Bearer ${apiKey}`}}); setKeys(data.keys||[]); }
    catch(e) { console.error('❌',e); } finally { setLoading(false); }
  }, [apiKey]);
  useEffect(() => { fetchKeys(); }, [fetchKeys]);
  const createKey = async () => {
    if(!newKeyName.trim()) return; setCreating(true);
    try { const{data}=await axios.post(`${API}/api/quota-keys`,{name:newKeyName},{headers:{Authorization:`Bearer ${apiKey}`}}); setShowNewKey(data.key); setNewKeyName(''); fetchKeys(); }
    catch(err) { alert(err.response?.data?.message||'Error al crear key'); } finally { setCreating(false); }
  };
  const revokeKey = async id => {
    if(!confirm('¿Revocar esta API key?')) return;
    try { await axios.patch(`${API}/api/quota-keys/${id}/revoke`,{},{headers:{Authorization:`Bearer ${apiKey}`}}); fetchKeys(); }
    catch { alert('Error al revocar key'); }
  };
  const deleteKey = async id => {
    if(!confirm('¿Eliminar permanentemente esta API key?')) return;
    try { await axios.delete(`${API}/api/quota-keys/${id}`,{headers:{Authorization:`Bearer ${apiKey}`}}); fetchKeys(); }
    catch { alert('Error al eliminar key'); }
  };
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <Glass isDark={isDark} glow className="max-w-3xl w-full max-h-[80vh] overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className={cx('text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent',C.cyan.gradient)}>🔑 API Keys</h2>
          <button onClick={onClose} className={cx('text-3xl',isDark?'text-gray-400 hover:text-white':'text-gray-600 hover:text-gray-900')}>✕</button>
        </div>
        <div className={cx('mb-6 p-4 rounded-xl border-2',isDark?'bg-cyan-500/10 border-cyan-500/30':'bg-cyan-100 border-cyan-300')}>
          <p className={cx('text-sm',isDark?'text-cyan-200':'text-cyan-900')}>Usa estas keys para hacer requests directas a nuestra API desde tu código.</p>
        </div>
        {showNewKey&&(
          <div className={cx('mb-6 p-6 rounded-xl border-2',isDark?'bg-green-900/20 border-green-500/50':'bg-green-100 border-green-400')}>
            <h3 className={cx('font-bold mb-2',isDark?'text-green-300':'text-green-800')}>✅ Key creada exitosamente</h3>
            <p className={cx('text-sm mb-3',isDark?'text-green-200':'text-green-700')}>Guárdala ahora - no podrás verla de nuevo:</p>
            <div className="flex gap-2">
              <input type="text" value={showNewKey.api_key} readOnly className={cx('flex-1 px-4 py-2 border-2 rounded-lg font-mono text-sm',isDark?'bg-gray-950 border-green-500/50 text-white':'bg-white border-green-300 text-gray-900')}/>
              <Btn onClick={()=>{navigator.clipboard.writeText(showNewKey.api_key);alert('✓ Key copiada');}} variant="primary" isDark={isDark} className="!px-4">📋 Copiar</Btn>
            </div>
            <button onClick={()=>setShowNewKey(null)} className={cx('mt-3 text-sm underline',isDark?'text-green-400 hover:text-green-300':'text-green-700 hover:text-green-600')}>Cerrar</button>
          </div>
        )}
        <div className="mb-6">
          <h3 className={cx('text-lg font-bold mb-3',t.text)}>Crear Nueva Key</h3>
          <div className="flex gap-3">
            <input type="text" value={newKeyName} onChange={e=>setNewKeyName(e.target.value)} placeholder="Nombre de la key (ej: Production)"
              className={cx('flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none',t.input)} disabled={creating||keys.length>=maxKeys}/>
            <Btn onClick={createKey} disabled={creating||!newKeyName.trim()||keys.length>=maxKeys} variant="primary" isDark={isDark}>{creating?'⏳':'➕'} Crear</Btn>
          </div>
          {keys.length>=maxKeys&&<p className={cx('text-xs mt-2',isDark?'text-yellow-400':'text-yellow-700')}>⚠️ Límite alcanzado ({maxKeys} keys máximo)</p>}
        </div>
        <div>
          <h3 className={cx('text-lg font-bold mb-3',t.text)}>Tus Keys ({keys.length}/{maxKeys})</h3>
          {loading ? <div className="text-center py-8">⏳ Cargando...</div> : keys.length===0 ? <div className={cx('text-center py-8',t.sub)}>No tienes API keys aún</div> : (
            <div className="space-y-3">{keys.map(key=>(
              <div key={key.id} className={cx('p-4 rounded-xl border-2',t.card)}>
                <div className="flex justify-between items-start mb-2">
                  <div><h4 className={cx('font-bold',t.text)}>{key.name}</h4><p className={cx('text-xs',t.sub)}>{key.is_active?'✅ Activa':'🔒 Revocada'}</p></div>
                  <div className="flex gap-2">
                    {key.is_active&&<button onClick={()=>revokeKey(key.id)} className={cx('px-3 py-1 text-xs font-bold rounded',isDark?'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30':'bg-yellow-100 text-yellow-700 hover:bg-yellow-200')}>🔒 Revocar</button>}
                    <button onClick={()=>deleteKey(key.id)} className={cx('px-3 py-1 text-xs font-bold rounded',isDark?'bg-red-500/20 text-red-300 hover:bg-red-500/30':'bg-red-100 text-red-700 hover:bg-red-200')}>🗑️ Eliminar</button>
                  </div>
                </div>
                <div className={cx('text-xs space-y-1',t.muted)}>
                  <p>Creada: {new Date(key.created_at).toLocaleString()}</p>
                  {key.last_used_at&&<p>Último uso: {new Date(key.last_used_at).toLocaleString()}</p>}
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="mt-6 pt-6 border-t-2 border-gray-700">
          <h3 className={cx('text-sm font-bold mb-3',t.muted)}>📖 Ejemplo de uso:</h3>
          <pre className={cx('p-4 rounded-lg text-xs overflow-x-auto',isDark?'bg-gray-950 text-cyan-300':'bg-gray-100 text-cyan-700')}>
{`const response = await fetch('${API}/api/analyze', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_KEY', 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: 'DezXAZ8z7...' })
});`}
          </pre>
        </div>
      </Glass>
    </div>
  );
});

// ─── TOKEN COMPONENTS ─────────────────────────────────────────────────────────
const TokenHeader = memo(({a,isDark,C,THRESHOLDS}) => {
  const chgColor = U.color(a.priceChange24h, THRESHOLDS.change);
  const pa = a.patternAnalysis;
  const t  = T(isDark);
  const signalBadge = pa?.available && pa?.overallSignal ? PA.signalBadge(pa.overallSignal, isDark) : null;
  const priceTrend  = pa?.available && pa.trends?.price?.direction && pa.trends.price.direction!=='unknown'
    ? {arrow:PA.dirArrow(pa.trends.price.direction),color:PA.dirColor(pa.trends.price.direction,C),days:pa.daysBack,pct:pa.trends.price.pct}
    : null;
  return (
    <Glass isDark={isDark} glow className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <h2 className={cx('text-5xl font-black bg-gradient-to-r bg-clip-text text-transparent drop-shadow-2xl',C.cyan.gradient)}>{a.symbol}</h2>
            <span className={cx('px-4 py-2 rounded-full text-sm font-black border-2 shadow-lg',
              isDark?(a.blockchain==='ethereum'?'bg-blue-500/20 text-blue-300 border-blue-500/30':'bg-purple-500/20 text-purple-300 border-purple-500/30')
                    :(a.blockchain==='ethereum'?'bg-blue-100 text-blue-700 border-blue-300':'bg-purple-100 text-purple-700 border-purple-300'))}>
              {a.blockchain?.toUpperCase()}
            </span>
            {signalBadge&&<span className={cx('px-3 py-1 rounded-full text-xs font-black border-2 shadow-md',signalBadge.bg)}>{signalBadge.label} · {pa.daysBack}d</span>}
          </div>
          <div className={cx('text-lg font-medium',t.sub)}>{a.name}</div>
          {pa?.available&&pa.conclusions?.length>0&&(
            <div className="flex flex-wrap gap-2 mt-3">
              {pa.conclusions.slice(0,2).map((c,i) => <span key={i} className={cx('text-xs px-2 py-1 rounded-lg font-medium border',isDark?'bg-gray-800/80 text-gray-300 border-gray-700':'bg-gray-100 text-gray-700 border-gray-200')}>{c}</span>)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={cx('text-5xl font-black mb-2 drop-shadow-lg',C.cyan.text)}>${a.price?.toFixed(8)}</div>
          <div className={cx('text-lg font-black px-4 py-2 rounded-full border-2 shadow-lg',`${C[chgColor].bg}/20`,C[chgColor].text,`${C[chgColor].border}/30`)}>
            {a.priceChange24h>=0?'↗':'↘'} {U.pct(a.priceChange24h)}
          </div>
          {priceTrend&&<div className={cx('mt-2 text-sm font-bold',priceTrend.color)}>{priceTrend.arrow} {priceTrend.pct>0?'+':''}{priceTrend.pct}% en {priceTrend.days}d</div>}
        </div>
      </div>
      {(U.has(a.ath)||U.has(a.atl))&&(
        <div className={cx('mt-6 pt-6 border-t-2 grid grid-cols-2 gap-6',isDark?'border-cyan-500/30':'border-cyan-300/50')}>
          {U.has(a.ath)&&<div><div className={cx('text-xs mb-1 font-bold',t.sub)}>🔥 ATH</div><div className={cx('text-2xl font-bold',C.cyan.text)}>${a.ath.toFixed(8)}</div>{a.athDate&&<div className={cx('text-xs mt-1',t.muted)}>{U.date(a.athDate)}</div>}</div>}
          {U.has(a.atl)&&<div><div className={cx('text-xs mb-1 font-bold',t.sub)}>❄️ ATL</div><div className={cx('text-2xl font-bold',C.red.text)}>${a.atl.toFixed(8)}</div>{a.atlDate&&<div className={cx('text-xs mt-1',t.muted)}>{U.date(a.atlDate)}</div>}</div>}
        </div>
      )}
    </Glass>
  );
});

const StatsGrid = memo(({a,isDark,C,THRESHOLDS}) => {
  const glossary = useGlossary(a);
  const rsiColor = U.has(a.rsi14) ? U.color(a.rsi14, THRESHOLDS.rsi) : 'gray';
  const pa = a.patternAnalysis;
  const t  = T(isDark);
  const rsiSubtitle  = useMemo(() => { const base=a.rsi14>70?'Sobrecomprado':a.rsi14<30?'Sobrevendido':'Neutral'; if(!pa?.available||!pa.trends?.rsi14?.direction||pa.trends.rsi14.direction==='unknown') return base; return `${base} ${PA.dirArrow(pa.trends.rsi14.direction)}`; }, [a.rsi14,pa]);
  const volSubtitle  = useMemo(() => { if(!pa?.available||!pa.trends?.volatility?.direction||pa.trends.volatility.direction==='unknown') return null; return ({strong_up:'↑↑ Disparándose',up:'↗ Subiendo',stable:'→ Estable',down:'↘ Bajando',strong_down:'↓↓ Comprimida'}[pa.trends.volatility.direction]||null); }, [pa]);
  const volRelSubtitle = useMemo(() => { const vr=pa?.indicators?.volume_relative; if(vr==null) return null; return vr>1.5?`${vr}x promedio ↑`:vr<0.6?`${vr}x promedio ↓`:null; }, [pa]);
  const accelStat    = useMemo(() => { const acc=pa?.indicators?.momentum_acceleration; if(!acc||acc==='unknown'||acc==='steady') return null; return {label:'Momentum',icon:'⚡',value:acc==='accelerating'?'Acelerando':'Frenando',color:acc==='accelerating'?'cyan':'yellow',subtitle:pa.daysBack?`vs promedio ${pa.daysBack}d`:null}; }, [pa]);
  const stats = useMemo(() => [
    U.has(a.marketCap)    && {label:'Market Cap',  value:U.curr(a.marketCap),                         icon:'💰', color:'cyan',   tooltip:glossary.mcFdv&&a.fdv?glossary.mcFdv:null},
    U.has(a.volume24h)    && {label:'Volumen 24h',  value:U.curr(a.volume24h),                         icon:'📊', color:'teal',   tooltip:glossary.volLiq, subtitle:volRelSubtitle},
    U.has(a.liquidity)    && {label:'Liquidez',     value:U.curr(a.liquidity),                         icon:'💧', color:'blue',   tooltip:glossary.liqDepth},
    U.has(a.holders)      && {label:'Holders',      value:a.holders.toLocaleString(),                  icon:'👥', color:'cyan',   subtitle:U.has(a.holdersChange24h)?`${U.pct(a.holdersChange24h,0)} hoy`:null},
    U.has(a.rsi14)        && {label:'RSI (14)',     value:a.rsi14.toFixed(1),                          icon:'📈', color:rsiColor, subtitle:rsiSubtitle, tooltip:glossary.rsi},
    U.has(a.volatility24h)&& {label:'Volatilidad',  value:`${a.volatility24h.toFixed(1)}%`,            icon:'⚡', color:a.volatility24h>10?'red':a.volatility24h>5?'yellow':'cyan', subtitle:volSubtitle},
    U.has(a.buyPressure)  && {label:'Buy Pressure', value:`${a.buyPressure.toFixed(1)}%`,              icon:'🎯', color:a.buyPressure>55?'cyan':a.buyPressure<45?'red':'teal'},
    accelStat,
  ].filter(Boolean), [a,rsiColor,glossary,rsiSubtitle,volSubtitle,volRelSubtitle,accelStat]);
  if(!stats.length) return null;
  return (
    <Glass isDark={isDark} className="p-6">
      <h3 className={cx('text-xl font-bold mb-4 flex items-center gap-2',t.text)}><span>📊</span><span className={cx('bg-gradient-to-r bg-clip-text text-transparent',C.cyan.gradient)}>Estadísticas</span></h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{stats.map((s,i) => <StatCard key={i} {...s} isDark={isDark} C={C}/>)}</div>
      {pa?.available&&pa.conclusions?.length>0&&(
        <div className={cx('mt-6 pt-6 border-t-2',isDark?'border-cyan-500/30':'border-cyan-300/50')}>
          <div className={cx('text-xs font-black uppercase mb-3 flex items-center gap-2',t.sub)}><span>📊</span><span>Señales detectadas · {pa.daysBack}d de historial</span></div>
          <div className="flex flex-wrap gap-2">{pa.conclusions.map((c,i) => <span key={i} className={cx('text-xs px-3 py-1.5 rounded-lg font-medium border',isDark?'bg-gray-800/60 text-gray-200 border-gray-700/60':'bg-gray-100 text-gray-700 border-gray-200')}>{c}</span>)}</div>
        </div>
      )}
      {(U.has(a.top10HoldersPercent)||U.has(a.buys24h))&&(
        <div className={cx('mt-6 pt-6 border-t-2 grid grid-cols-3 gap-4 text-center',isDark?'border-cyan-500/30':'border-cyan-300/50')}>
          {U.has(a.top10HoldersPercent)&&<MetricWithTooltip label="Top 10 Holders" value={`${a.top10HoldersPercent.toFixed(1)}%`} color="teal" C={C} isDark={isDark} tooltip={glossary.concentration}/>}
          {U.has(a.buys24h)&&U.has(a.sells24h)&&<><Metric label="Compras 24h" value={a.buys24h.toLocaleString()} color="cyan" C={C} isDark={isDark}/><Metric label="Ventas 24h" value={a.sells24h.toLocaleString()} color="red" C={C} isDark={isDark}/></>}
        </div>
      )}
    </Glass>
  );
});

const RetroTimeline = memo(({a,isDark,C}) => {
  const pa = a?.patternAnalysis;
  if(!pa?.available||!pa.moments) return null;
  const cols = useMemo(() => {
    const m=pa.moments, e=[];
    for(let d=pa.daysBack; d>=1; d--) { const k=`t-${d}`; if(m[k]) e.push({key:k,label:`Hace ${d}d`,moment:m[k],isToday:false}); }
    if(m['t-0']) e.push({key:'t-0',label:'Hoy',moment:m['t-0'],isToday:true});
    return e;
  }, [pa]);
  if(cols.length<2) return null;
  const rows = useMemo(() => [
    {id:'volatility',icon:'⚡',label:'Volatilidad',unit:'%',max:25, getValue:m=>m.volatility!=null?+m.volatility.toFixed(1):null, getColor:v=>PA_CALC.volColor(v,isDark),  inverted:true},
    {id:'safety',    icon:'🛡️',label:'Safety',     unit:'', max:100,getValue:m=>PA_CALC.safety(m),                                getColor:v=>PA_CALC.scoreColor(v,isDark),inverted:false,note:'aprox.'},
    {id:'momentum',  icon:'📈',label:'Momentum',   unit:'', max:100,getValue:m=>PA_CALC.momentum(m),                              getColor:v=>PA_CALC.scoreColor(v,isDark),inverted:false,note:'aprox.'},
  ], [isDark]);
  const trendArrow = vals => { const f=vals.find(v=>v!=null), l=[...vals].reverse().find(v=>v!=null); return f==null||l==null||f===l?'→':l>f?'↗':'↘'; };
  const t = T(isDark);
  return (
    <Glass isDark={isDark} className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className={cx('text-xl font-bold flex items-center gap-2',t.text)}><span>🕐</span><span className={cx('bg-gradient-to-r bg-clip-text text-transparent',C.cyan.gradient)}>Evolución {pa.daysBack}d</span></h3>
          <p className={cx('text-xs mt-0.5',t.muted)}>Calculado a partir de {pa.dataPoints} velas — Safety y Momentum son aproximaciones</p>
        </div>
        {pa?.overallSignal&&(()=>{ const b=PA.signalBadge(pa.overallSignal,isDark); return <span className={cx('px-3 py-1.5 rounded-full text-xs font-black border-2',b.bg)}>{b.label}</span>; })()}
      </div>
      <div className="space-y-5">
        {rows.map(row => {
          const vals = cols.map(c=>row.getValue(c.moment)), arrow=trendArrow(vals);
          const arrowColor = arrow==='↗'?(row.id==='volatility'?(isDark?'text-red-400':'text-red-600'):(isDark?'text-cyan-400':'text-cyan-600'))
                           : arrow==='↘'?(row.id==='volatility'?(isDark?'text-cyan-400':'text-cyan-600'):(isDark?'text-red-400':'text-red-600'))
                           : (isDark?'text-gray-400':'text-gray-500');
          return (
            <div key={row.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{row.icon}</span>
                <span className={cx('text-xs font-black uppercase',t.sub)}>{row.label}</span>
                {row.note&&<span className={cx('text-xs px-1.5 py-0.5 rounded',t.pill)}>{row.note}</span>}
                <span className={cx('text-sm font-black ml-auto',arrowColor)}>{arrow}</span>
              </div>
              <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${cols.length},1fr)`}}>
                {cols.map((col,ci) => {
                  const v=vals[ci], color=row.getColor(v);
                  const barPct = v!=null?(row.inverted?PA_CALC.bar(Math.max(0,row.max-v),row.max):PA_CALC.bar(v,row.max)):0;
                  const gk = v!=null ? PA_CALC.gradKey(row.id,v) : 'cyan';
                  return (
                    <div key={col.key} className={cx('rounded-xl p-3 border-2',col.isToday?(isDark?'bg-cyan-500/10 border-cyan-500/30':'bg-cyan-50 border-cyan-200'):(isDark?'bg-gray-800/40 border-gray-700/40':'bg-gray-100 border-gray-200'))}>
                      <div className={cx('text-xs font-bold mb-2',col.isToday?(isDark?'text-cyan-400':'text-cyan-600'):(isDark?'text-gray-500':'text-gray-500'))}>{col.label}</div>
                      <div className={cx('text-2xl font-black',color)}>{v!=null?`${v}${row.unit}`:'—'}</div>
                      <div className={cx('mt-2 h-1.5 rounded-full overflow-hidden',isDark?'bg-gray-700':'bg-gray-300')}>
                        <div className={cx('h-full bg-gradient-to-r transition-all duration-700',C[gk]?.gradient||C.cyan.gradient)} style={{width:`${barPct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
});

const BreakdownItem = memo(({label,data,isDark,C}) => {
  const[exp,setExp] = useState(false);
  const pct = (data.score/data.max)*100, color=U.color(pct,[[80,'cyan'],[60,'teal'],[40,'yellow'],[0,'red']]), hasDetails=data.details&&Object.keys(data.details).length>0;
  return (
    <div className="text-sm">
      <div className={cx('flex justify-between mb-1',hasDetails?'cursor-pointer':'',isDark?'text-gray-300':'text-gray-700','font-medium')} onClick={()=>hasDetails&&setExp(!exp)}>
        <span className={cx(T(isDark).sub,'capitalize flex items-center gap-2')}>{label.replace(/([A-Z])/g,' $1').trim()}{hasDetails&&<span className="text-xs">{exp?'▲':'▼'}</span>}</span>
        <span className="font-bold">{data.score}/{data.max}</span>
      </div>
      <div className={cx('h-2 rounded-full overflow-hidden border',isDark?'bg-gray-800 border-gray-700/50':'bg-gray-200 border-gray-300')}>
        <div className={cx('h-full bg-gradient-to-r transition-all duration-500',C[color].gradient)} style={{width:`${pct}%`}}/>
      </div>
      {exp&&hasDetails&&(
        <div className={cx('mt-2 p-3 rounded-lg text-xs space-y-1 border',T(isDark).inner)}>
          {Object.entries(data.details).map(([k,v]) => v!=null&&<div key={k} className="flex justify-between"><span className={cx(T(isDark).muted,'capitalize')}>{k.replace(/([A-Z])/g,' $1').trim()}:</span><span className={cx(isDark?'text-gray-300':'text-gray-700','font-mono font-medium')}>{typeof v==='number'?v.toFixed(2):String(v)}</span></div>)}
        </div>
      )}
    </div>
  );
});

const Score = memo(({title,score,breakdown,type,icon,desc,isDark,C,THRESHOLDS}) => {
  const color = U.color(score, THRESHOLDS[type]);
  const[exp,setExp] = useState(false);
  const retroLabel = useMemo(() => { const r=breakdown?.retrospective; return (!r?.available||!r.multiplier)?null:PA.multLabel(r.multiplier); }, [breakdown]);
  const retroColor = useMemo(() => retroLabel?(retroLabel.startsWith('+')?isDark?'text-cyan-400':'text-cyan-600':isDark?'text-red-400':'text-red-600'):null, [retroLabel,isDark]);
  return (
    <Glass isDark={isDark} glow className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cx('text-xl font-bold',T(isDark).text)}>{title}</h3>
            {retroLabel&&<span className={cx('text-xs font-black px-2 py-0.5 rounded-full border',retroLabel.startsWith('+')?isDark?'bg-cyan-500/15 border-cyan-500/30':'bg-cyan-50 border-cyan-200':isDark?'bg-red-500/15 border-red-500/30':'bg-red-50 border-red-200',retroColor)}>{retroLabel}</span>}
          </div>
          <div className={cx('text-xs font-medium',T(isDark).sub)}>{desc}</div>
        </div>
      </div>
      <div className={cx('text-6xl font-black mb-2',C[color].text)}>{score}<span className={cx('text-2xl',T(isDark).muted)}>/100</span></div>
      <div className={cx('h-4 rounded-full overflow-hidden mb-6 border-2',T(isDark).track,isDark?'border-gray-700/50':'border-gray-300')}>
        <div className={cx('h-full bg-gradient-to-r transition-all duration-1000 shadow-lg',C[color].gradient,C[color].glow)} style={{width:`${score}%`}}/>
      </div>
      {breakdown&&<div>
        <button onClick={()=>setExp(!exp)} className={cx('w-full text-left text-sm font-bold flex items-center gap-2 mb-3',isDark?'text-gray-400 hover:text-white':'text-gray-600 hover:text-gray-900')}><span>{exp?'▼':'▶'}</span><span>Desglose</span></button>
        {exp&&<div className="space-y-3">{Object.entries(breakdown).map(([k,d]) => d?.score!==undefined&&<BreakdownItem key={k} label={k} data={d} isDark={isDark} C={C}/>)}</div>}
      </div>}
    </Glass>
  );
});

const Scores = memo(({a,isDark,C,THRESHOLDS}) => {
  const scores = useMemo(() => [
    U.has(a.safetyScore)   && {title:'Safety',   score:a.safetyScore,   breakdown:a.safetyBreakdown,   type:'safety',   icon:'🛡️', desc:'Seguridad: liquidez, whales, contrato'},
    U.has(a.momentumScore) && {title:'Momentum', score:a.momentumScore, breakdown:a.momentumBreakdown, type:'momentum', icon:'📈', desc:'Momentum del precio'},
  ].filter(Boolean), [a]);
  if(!scores.length) return null;
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{scores.map(s=><Score key={s.title} {...s} isDark={isDark} C={C} THRESHOLDS={THRESHOLDS}/>)}</div>;
});

const ChatbotSection = memo(({a,addr,isDark,C,API}) => (
  <Glass isDark={isDark} className="p-8">
    <h3 className={cx('text-2xl font-black bg-gradient-to-r via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6',C.cyan.gradient)}>🤖 ASISTENTE IA</h3>
    {a.aiAnalysis&&<div className="mb-6"><div className={cx('text-sm whitespace-pre-line leading-relaxed rounded-xl p-6 border-2',isDark?'text-gray-200 bg-gray-950/50 border-cyan-500/30':'text-gray-800 bg-white border-cyan-300')}>{a.aiAnalysis}</div></div>}
    <ChatBox
      tokenAddress={addr.trim()}
      tokenContext={{
        symbol:     a.symbol,
        price:      a.price,
        safetyScore:   a.safetyScore,
        momentumScore: a.momentumScore,
        rsi:        a.rsi14,
        holders:    a.holders,
        patternSignal:       a.patternAnalysis?.overallSignal       || null,
        patternDays:         a.patternAnalysis?.daysBack            || null,
        patternConclusions:  a.patternAnalysis?.conclusions         || [],
        rsiTrend:            a.patternAnalysis?.trends?.rsi14?.direction    || null,
        priceTrend:          a.patternAnalysis?.trends?.price?.direction    || null,
        momentum:            a.patternAnalysis?.indicators?.momentum_acceleration || null,
      }}
      analysis={a}
      apiUrl={API}
    />
  </Glass>
));

const Whales = memo(({whales,wa,isDark,C,plan}) => {
  const t = T(isDark);
  const whaleLimit = plan==='enterprise' ? 20 : plan==='premium' ? 10 : 5;
  const riskCx = {
    high:   isDark?'bg-red-500/20 border-red-500/50'   :'bg-red-100 border-red-400',
    medium: isDark?'bg-yellow-500/20 border-yellow-500/50':'bg-yellow-100 border-yellow-400',
    low:    isDark?'bg-cyan-500/20 border-cyan-500/50'  :'bg-cyan-100 border-cyan-400',
  };
  return (
    <Glass isDark={isDark} className="p-8">
      <h3 className={cx('text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent mb-6',C.cyan.gradient)}>🐋 ANÁLISIS DE WHALES</h3>
      <div className={cx('p-4 rounded-xl mb-6 border-2',riskCx[wa.risk])}><div className={cx('text-sm font-bold',t.text)}>{wa.msg}</div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h4 className={cx('text-lg font-bold mb-4',t.text)}>📊 Concentración</h4>
          <div className="grid grid-cols-2 gap-4">
            {[['Top 5',`${wa.top5Pct.toFixed(1)}%`,'teal'],['Top 10',`${whales.slice(0,10).reduce((s,w)=>s+w.percent,0).toFixed(1)}%`,'cyan'],['Identificadas',wa.identified,'cyan'],['Anónimas',5-wa.identified,'yellow']].map(([l,v,c]) => (
              <div key={l} className={cx('text-center p-4 rounded-lg border-2 transition-all hover:scale-105',t.card)}>
                <div className={cx('text-3xl font-bold',C[c].text)}>{v}</div>
                <div className={cx('text-xs mt-1',t.sub)}>{l}</div>
              </div>
            ))}
          </div>
          <div className={cx('mt-6 p-4 rounded-xl border-2',t.inner)}>
            <div className={cx('text-xs font-bold mb-3',t.sub)}>🎯 DISTRIBUCIÓN TOP 5</div>
            {wa.top5.map((w,i) => (
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex justify-between mb-1"><span className={cx('text-xs',t.sub)}>#{i+1} {w.name||U.addr(w.address)}</span><span className={cx('text-xs font-bold',C.cyan.text)}>{w.percent.toFixed(2)}%</span></div>
                <div className={cx('h-2 rounded-full overflow-hidden',isDark?'bg-gray-800':'bg-gray-300')}><div className={cx('h-full bg-gradient-to-r transition-all duration-500',C.cyan.gradient)} style={{width:`${Math.min(w.percent*2,100)}%`}}/></div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className={cx('text-lg font-bold mb-4',t.text)}>📈 Holdings Visualización</h4>
          <div className={cx('rounded-xl p-6 border-2',t.inner)}><WhalesChart whales={whales}/></div>
          <div className={cx('mt-4 text-xs text-center italic',t.muted)}>💡 Top {whaleLimit} whales según tu plan</div>
        </div>
      </div>
      <div className={cx('border-t-2 pt-6',isDark?'border-cyan-500/30':'border-cyan-300/50')}>
        <h4 className={cx('text-lg font-bold mb-4',t.text)}>🏆 TOP {whaleLimit} WHALES</h4>
        <div className="space-y-3">
          {whales.map((w,i) => (
            <div key={i} className={cx('flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:scale-[1.02]',t.row)}>
              <div className={cx('flex items-center justify-center w-12 h-12 rounded-full border-2',isDark?'bg-cyan-500/20 border-cyan-500/50':'bg-cyan-100 border-cyan-300')}><span className={cx('text-xl font-black',C.cyan.text)}>#{i+1}</span></div>
              <div className="flex-1">
                <div className={cx('font-bold flex items-center gap-2',t.text)}>{w.name||U.addr(w.address)}{w.name&&<span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">✓</span>}</div>
                <div className={cx('text-sm capitalize',t.sub)}>{w.category||'Unknown'}</div>
              </div>
              <div className="text-right">
                <div className={cx('text-2xl font-black mb-1',C.cyan.text)}>{w.percent.toFixed(2)}%</div>
                <div className={cx('w-32 h-3 rounded-full overflow-hidden border',isDark?'bg-gray-700 border-gray-600':'bg-gray-300 border-gray-400')}><div className={cx('h-full bg-gradient-to-r transition-all duration-500',C.cyan.gradient)} style={{width:`${Math.min(w.percent*2,100)}%`}}/></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Glass>
  );
});

const AllCharts = memo(({a,slice,days,setDays,isDark,C}) => {
  const geometry = a.safetyBreakdown?.geometry||a.momentumBreakdown?.geometry||a.tokenomicsBreakdown?.geometry||null;
  return (
    <Glass isDark={isDark} className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className={cx('text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent',C.cyan.gradient)}>📊 GRÁFICOS</h3>
        <div className="flex gap-2">{[7,15,30].map(d=><Btn key={d} onClick={()=>setDays(d)} variant={days===d?'primary':'secondary'} isDark={isDark} className="!px-4 !py-2 !text-sm">{d}d</Btn>)}</div>
      </div>
      <div className="space-y-8">
        {slice&&<div className="space-y-6">
          <ChartCard title="📈 Precio" isDark={isDark}><PriceHistoryChart historicalData={{prices:slice.prices,volumes:slice.volumes,stats:slice.stats}} currentPrice={a.price} days={days}/></ChartCard>
          {slice.volumes?.length>0&&<ChartCard title={`📊 Volumen ${days}d`} isDark={isDark}><VolumeHistoryChart historicalData={{volumes:slice.volumes}} days={days}/></ChartCard>}
        </div>}
        {geometry&&<div className="space-y-6">
          <h4 className={cx('text-xl font-bold flex items-center gap-2',T(isDark).text)}><span>🕷️</span><span className={cx('bg-gradient-to-r bg-clip-text text-transparent',C.cyan.gradient)}>Relaciones Geométricas</span></h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {geometry.triangles&&<ChartCard title="🔺 Triangulares (3D)"  isDark={isDark}><GeometricRelationsChart geometry={geometry} type="triangles"/></ChartCard>}
            {geometry.squares&&  <ChartCard title="🟦 Cuadradas (4D)"     isDark={isDark}><GeometricRelationsChart geometry={geometry} type="squares"/></ChartCard>}
            {geometry.pentagons&&<ChartCard title="⬟ Pentagonales (5D)"   isDark={isDark}><GeometricRelationsChart geometry={geometry} type="pentagons"/></ChartCard>}
            {geometry.hexagons&& <ChartCard title="⬡ Hexagonales (6D)"    isDark={isDark}><GeometricRelationsChart geometry={geometry} type="hexagons"/></ChartCard>}
          </div>
          <div className={cx('p-4 rounded-xl border-2',isDark?'bg-cyan-500/10 border-cyan-500/30':'bg-cyan-100 border-cyan-300')}>
            <div className={cx('text-sm font-bold mb-2',isDark?'text-cyan-200':'text-cyan-900')}>🧠 Coherencia Global: {(geometry.globalCoherence*100).toFixed(1)}%</div>
            <div className={cx('text-xs',isDark?'text-cyan-300':'text-cyan-800')}>Promedio de todas las relaciones geométricas. Valores altos indican consistencia entre métricas on-chain y técnicas.</div>
          </div>
        </div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {a.safetyBreakdown&&  <ChartCard title="🛡️ Safety Breakdown"   isDark={isDark}><BreakdownChart breakdown={a.safetyBreakdown}   type="safety"/></ChartCard>}
          {a.momentumBreakdown&&<ChartCard title="📈 Momentum Breakdown" isDark={isDark}><BreakdownChart breakdown={a.momentumBreakdown} type="momentum" maxScore={100}/></ChartCard>}
          {a.priceHistory30d?.length>=2&&<ChartCard title="⚡ Volatilidad" isDark={isDark}><VolatilityChart data={a.priceHistory30d} days={days}/></ChartCard>}
          {a.liquidityHistory30d?.length>0&&<ChartCard title="💧 Liquidez" isDark={isDark}><LiquidityChart data={a.liquidityHistory30d} days={days}/></ChartCard>}
        </div>
      </div>
    </Glass>
  );
});

const UserHistoryPanel = memo(({data,isDark,C}) => {
  if(!data||data.loading) return null;
  const t = T(isDark);
  return (
    <Glass isDark={isDark} className="p-6 mb-6">
      <h3 className={cx('text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent mb-4',C.cyan.gradient)}>📜 Tu Historial</h3>
      {data.stats&&<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Búsquedas"      value={data.stats.total_searches}                             icon="🔍" color="cyan"   isDark={isDark} C={C}/>
        <StatCard label="Tokens Únicos"  value={data.stats.unique_tokens}                              icon="🪙" color="teal"   isDark={isDark} C={C}/>
        <StatCard label="Avg Safety"     value={data.stats.avg_safety.toFixed(1)}                      icon="🛡️" color="green"  isDark={isDark} C={C}/>
        <StatCard label="Blockchain Fav" value={data.stats.favorite_blockchain?.toUpperCase()||'N/A'}  icon="⛓️" color="purple" isDark={isDark} C={C}/>
      </div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className={cx('text-sm font-bold mb-3',t.text)}>🕒 Recientes</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recent.slice(0,10).map((tok,i) => (
              <div key={i} className={cx('p-3 rounded-lg border',isDark?'bg-gray-900/30 border-gray-700':'bg-white border-gray-200')}>
                <div className="flex items-center justify-between">
                  <div><div className="font-bold">{tok.symbol}</div><div className="text-xs text-gray-400">{tok.blockchain}</div></div>
                  <div className="text-xs text-gray-500">{new Date(tok.search_timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className={cx('text-sm font-bold mb-3',t.text)}>⭐ Favoritos (Más buscados)</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.favorites.map((tok,i) => (
              <div key={i} className={cx('p-3 rounded-lg border',isDark?'bg-gray-900/30 border-gray-700':'bg-white border-gray-200')}>
                <div className="flex items-center justify-between">
                  <div><div className="font-bold">{tok.symbol}</div><div className="text-xs text-gray-400">{tok.blockchain}</div></div>
                  <div className="text-right"><div className="text-sm font-bold text-cyan-400">{tok.searches}x</div><div className="text-xs text-gray-500">Score: {((tok.avg_safety+tok.avg_momentum)/2).toFixed(1)}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Glass>
  );
});

const AnalyticsPanel = ({analyticsLoading,analyticsError,analyticsData,analyticsPeriod,setAnalyticsPeriod,isDark,C}) => {
  const t = T(isDark);
  return (
    <div className="mb-6">
      <Glass isDark={isDark} className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={cx('text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent',C.cyan.gradient)}>🔎 Analytics</h3>
            <div className={cx('text-xs',t.sub)}>Visión rápida: trending, top rated y KPIs globales</div>
          </div>
          <div className="flex gap-2">
            {['1h','24h','7d','30d'].map(p => (
              <button key={p} onClick={()=>setAnalyticsPeriod(p)} className={cx('px-3 py-1 rounded-lg font-bold text-sm',analyticsPeriod===p?'bg-gradient-to-br from-cyan-400 to-teal-400 text-white shadow':isDark?'bg-gray-800 text-gray-300':'bg-gray-100 text-gray-700')}>{p.toUpperCase()}</button>
            ))}
          </div>
        </div>
        {analyticsLoading ? <div className="text-center py-8 text-sm text-gray-400">Cargando analytics...</div>
         : analyticsError ? <div className="text-center py-8 text-sm text-red-400">{analyticsError}</div>
         : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <StatCard label="Tokens Analizados" value={(analyticsData?.stats?.total_tokens_analyzed||0).toLocaleString()} icon="🪙" color="cyan"   isDark={isDark} C={C}/>
              <StatCard label="Búsquedas Totales" value={(analyticsData?.stats?.total_searches||0).toLocaleString()}        icon="🔍" color="teal"   isDark={isDark} C={C}/>
              <StatCard label="Búsquedas 24h"     value={(analyticsData?.stats?.searches_24h||0).toLocaleString()}          icon="📈" color="green"  isDark={isDark} C={C}/>
              <StatCard label="Avg Global Score"  value={analyticsData?.stats?(((analyticsData.stats.global_avg_safety+analyticsData.stats.global_avg_momentum)/2).toFixed(1)):'N/A'} icon="⭐" color="yellow" isDark={isDark} C={C}/>
            </div>
            {[
              {title:`🔥 Trending (${analyticsPeriod.toUpperCase()})`, items:analyticsData?.trending||[],  renderVal:t=><><div className="text-lg font-black text-cyan-400">{t.searches}</div><div className="text-xs text-gray-400">búsquedas</div></>, bg:'bg-cyan-500/10'},
              {title:'⭐ Top Rated',                                    items:analyticsData?.topRated||[], renderVal:t=><><div className="text-lg font-black">{(((t.avg_safety_score||0)+(t.avg_momentum_score||0))/2).toFixed(1)}</div><div className="text-xs text-gray-400">score</div></>,     bg:'bg-green-500/10'},
            ].map(({title,items,renderVal,bg}) => (
              <div key={title}>
                <h4 className={cx('text-sm font-bold mb-3',t.text)}>{title}</h4>
                <div className="space-y-2">
                  {items.slice(0,5).map((tok,i) => (
                    <div key={tok.token_address} className={cx('flex items-center gap-3 p-3 rounded-lg border-2',isDark?'bg-gray-900/30 border-gray-700/40':'bg-white/80 border-gray-200')}>
                      <div className={cx('w-10 h-10 rounded-full flex items-center justify-center',bg)}><span className="font-black">{i+1}</span></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><div className="font-bold text-sm">{tok.symbol||'UNKNOWN'}</div><div className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 capitalize">{tok.blockchain||'unknown'}</div></div>
                        <div className="text-xs font-mono text-gray-400">{tok.token_address?.slice(0,8)}...{tok.token_address?.slice(-6)}</div>
                      </div>
                      <div className="text-right">{renderVal(tok)}</div>
                    </div>
                  ))}
                  {items.length===0&&<div className="text-xs text-gray-400 text-center py-4">Sin datos</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Glass>
    </div>
  );
};

const SecondaryContext = ({a,analyticsLoading,analyticsError,analyticsData,analyticsPeriod,setAnalyticsPeriod,userHistory,isDark,C}) => {
  const hasAnalysis = !!a;
  const[open,setOpen] = useState(!hasAnalysis);
  useEffect(() => { if(hasAnalysis) setOpen(false); }, [hasAnalysis]);
  return (
    <div className="mt-6">
      {hasAnalysis&&(
        <button onClick={()=>setOpen(o=>!o)} className={cx('w-full flex items-center justify-between px-5 py-3 rounded-xl border-2 mb-3 transition-all',isDark?'border-gray-700/50 bg-gray-800/30 hover:bg-gray-800/60 text-gray-400 hover:text-white':'border-gray-200 bg-gray-100/60 hover:bg-gray-200 text-gray-500 hover:text-gray-800')}>
          <span className="text-sm font-bold flex items-center gap-2"><span>🔎</span> Analytics & Historial</span>
          <span className="text-xs">{open?'▲ ocultar':'▼ mostrar'}</span>
        </button>
      )}
      {open&&<>
        <AnalyticsPanel analyticsLoading={analyticsLoading} analyticsError={analyticsError} analyticsData={analyticsData} analyticsPeriod={analyticsPeriod} setAnalyticsPeriod={setAnalyticsPeriod} isDark={isDark} C={C}/>
        {userHistory&&!userHistory.loading&&<UserHistoryPanel data={userHistory} isDark={isDark} C={C}/>}
      </>}
    </div>
  );
};

// ─── CONTENT ──────────────────────────────────────────────────────────────────
function Content() {
  const userHistory = useUserHistory();
  const {toggle,isDark} = useTheme();
  const config = useConfig();
  const router = useRouter();
  const sp     = useSearchParams();
  useWakeup();
  const srv                             = useHealth(config?.limits?.healthInterval||12000);
  const {role,isAdmin,stats,logout,refreshStats} = useAuth();
  const {loading,data:a,error,step,analyze,modal,setModal,confirm} = useAnalysis(refreshStats, config?.loadingSteps||[]);
  const [addr,setAddr]           = useState('');
  const [copied,setCopied]       = useState(false);
  const [days,setDays]           = useState(7);
  const [showAPIKeys,setShowAPIKeys] = useState(false);
  const [showStripe,setShowStripe]   = useState(false);
  const [analyticsPeriod,setAnalyticsPeriod] = useState('24h');
  const {loading:analyticsLoading,data:analyticsData,error:analyticsError} = useAnalytics(analyticsPeriod);
  const C          = useMemo(() => config?.colors?.[isDark?'DARK':'LIGHT']||{}, [config,isDark]);
  const THRESHOLDS = config?.thresholds||{};
  const wa         = useWhales(a?.whales, stats?.plan);
  const slice      = useHistSlice(a?.priceHistory30d, a?.volumeHistory30d, days);
  useEffect(() => { const u=sp.get('address'); if(u) setAddr(u); }, [sp]);
  useEffect(() => { document.title = a ? `${a.symbol} - LYZERD` : 'LYZERD - Crypto Analysis'; }, [a]);
  const share = useCallback(() => {
    if(!addr) return;
    navigator.clipboard.writeText(`${window.location.origin}/?address=${addr.trim()}`);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  }, [addr]);
  if(!config) return null;
  return (
    <main className={cx('min-h-screen transition-colors relative overflow-hidden',isDark?'bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950':'bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50')}>
      <BgFx isDark={isDark}/>
      <Disclaimer isDark={isDark}/>
      <ServerStatus status={srv} isDark={isDark} C={C}/>
      <Header
        email={U.email()}
        role={role}
        stats={stats}
        isAdmin={isAdmin}
        onAdmin={()=>router.push('/admin')}
        onAuth={()=>LS.get('api_key')?logout():router.push('/login')}
        onTheme={toggle}
        onStripe={()=>setShowStripe(true)}
        onAPIKeys={()=>setShowAPIKeys(true)}
        srv={srv}
        isDark={isDark}
        C={C}
        appInfo={config.app}
      />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <Search addr={addr} setAddr={setAddr} loading={loading} error={error} copied={copied} hasData={!!a} onAnalyze={()=>!srv.online||loading?null:analyze(addr)} onShare={share} isDark={isDark} C={C}/>
        {loading&&<Loading step={step} isDark={isDark} C={C} LOADING_STEPS={config.loadingSteps}/>}
        {a&&!loading&&(
          <div className="space-y-6">
            <Lazy>              <TokenHeader    a={a} isDark={isDark} C={C} THRESHOLDS={THRESHOLDS}/></Lazy>
            <Lazy delay={50}>  <RetroTimeline  a={a} isDark={isDark} C={C}/></Lazy>
            <Lazy delay={100}> <StatsGrid      a={a} isDark={isDark} C={C} THRESHOLDS={THRESHOLDS}/></Lazy>
            <Lazy delay={200}> <ChatbotSection a={a} addr={addr} isDark={isDark} C={C} API={API}/></Lazy>
            {(a.safetyScore||a.momentumScore)&&<Lazy delay={300}><Scores a={a} isDark={isDark} C={C} THRESHOLDS={THRESHOLDS}/></Lazy>}
            {a?.whales?.length>0&&wa&&stats?.plan!=='free'&&(
              <Lazy delay={400}><Whales whales={wa.visible} wa={wa} isDark={isDark} C={C} plan={stats?.plan}/></Lazy>
            )}
            <Lazy delay={500}><Suspense fallback={<Skeleton isDark={isDark}/>}><AllCharts a={a} slice={slice} days={days} setDays={setDays} isDark={isDark} C={C}/></Suspense></Lazy>
          </div>
        )}
        <SecondaryContext a={a} analyticsLoading={analyticsLoading} analyticsError={analyticsError} analyticsData={analyticsData} analyticsPeriod={analyticsPeriod} setAnalyticsPeriod={setAnalyticsPeriod} userHistory={userHistory} isDark={isDark} C={C}/>
      </div>
      {modal&&!loading&&<Modal stats={stats} onConfirm={confirm} onCancel={()=>setModal(false)} isDark={isDark} C={C}/>}
      {showAPIKeys&&<APIKeysModal onClose={()=>setShowAPIKeys(false)} isDark={isDark} C={C} maxKeys={config.limits.maxApiKeys}/>}
      {showStripe&&<StripeModal onClose={()=>setShowStripe(false)} currentPlan={stats?.plan||'free'} isDark={isDark} C={C} Glass={Glass} Btn={Btn}/>}
    </main>
  );
}

export default function Home() {
  return <ThemeProvider><ConfigProvider><Content/></ConfigProvider></ThemeProvider>;
}
