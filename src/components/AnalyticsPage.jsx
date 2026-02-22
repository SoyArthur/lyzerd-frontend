// ═══════════════════════════════════════════════════════════════
// AnalyticsPage.jsx - COMPREHENSIVE ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════

'use client';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('24h');
  const [tier, setTier] = useState('all');
  
  const [data, setData] = useState({
    trending: [],
    topRated: [],
    worst: [],
    stats: null,
    userStats: null,
    userFavorites: [],
    userRecent: [],
    enterpriseIntel: null,
  });
  
  const [tokenDetail, setTokenDetail] = useState(null);
  const [comparison, setComparison] = useState({
    selected: [],
    results: null,
  });
  
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userTier, setUserTier] = useState('free');
  
  // Helpers seguros
  const safeNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const safeFixed = (v, d = 1) => {
    return (v != null && Number.isFinite(Number(v))) ? Number(v).toFixed(d) : 'N/A';
  };
  const safeSliceAddr = (addr) => {
    if (!addr || typeof addr !== 'string') return 'N/A';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Mock user (en producción vendría de auth)
  useEffect(() => {
    // Simular obtener userId y tier del auth context
    setUserId('user_123');
    setUserTier('premium'); // free, premium, enterprise
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    let mounted = true;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const requests = [
          axios.get(`${API}/api/analytics/trending?period=${period}&tier=${tier}&limit=15`),
          axios.get(`${API}/api/analytics/top-rated?limit=10&minSearches=3`),
          axios.get(`${API}/api/analytics/worst-rated?limit=5&minSearches=3`),
          axios.get(`${API}/api/analytics/stats`),
        ];

        // User-specific data
        if (userId) {
          requests.push(
            axios.get(`${API}/api/analytics/user/${userId}/stats`),
            axios.get(`${API}/api/analytics/user/${userId}/favorites?limit=10`),
            axios.get(`${API}/api/analytics/user/${userId}/recent?limit=20`)
          );
        }

        // Enterprise intelligence
        if (userTier === 'enterprise') {
          requests.push(
            axios.get(`${API}/api/analytics/enterprise/intelligence?period=${period}`, {
              headers: { 'x-user-id': userId }
            })
          );
        }

        const results = await Promise.allSettled(requests);
        
        if (!mounted) return;

        const [trendingRes, topRatedRes, worstRes, statsRes, userStatsRes, favoritesRes, recentRes, enterpriseRes] = results;

        setData({
          trending: trendingRes.status === 'fulfilled' ? (trendingRes.value?.data?.data || trendingRes.value?.data || []) : [],
          topRated: topRatedRes.status === 'fulfilled' ? (topRatedRes.value?.data?.data || topRatedRes.value?.data || []) : [],
          worst: worstRes.status === 'fulfilled' ? (worstRes.value?.data?.data || worstRes.value?.data || []) : [],
          stats: statsRes.status === 'fulfilled' ? normalizeStats(statsRes.value?.data?.stats || statsRes.value?.data) : null,
          userStats: userStatsRes?.status === 'fulfilled' ? userStatsRes.value?.data : null,
          userFavorites: favoritesRes?.status === 'fulfilled' ? (favoritesRes.value?.data || []) : [],
          userRecent: recentRes?.status === 'fulfilled' ? (recentRes.value?.data || []) : [],
          enterpriseIntel: enterpriseRes?.status === 'fulfilled' ? enterpriseRes.value?.data : null,
        });
      } catch (err) {
        console.error('[Analytics] Fetch error:', err);
        setError(err?.response?.data?.message || err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [period, tier, userId, userTier]);

  const normalizeStats = (raw) => {
    if (!raw) return null;
    return {
      total_tokens_analyzed: safeNum(raw.total_tokens_analyzed ?? raw.total_tokens ?? 0),
      total_searches: safeNum(raw.total_searches ?? raw.totalSearches ?? 0),
      searches_24h: safeNum(raw.searches_24h ?? raw.searches24h ?? 0),
      global_avg_safety: safeNum(raw.global_avg_safety ?? raw.globalAvgSafety ?? 0),
      global_avg_momentum: safeNum(raw.global_avg_momentum ?? raw.globalAvgMomentum ?? 0),
      blockchain_distribution: raw.blockchain_distribution || {},
      last_updated: raw.last_updated || new Date().toISOString(),
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // TOKEN DETAIL MODAL
  // ═══════════════════════════════════════════════════════════════
  const fetchTokenDetail = async (tokenAddress) => {
    try {
      const [analyticsRes, trendsRes] = await Promise.all([
        axios.get(`${API}/api/analytics/token/${tokenAddress}`),
        axios.get(`${API}/api/analytics/token/${tokenAddress}/trends?days=7`)
      ]);
      
      setTokenDetail({
        ...analyticsRes.data,
        trends: trendsRes.data || [],
      });
    } catch (err) {
      console.error('[Token Detail] Error:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TOKEN COMPARISON
  // ═══════════════════════════════════════════════════════════════
  const addToComparison = (tokenAddress) => {
    if (comparison.selected.length >= 5) return;
    if (comparison.selected.includes(tokenAddress)) return;
    
    const newSelected = [...comparison.selected, tokenAddress];
    setComparison({ ...comparison, selected: newSelected });
    
    if (newSelected.length >= 2) {
      fetchComparison(newSelected);
    }
  };

  const removeFromComparison = (tokenAddress) => {
    const newSelected = comparison.selected.filter(a => a !== tokenAddress);
    setComparison({ selected: newSelected, results: null });
    
    if (newSelected.length >= 2) {
      fetchComparison(newSelected);
    }
  };

  const fetchComparison = async (addresses) => {
    try {
      const res = await axios.post(`${API}/api/analytics/compare`, { addresses });
      setComparison(prev => ({ ...prev, results: res.data }));
    } catch (err) {
      console.error('[Comparison] Error:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  const StatsCard = ({ label, value, icon, color = 'cyan', subtitle }) => (
    <div className="bg-gray-800/50 border-2 border-gray-700/50 rounded-xl p-6 hover:scale-105 transition-all">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs text-gray-400 uppercase font-bold">{label}</span>
      </div>
      <div className={`text-4xl font-black text-${color}-400 mb-1`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );

  const TrendingTable = ({ items }) => (
    <div className="bg-gray-800/50 border-2 border-cyan-500/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
          🔥 TRENDING ({tier.toUpperCase()} · {period.toUpperCase()})
        </h3>
        
        <div className="flex gap-2">
          {['all', 'free', 'premium', 'enterprise'].map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                tier === t
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {(!items || items.length === 0) ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📊</div>
          <div>No hay datos para {tier} en {period}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((token, idx) => {
            const signal = safeNum(token.signal_strength, 0);
            const signalColor = signal >= 7 ? 'green' : signal >= 4 ? 'yellow' : 'red';
            
            return (
              <div 
                key={`${token.token_address}-${idx}`} 
                className="flex items-center gap-4 p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg border border-gray-700/50 transition-all group cursor-pointer"
                onClick={() => fetchTokenDetail(token.token_address)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50">
                  <span className="text-xl font-black text-cyan-400">#{idx + 1}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-lg">{token.symbol || 'UNKNOWN'}</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                      {token.blockchain}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full bg-${signalColor}-500/20 text-${signalColor}-300 border border-${signalColor}-500/30`}>
                      Signal: {safeFixed(signal, 1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 font-mono">{safeSliceAddr(token.token_address)}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Weighted</div>
                  <div className="text-2xl font-black text-cyan-400">{safeFixed(token.weighted_searches, 2)}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Searches</div>
                  <div className="text-xl font-bold text-teal-400">{safeNum(token.searches)}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Safety</div>
                    <div className="text-lg font-bold text-teal-400">{safeFixed(token.avg_safety_score, 1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Momentum</div>
                    <div className="text-lg font-bold text-cyan-400">{safeFixed(token.avg_momentum_score, 1)}</div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToComparison(token.token_address);
                  }}
                  className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-bold transition-all"
                >
                  + Compare
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const TopRatedTable = ({ items }) => (
    <div className="bg-gray-800/50 border-2 border-green-500/30 rounded-xl p-6">
      <h3 className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-6">
        ⭐ TOP RATED TOKENS
      </h3>
      
      {(!items || items.length === 0) ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🏆</div>
          <div>No hay tokens con suficientes búsquedas aún.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((token, idx) => {
            const safety = safeNum(token.avg_safety_score, 0);
            const momentum = safeNum(token.avg_momentum_score, 0);
            const composite = (safety + momentum) / 2;
            const color = composite >= 80 ? 'green' : composite >= 60 ? 'cyan' : composite >= 40 ? 'yellow' : 'red';

            return (
              <div 
                key={`${token.token_address}-${idx}`} 
                className="flex items-center gap-4 p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg border border-gray-700/50 transition-all cursor-pointer"
                onClick={() => fetchTokenDetail(token.token_address)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500/50">
                  <span className="text-xl font-black text-green-400">#{idx + 1}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-lg">{token.symbol || 'UNKNOWN'}</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                      {token.blockchain}
                    </span>
                  </div>
                  {token.name && <div className="text-sm text-gray-400">{token.name}</div>}
                </div>
                
                <div className="text-center">
                  <div className={`text-3xl font-black text-${color}-400`}>{safeFixed(composite, 1)}</div>
                  <div className="text-xs text-gray-500">score</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Safety</div>
                    <div className="text-lg font-bold text-teal-400">{safeFixed(safety, 1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Momentum</div>
                    <div className="text-lg font-bold text-cyan-400">{safeFixed(momentum, 1)}</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Búsquedas</div>
                  <div className="text-lg font-bold text-purple-400">{safeNum(token.search_count)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const WorstRatedTable = ({ items }) => (
    <div className="bg-gray-800/50 border-2 border-red-500/30 rounded-xl p-6">
      <h3 className="text-2xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-6">
        ⚠️ WORST RATED (Caution)
      </h3>
      
      {(!items || items.length === 0) ? (
        <div className="text-center py-8 text-gray-500">Sin datos</div>
      ) : (
        <div className="space-y-2">
          {items.map((token, idx) => {
            const composite = safeNum((token.avg_safety_score + token.avg_momentum_score) / 2);
            
            return (
              <div 
                key={`${token.token_address}-${idx}`} 
                className="flex items-center gap-4 p-3 bg-red-900/20 hover:bg-red-900/30 rounded-lg border border-red-500/30 transition-all cursor-pointer"
                onClick={() => fetchTokenDetail(token.token_address)}
              >
                <span className="text-red-400 font-bold">#{idx + 1}</span>
                <div className="flex-1">
                  <span className="font-bold text-white">{token.symbol}</span>
                  <span className="text-xs text-gray-500 ml-2">{token.blockchain}</span>
                </div>
                <div className="text-red-400 font-black">{safeFixed(composite, 1)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const UserStatsPanel = ({ stats, favorites, recent }) => {
    if (!stats) return null;
    
    return (
      <div className="space-y-6">
        {/* User Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard 
            label="Tus Búsquedas" 
            value={safeNum(stats.total_searches)} 
            icon="🔍" 
            color="cyan"
          />
          <StatsCard 
            label="Tokens Únicos" 
            value={safeNum(stats.unique_tokens)} 
            icon="🪙" 
            color="purple"
          />
          <StatsCard 
            label="Avg Safety" 
            value={safeFixed(stats.avg_safety, 1)} 
            icon="🛡️" 
            color="green"
            subtitle={`Momentum: ${safeFixed(stats.avg_momentum, 1)}`}
          />
        </div>

        {/* Favorite Blockchain */}
        {stats.favorite_blockchain && (
          <div className="bg-gray-800/50 border-2 border-blue-500/30 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-2">Tu Blockchain Favorita</div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⛓️</span>
              <span className="text-2xl font-black text-blue-400 capitalize">{stats.favorite_blockchain}</span>
            </div>
          </div>
        )}

        {/* Favorites */}
        <div className="bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-xl font-black text-yellow-400 mb-4">⭐ Tus Favoritos</h3>
          
          {(!favorites || favorites.length === 0) ? (
            <div className="text-center py-8 text-gray-500">No tienes favoritos aún</div>
          ) : (
            <div className="space-y-2">
              {favorites.slice(0, 5).map((token, idx) => (
                <div 
                  key={`${token.token_address}-${idx}`}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg cursor-pointer transition-all"
                  onClick={() => fetchTokenDetail(token.token_address)}
                >
                  <span className="font-bold text-white">{token.symbol}</span>
                  <span className="text-xs text-gray-500">{token.blockchain}</span>
                  <div className="flex-1" />
                  <span className="text-sm text-yellow-400">{safeNum(token.searches)} búsquedas</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent */}
        <div className="bg-gray-800/50 border-2 border-cyan-500/30 rounded-xl p-6">
          <h3 className="text-xl font-black text-cyan-400 mb-4">🕐 Búsquedas Recientes</h3>
          
          {(!recent || recent.length === 0) ? (
            <div className="text-center py-8 text-gray-500">Sin búsquedas recientes</div>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 10).map((search, idx) => (
                <div 
                  key={`${search.token_address}-${idx}`}
                  className="flex items-center gap-3 p-2 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg cursor-pointer text-sm transition-all"
                  onClick={() => fetchTokenDetail(search.token_address)}
                >
                  <span className="font-bold text-white">{search.symbol}</span>
                  <span className="text-xs text-gray-500">{search.blockchain}</span>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-400">
                    {new Date(search.search_timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ComparisonPanel = () => {
    if (comparison.selected.length === 0) {
      return (
        <div className="bg-gray-800/50 border-2 border-purple-500/30 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-2xl font-bold text-gray-300 mb-2">Token Comparator</div>
          <div className="text-gray-500">Selecciona 2-5 tokens desde las tablas para comparar</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Selected Tokens */}
        <div className="bg-gray-800/50 border-2 border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-purple-400">Seleccionados ({comparison.selected.length}/5)</h3>
            <button
              onClick={() => setComparison({ selected: [], results: null })}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-bold"
            >
              Limpiar
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {comparison.selected.map(addr => (
              <div 
                key={addr}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg"
              >
                <span className="text-sm font-mono text-purple-300">{safeSliceAddr(addr)}</span>
                <button
                  onClick={() => removeFromComparison(addr)}
                  className="text-red-400 hover:text-red-300 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Results */}
        {comparison.results && (
          <div className="bg-gray-800/50 border-2 border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-xl font-black text-cyan-400 mb-4">Comparación</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-400 text-sm">Token</th>
                    <th className="text-center py-3 px-2 text-gray-400 text-sm">Chain</th>
                    <th className="text-center py-3 px-2 text-gray-400 text-sm">Safety</th>
                    <th className="text-center py-3 px-2 text-gray-400 text-sm">Momentum</th>
                    <th className="text-center py-3 px-2 text-gray-400 text-sm">Composite</th>
                    <th className="text-center py-3 px-2 text-gray-400 text-sm">Searches</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.results.map((token, idx) => {
                    const composite = safeNum(token.composite_score);
                    const color = composite >= 70 ? 'green' : composite >= 50 ? 'cyan' : composite >= 30 ? 'yellow' : 'red';
                    
                    return (
                      <tr 
                        key={`${token.token_address}-${idx}`}
                        className="border-b border-gray-800 hover:bg-gray-900/50 cursor-pointer"
                        onClick={() => fetchTokenDetail(token.token_address)}
                      >
                        <td className="py-3 px-2">
                          <div className="font-bold text-white">{token.symbol}</div>
                          <div className="text-xs text-gray-500 font-mono">{safeSliceAddr(token.token_address)}</div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 capitalize">
                            {token.blockchain}
                          </span>
                        </td>
                        <td className="text-center py-3 px-2 font-bold text-teal-400">
                          {safeFixed(token.avg_safety_score, 1)}
                        </td>
                        <td className="text-center py-3 px-2 font-bold text-cyan-400">
                          {safeFixed(token.avg_momentum_score, 1)}
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className={`text-lg font-black text-${color}-400`}>
                            {safeFixed(composite, 1)}
                          </span>
                        </td>
                        <td className="text-center py-3 px-2 text-purple-400">
                          {safeNum(token.search_count)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const EnterprisePanel = ({ intel }) => {
    if (!intel) {
      return (
        <div className="bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <div className="text-2xl font-bold text-gray-300 mb-2">Enterprise Intelligence</div>
          <div className="text-gray-500">Cargando datos exclusivos...</div>
        </div>
      );
    }

    const { trending, metrics } = intel;

    return (
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard 
            label="Total Searches" 
            value={safeNum(metrics.total_searches)} 
            icon="🔍" 
            color="yellow"
          />
          <StatsCard 
            label="Unique Tokens" 
            value={safeNum(metrics.unique_tokens)} 
            icon="🪙" 
            color="purple"
          />
          <StatsCard 
            label="Avg Credibility" 
            value={safeFixed(metrics.avg_credibility, 3)} 
            icon="🎯" 
            color="cyan"
          />
          <StatsCard 
            label="Whale Concentration" 
            value={`${safeFixed(metrics.whale_concentration * 100, 1)}%`}
            icon="🐋" 
            color="blue"
          />
        </div>

        {/* Data Quality */}
        <div className="bg-gray-800/50 border-2 border-green-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <div className="text-sm text-gray-400">Data Quality</div>
              <div className={`text-2xl font-black capitalize ${
                metrics.data_quality === 'excellent' ? 'text-green-400' :
                metrics.data_quality === 'good' ? 'text-cyan-400' :
                metrics.data_quality === 'moderate' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {metrics.data_quality}
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Trending */}
        <div className="bg-gray-800/50 border-2 border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-2xl font-black text-yellow-400 mb-6">🏢 Enterprise Trending</h3>
          
          <div className="space-y-3">
            {trending.map((token, idx) => (
              <div 
                key={`${token.token_address}-${idx}`}
                className="flex items-center gap-4 p-4 bg-yellow-900/10 hover:bg-yellow-900/20 rounded-lg border border-yellow-500/30 cursor-pointer transition-all"
                onClick={() => fetchTokenDetail(token.token_address)}
              >
                <span className="text-2xl font-black text-yellow-400">#{idx + 1}</span>
                
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">{token.symbol}</div>
                  <div className="text-sm text-gray-400">{token.blockchain}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400">Weighted</div>
                  <div className="text-xl font-black text-yellow-400">{safeFixed(token.weighted_searches, 2)}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-gray-400">Signal</div>
                  <div className="text-lg font-bold text-cyan-400">{safeFixed(token.signal_strength, 1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TokenDetailModal = ({ token }) => {
    if (!token) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setTokenDetail(null)}
      >
        <div 
          className="bg-gray-900 border-2 border-cyan-500/50 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black text-white mb-2">{token.symbol || 'UNKNOWN'}</h2>
              <div className="text-sm text-gray-400">{token.name}</div>
              <div className="text-xs text-gray-500 font-mono">{token.token_address}</div>
            </div>
            <button
              onClick={() => setTokenDetail(null)}
              className="text-4xl text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Avg Safety</div>
              <div className="text-2xl font-black text-teal-400">{safeFixed(token.avg_safety_score, 1)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Avg Momentum</div>
              <div className="text-2xl font-black text-cyan-400">{safeFixed(token.avg_momentum_score, 1)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Total Searches</div>
              <div className="text-2xl font-black text-purple-400">{safeNum(token.search_count)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Blockchain</div>
              <div className="text-lg font-bold text-white capitalize">{token.blockchain}</div>
            </div>
          </div>

          {/* Trends Chart (Simple) */}
          {token.trends && token.trends.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-xl font-black text-cyan-400 mb-4">📈 7-Day Trends</h3>
              
              <div className="space-y-2">
                {token.trends.map((day, idx) => (
                  <div key={`${day.date}-${idx}`} className="flex items-center gap-4">
                    <div className="text-sm text-gray-400 w-24">{new Date(day.date).toLocaleDateString()}</div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="text-xs text-gray-500 w-12">S:{safeFixed(day.avg_safety, 0)}</div>
                      <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-400 to-cyan-400"
                          style={{ width: `${(day.avg_safety / 100) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">{safeNum(day.searches)} searches</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {token.search_history && token.search_history.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6 mt-6">
              <h3 className="text-xl font-black text-purple-400 mb-4">🕐 Recent Activity</h3>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {token.search_history.slice(0, 10).map((search, idx) => (
                  <div key={`search-${idx}`} className="flex items-center gap-3 text-sm">
                    <div className="text-gray-400">{new Date(search.search_timestamp).toLocaleString()}</div>
                    <div className="text-teal-400">S:{safeFixed(search.safety_score, 0)}</div>
                    <div className="text-cyan-400">M:{safeFixed(search.momentum_score, 0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const BlockchainDistribution = ({ distribution }) => {
    if (!distribution) return null;
    
    const chains = Object.entries(distribution).map(([name, data]) => ({
      name,
      count: data.count,
      searches: data.searches,
    }));
    
    const totalSearches = chains.reduce((sum, c) => sum + (c.searches || 0), 0);
    
    return (
      <div className="bg-gray-800/50 border-2 border-blue-500/30 rounded-xl p-6">
        <h3 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-6">
          🔗 BLOCKCHAIN DISTRIBUTION
        </h3>
        
        <div className="space-y-4">
          {chains.map(chain => {
            const pct = totalSearches > 0 ? (chain.searches / totalSearches) * 100 : 0;
            
            return (
              <div key={chain.name}>
                <div className="flex justify-between mb-2">
                  <span className="text-white font-bold capitalize">{chain.name}</span>
                  <span className="text-gray-400 text-sm">
                    {safeNum(chain.searches).toLocaleString()} ({safeFixed(pct, 1)}%)
                  </span>
                </div>
                
                <div className="h-3 bg-gray-900/50 rounded-full overflow-hidden border border-gray-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                
                <div className="text-xs text-gray-500 mt-1">{safeNum(chain.count)} tokens</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  
  if (loading && !data.stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <div className="text-2xl text-white font-bold">Cargando Analytics...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-2xl font-bold text-red-300 mb-2">Error al cargar Analytics</div>
          <div className="text-sm text-red-200">{error}</div>
        </div>
      </div>
    );
  }
  
  const stats = data.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-2xl opacity-15 bg-cyan-500" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-2xl opacity-10 bg-teal-500" />
      </div>
      
      {/* Header */}
      <header className="border-b-2 border-cyan-500/30 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📊</div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  ANALYTICS
                </h1>
                <div className="text-xs text-gray-400">Real-time Token Intelligence</div>
              </div>
            </div>
            
            {/* Period Selector */}
            <div className="flex gap-2">
              {['1h', '24h', '7d', '30d'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    period === p
                      ? 'bg-gradient-to-br from-cyan-400 to-teal-400 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            {[
              { id: 'overview', label: '🌍 Overview', show: true },
              { id: 'user', label: '👤 My Analytics', show: userId },
              { id: 'compare', label: '📊 Comparator', show: true },
              { id: 'enterprise', label: '🏢 Enterprise', show: userTier === 'enterprise' },
            ].filter(tab => tab.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-t-lg font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-cyan-400 border-t-2 border-x-2 border-cyan-500/50'
                    : 'bg-gray-900/50 text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard 
                label="Tokens Analizados" 
                value={safeNum(stats.total_tokens_analyzed).toLocaleString()} 
                icon="🪙" 
                color="cyan"
              />
              <StatsCard 
                label="Búsquedas Totales" 
                value={safeNum(stats.total_searches).toLocaleString()} 
                icon="🔍" 
                color="teal"
              />
              <StatsCard 
                label="Búsquedas 24h" 
                value={safeNum(stats.searches_24h).toLocaleString()} 
                icon="📈" 
                color="green"
              />
              <StatsCard 
                label="Avg Score" 
                value={safeFixed((stats.global_avg_safety + stats.global_avg_momentum) / 2, 1)}
                icon="⭐" 
                color="yellow"
              />
            </div>
            
            {/* Blockchain Distribution */}
            {stats.blockchain_distribution && (
              <BlockchainDistribution distribution={stats.blockchain_distribution} />
            )}
            
            {/* Tables */}
            <div className="grid grid-cols-1 gap-8">
              <TrendingTable items={data.trending} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TopRatedTable items={data.topRated} />
                <WorstRatedTable items={data.worst} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'user' && (
          <UserStatsPanel 
            stats={data.userStats} 
            favorites={data.userFavorites} 
            recent={data.userRecent}
          />
        )}

        {activeTab === 'compare' && (
          <ComparisonPanel />
        )}

        {activeTab === 'enterprise' && (
          <EnterprisePanel intel={data.enterpriseIntel} />
        )}

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Última actualización: {stats.last_updated ? new Date(stats.last_updated).toLocaleString() : 'N/A'}
          {loading && <span className="ml-2 text-cyan-400 animate-pulse">● Actualizando...</span>}
        </div>
      </div>

      {/* Token Detail Modal */}
      {tokenDetail && <TokenDetailModal token={tokenDetail} />}
    </div>
  );
};

export default AnalyticsPage;
