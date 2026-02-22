'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LS = {
  get: k => typeof window !== 'undefined' ? localStorage.getItem(`lyzerd_${k}`) : null,
  remove: k => typeof window !== 'undefined' && localStorage.removeItem(`lyzerd_${k}`),
};
const api = (url, data = null, method = 'POST') =>
  axios({ method, url: `${API}${url}`, data, headers: { Authorization: `Bearer ${LS.get('api_key')}` } });

function AITrainer({ tokenAddress, tokenContext, analysis }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('official');
  const [contextWindow, setContextWindow] = useState(10);
  const [requireRating, setRequireRating] = useState(false);
  const [inputBlocked, setInputBlocked] = useState(false);
  const [adaptiveActive, setAdaptiveActive] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);

  useEffect(() => {
    // Usar Rico health para verificar estado real del adaptive learning
    api('/api/rico/health', null, 'GET')
      .then(({ data }) => {
        setAdaptiveActive(data.status === 'healthy' && (data.stats?.adaptive_ratings || 0) > 0);
      })
      .catch(() => setAdaptiveActive(false));
  }, []);

  const ctx = useCallback(() => ({
    symbol: analysis?.symbol || 'TEST',
    blockchain: analysis?.blockchain || 'solana',
    price: analysis?.price || 0,
    safetyScore: analysis?.safetyScore || 50,
    momentumScore: analysis?.momentumScore || 50,
    rsi: analysis?.rsi || null,
    holders: analysis?.holders || 0,
    whales: analysis?.whales?.slice(0, 5) || [],
    ...tokenContext,
  }), [analysis, tokenContext]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // FIX: incluir conversationId del mensaje en el payload de feedback
  const sendFeedback = useCallback(async (msg) => {
    try {
      const { data } = await api('/api/feedback', {
        conversationId: msg.conversationId || null,   // ← FIX: era siempre undefined
        tokenAddress,
        analysisData: analysis,
        aiResponse: msg.content,
        rating: msg.metadata.rating,
        wasHelpful: msg.metadata.helpful,
        feedbackText: msg.userMessage || '',
        userPlan: msg.metadata.userPlan,
      });
      
      if (data.adaptiveLearning?.updated) {
        console.log('🧠 Adaptive profile updated:', data.adaptiveLearning.profile);
      }
      
      return data;
    } catch (err) {
      console.error('[Feedback]', err.message);
    }
  }, [tokenAddress, analysis]);

  const rateMessage = async (msgId, rating) => {
    setMsgs(prev => prev.map(msg => 
      msg.id === msgId 
        ? { ...msg, metadata: { ...msg.metadata, rating } }
        : msg
    ));
    
    const msg = msgs.find(m => m.id === msgId);
    if (msg) {
      const updatedMsg = { ...msg, metadata: { ...msg.metadata, rating } };
      await sendFeedback(updatedMsg);
      
      setMsgs(prev => prev.map(m => 
        m.id === msgId 
          ? { ...m, metadata: { ...m.metadata, feedbackSent: true } }
          : m
      ));
      
      setInputBlocked(false);
    }
  };

  const markHelpful = async (msgId, helpful) => {
    setMsgs(prev => prev.map(msg => 
      msg.id === msgId 
        ? { ...msg, metadata: { ...msg.metadata, helpful } }
        : msg
    ));
    
    const msg = msgs.find(m => m.id === msgId);
    if (msg) {
      const updatedMsg = { ...msg, metadata: { ...msg.metadata, helpful } };
      await sendFeedback(updatedMsg);
      
      setMsgs(prev => prev.map(m => 
        m.id === msgId 
          ? { ...m, metadata: { ...m.metadata, feedbackSent: true } }
          : m
      ));
    }
  };

  const send = useCallback(async () => {
    if (!input.trim() || inputBlocked) return;
    
    const userMsg = input;
    setMsgs(prev => [...prev, { role: 'user', content: userMsg, id: generateId() }]);
    setInput('');
    setLoading(true);

    try {
      const limitedHistory = msgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-contextWindow)
        .map(m => ({ role: m.role, content: m.content }));
      
      const { data } = await api('/api/chat', {
        message: userMsg,
        tokenAddress,
        tokenContext: ctx(),
        history: limitedHistory,
        userPlan: selectedPlan,
      });
      
      const aiResponse = data.response || 'Sin respuesta';
      const aiMsg = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse,
        // FIX: guardar conversationId para que el feedback pueda encontrar
        // la conversación en Rico Storage y disparar el aprendizaje real
        conversationId: data.conversationId || null,
        timestamp: new Date().toISOString(),
        userMessage: userMsg,
        metadata: {
          rating: null,
          helpful: null,
          feedbackSent: false,
          userPlan: selectedPlan,
        }
      };
      
      setMsgs(prev => [...prev, aiMsg]);
      
      if (requireRating) {
        setInputBlocked(true);
      }
    } catch (err) {
      setMsgs(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error. Intenta de nuevo.',
        id: generateId(),
        conversationId: null,
        metadata: { rating: null, helpful: null, feedbackSent: true, userPlan: selectedPlan }
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, msgs, tokenAddress, ctx, selectedPlan, contextWindow, requireRating, inputBlocked, sendFeedback]);

  return (
    <div className="bg-gray-900/80 border-2 border-purple-500/30 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-purple-500/10 border-b-2 border-purple-500/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧪</span>
          <h3 className="text-lg font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI TRAINER</h3>
          {adaptiveActive && (
            <span className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs font-bold text-green-300 animate-pulse">
              🧠 ADAPTIVE ACTIVE
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 font-bold">API:</label>
            <select
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="px-3 py-1.5 bg-gray-950 border border-gray-700 rounded text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
            >
              <option value="free">🆓 Free</option>
              <option value="premium">💎 Premium</option>
              <option value="enterprise">🏢 Enterprise</option>
              <option value="official">⚡ Official</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 font-bold">Context:</label>
            <input 
              type="number" 
              min="1" 
              max="50" 
              value={contextWindow} 
              onChange={e => setContextWindow(Math.max(1, Math.min(50, +e.target.value)))}
              className="w-16 px-2 py-1 bg-gray-950 border border-gray-700 rounded text-white text-xs text-center focus:border-purple-500 focus:outline-none"
            />
            <span className="text-xs text-gray-500">msgs</span>
          </div>
          
          <button
            onClick={() => setRequireRating(!requireRating)}
            className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
              requireRating 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {requireRating ? '🔒 STRICT' : '🔓 FLEXIBLE'}
          </button>
        </div>
      </div>
      
      {requireRating && (
        <div className="p-4 bg-yellow-900/20 border-b-2 border-yellow-500/30">
          <p className="text-xs text-yellow-400 font-bold">⚠️ Modo strict: Debes calificar cada respuesta antes de continuar</p>
        </div>
      )}
      
      {inputBlocked && (
        <div className="p-3 bg-red-900/20 border-b-2 border-red-500/30">
          <p className="text-xs text-red-400 font-bold animate-pulse">🚫 Califica la respuesta anterior para continuar</p>
        </div>
      )}
      
      <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-950/50">
        {msgs.map((m) => (
          <div key={m.id}>
            <div
              className={`text-sm p-3 rounded-lg ${
                m.role === 'user'
                  ? 'bg-purple-500/20 text-gray-200 ml-8 border border-purple-500/30'
                  : 'bg-gray-900/80 text-gray-200 mr-8 border border-gray-800'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="text-xs mb-1 font-bold flex items-center gap-2">
                  <span className="text-purple-400">🤖 Lyzerd AI</span>
                  <span className="text-gray-500">
                    {m.metadata?.userPlan === 'free' && '🆓'}
                    {m.metadata?.userPlan === 'premium' && '💎'}
                    {m.metadata?.userPlan === 'enterprise' && '🏢'}
                    {m.metadata?.userPlan === 'official' && '⚡'}
                  </span>
                  {/* FIX: mostrar indicador de que la conversación quedó registrada */}
                  {m.conversationId && (
                    <span className="text-xs text-gray-600 font-mono">
                      💾 {m.conversationId.slice(0, 8)}
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-line">{m.content}</div>
            </div>
            
            {m.role === 'assistant' && !m.metadata?.feedbackSent && (
              <div className="mt-2 flex items-center gap-2 ml-8">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => rateMessage(m.id, rating)}
                      className={`text-lg hover:scale-110 transition-transform ${
                        m.metadata?.rating === rating ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <div className="h-4 w-px bg-gray-700" />
                <button
                  onClick={() => markHelpful(m.id, true)}
                  className={`text-sm px-2 py-1 rounded transition-colors ${
                    m.metadata?.helpful === true 
                      ? 'bg-green-500/30 text-green-300' 
                      : 'bg-gray-800 text-gray-500 hover:text-green-400'
                  }`}
                >
                  👍
                </button>
                <button
                  onClick={() => markHelpful(m.id, false)}
                  className={`text-sm px-2 py-1 rounded transition-colors ${
                    m.metadata?.helpful === false 
                      ? 'bg-red-500/30 text-red-300' 
                      : 'bg-gray-800 text-gray-500 hover:text-red-400'
                  }`}
                >
                  👎
                </button>
              </div>
            )}
            
            {m.role === 'assistant' && m.metadata?.feedbackSent && (
              <div className="mt-2 ml-8 text-xs text-green-400">
                ✅ Feedback enviado{m.metadata.rating && `: ${m.metadata.rating}/5`} • Plan: {m.metadata.userPlan}
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="text-center p-4">
            <div className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg border border-purple-500/30">
              <div className="animate-pulse">💭</div>
              <span className="text-gray-400 text-sm">Entrenando con {selectedPlan}...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      
      <div className="p-4 bg-gray-900/80 border-t-2 border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !loading && !inputBlocked && send()}
            placeholder={inputBlocked ? "Califica primero..." : "Entrena la IA..."}
            className="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            disabled={loading || inputBlocked}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim() || inputBlocked}
            className="px-6 py-2.5 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-all text-sm"
          >
            {loading ? '⏳' : 'SEND'}
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {requireRating ? '🔒 Strict training' : '🔓 Flexible training'}
          </span>
          <span className="text-gray-500">
            {msgs.length} mensajes • Context: últimos {contextWindow} • API: {selectedPlan}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');
  const [bannedUsers, setBannedUsers] = useState([]);
  const [bannedIps, setBannedIps] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [banUserId, setBanUserId] = useState('');
  const [banUserReason, setBanUserReason] = useState('');
  const [banUserExpires, setBanUserExpires] = useState('0');
  const [banIpAddress, setBanIpAddress] = useState('');
  const [banIpReason, setBanIpReason] = useState('');
  const [banIpExpires, setBanIpExpires] = useState('0');
  const [trainingData, setTrainingData] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [expandedItem, setExpandedItem] = useState(null);
  const [apiUsageLogs, setApiUsageLogs] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);
  
  // 🧠 ADAPTIVE LEARNING STATE
  const [adaptiveStats, setAdaptiveStats] = useState(null);
  const [adaptiveValidation, setAdaptiveValidation] = useState(null);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

  const apiKey = LS.get('api_key');
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

  useEffect(() => {
    if (!apiKey) {
      router.push('/login');
      return;
    }
    axios.get(`${API}/api/user/role`, { headers })
      .then(({ data }) => setUserRole(data.role))
      .catch(() => router.push('/login'));
  }, [apiKey]);

  const msg = (text, isError = false) => {
    if (isError) setError(text);
    else setSuccess(text);
    setTimeout(() => { setError(null); setSuccess(null); }, 3000);
  };

  const req = async (method, url, data = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios({ method, url: `${API}${url}`, data, headers });
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = () => req('get', '/api/admin/users').then(d => setUsers(d.data || [])).catch(e => msg(e.message, true));
  const fetchBannedUsers = () => req('get', '/api/superadmin/banned-users').then(d => setBannedUsers(d.data || [])).catch(e => msg(e.message, true));
  const fetchBannedIps = () => req('get', '/api/superadmin/banned-ips').then(d => setBannedIps(d.data || [])).catch(e => msg(e.message, true));
  const fetchAuditLog = () => req('get', '/api/superadmin/audit-log').then(d => setAuditLog(d.data || [])).catch(e => msg(e.message, true));
  const fetchTrainingData = (status = 'pending') => req('get', `/api/training-data/status/${status}`).then(d => setTrainingData(d.data || [])).catch(e => msg(e.message, true));
  const fetchApiUsage = () => req('get', '/api/superadmin/api-usage?limit=100&offset=0').then(d => setApiUsageLogs(d.logs || [])).catch(e => msg(e.message, true));

  // ─────────────────────────────────────────────────────────────────────
  // 🧠 ADAPTIVE LEARNING — leer datos reales desde Rico
  // Los endpoints /api/admin/adaptive-* devuelven stubs hardcodeados.
  // Los datos reales viven en /api/rico/health y /api/rico/profiling/analysis
  // ─────────────────────────────────────────────────────────────────────
  const fetchAdaptiveStats = async () => {
    setAdaptiveLoading(true);
    try {
      // Llamadas paralelas: health + profiling
      const [healthRes, profilingRes] = await Promise.allSettled([
        axios.get(`${API}/api/rico/health`, { headers }),
        axios.get(`${API}/api/rico/profiling/analysis`, { headers }),
      ]);

      const health = healthRes.status === 'fulfilled' ? healthRes.value.data : null;
      const profiling = profilingRes.status === 'fulfilled' ? profilingRes.value.data : null;

      const analysis = profiling?.analysis || {};
      const totalRatings = analysis.totalRatings || health?.stats?.adaptive_ratings || 0;

      // Mapear a la forma que espera el UI
      const stats = {
        enabled: profiling?.adaptiveEnabled ?? true,
        active: totalRatings > 0,
        totalRatings,
        avgRating: (() => {
          // Calcular desde rating_distribution si existe, si no 0
          const dist = analysis.rating_distribution || {};
          const total = Object.values(dist).reduce((s, n) => s + n, 0);
          if (total === 0) return 0;
          const weighted = Object.entries(dist).reduce((s, [r, n]) => s + Number(r) * n, 0);
          return weighted / total;
        })(),
        minRatingsRequired: 10,
        lastUpdated: analysis.lastUpdated || null,
        topPatterns: (analysis.topTopics || []).map(t => ({
          pattern: t.topic,
          score: t.score,
          sentiment: t.type === 'positive' ? 'positive' : 'negative',
        })),
        topPreferences: (analysis.activeProtocols || []).map(p => ({
          preference: p.protocol,
          score: p.score,
          action: p.score > 0 ? 'include' : 'exclude',
        })),
        summary: {
          patternsCount: analysis.summary?.topicsCount || 0,
          stylesCount: analysis.summary?.protocolsCount || 0,
          preferencesCount: analysis.summary?.dimensionsCount || 0,
        },
        // Datos extra de Rico
        ricoHealth: health?.status || 'unknown',
        conversations: health?.stats?.total_conversations || 0,
        knowledgeFacts: health?.stats?.knowledge_facts || 0,
        metacognition: analysis.metacognition || null,
      };

      setAdaptiveStats(stats);
    } catch (err) {
      msg(err.response?.data?.message || 'Error fetching Rico stats', true);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const fetchAdaptiveValidation = async () => {
    setAdaptiveLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/rico/profiling/analysis`, { headers });
      const analysis = data.analysis || {};

      // Derivar validación desde el análisis real de Rico
      const totalRatings = analysis.totalRatings || 0;
      const minRequired = 10;
      const confidence = Math.min(1, totalRatings / Math.max(minRequired, 1));
      const topicsCount = Object.keys(analysis.summary || {}).length;

      setAdaptiveValidation({
        ready: totalRatings >= minRequired && confidence >= 0.5,
        confidence,
        entropy: analysis.epistemicWarnings?.pressure_capitulations ?? 0,
        isBalanced: confidence >= 0.6,
        healthyRating: (analysis.topTopics || []).every(t => Math.abs(t.score) < 5),
        diagnostics: {
          totalPatterns: analysis.summary?.topicsCount || 0,
          strongestPattern: (analysis.topTopics || [])[0]
            ? { pattern: analysis.topTopics[0].topic, score: analysis.topTopics[0].score }
            : null,
          weakestRating: totalRatings < minRequired
            ? `⚠️ Necesita ${minRequired - totalRatings} ratings más`
            : 'OK',
        },
      });
    } catch (err) {
      msg(err.response?.data?.message || 'Error validating Rico profile', true);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  // Toggle/Reset siguen pasando por los endpoints de admin
  // (groqService los redirige internamente a Rico)
  const toggleAdaptive = async (enable) => {
    setAdaptiveLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/admin/adaptive-toggle`, { enable }, { headers });
      msg(`⚡ Modo adaptativo ${data.enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
      await fetchAdaptiveStats();
    } catch (err) {
      msg(err.response?.data?.message || 'Error toggling adaptive mode', true);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const resetAdaptive = async () => {
    if (!confirm('⚠️ ¿RESETEAR completamente el perfil adaptativo? Esta acción NO se puede deshacer.')) return;
    
    setAdaptiveLoading(true);
    try {
      await axios.post(`${API}/api/admin/adaptive-reset`, {}, { headers });
      msg('🔄 Perfil adaptativo RESETEADO completamente');
      await fetchAdaptiveStats();
      setAdaptiveValidation(null);
    } catch (err) {
      msg(err.response?.data?.message || 'Error resetting adaptive profile', true);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const grantAccess = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return msg('Email requerido', true);
    try {
      await req('post', '/api/admin/grant-access', { targetUserId: newUserEmail, role: newUserRole });
      msg(`✅ Acceso ${newUserRole} otorgado`);
      setNewUserEmail('');
      setNewUserRole('viewer');
      await fetchUsers();
    } catch (err) {
      msg(err.message, true);
    }
  };

  const banUser = async (e) => {
    e.preventDefault();
    if (!banUserId.trim()) return msg('User ID requerido', true);
    try {
      const expiresIn = banUserExpires === '0' ? null : parseInt(banUserExpires);
      await req('post', '/api/superadmin/ban-user', { targetUserId: banUserId, reason: banUserReason || 'Sin especificar', expiresIn });
      msg('✅ Usuario baneado');
      setBanUserId('');
      setBanUserReason('');
      setBanUserExpires('0');
      await fetchBannedUsers();
    } catch (err) {
      msg(err.message, true);
    }
  };

  const unbanUser = async (userId) => {
    try {
      await req('post', '/api/superadmin/unban-user', { targetUserId: userId });
      msg('✅ Usuario desbaneado');
      await fetchBannedUsers();
    } catch (err) {
      msg(err.message, true);
    }
  };

  const banIp = async (e) => {
    e.preventDefault();
    if (!banIpAddress.trim()) return msg('IP requerida', true);
    try {
      const expiresIn = banIpExpires === '0' ? null : parseInt(banIpExpires);
      await req('post', '/api/superadmin/ban-ip', { ipAddress: banIpAddress, reason: banIpReason || 'Sin especificar', expiresIn });
      msg('✅ IP baneada');
      setBanIpAddress('');
      setBanIpReason('');
      setBanIpExpires('0');
      await fetchBannedIps();
    } catch (err) {
      msg(err.message, true);
    }
  };

  const unbanIp = async (ipAddress) => {
    try {
      await req('post', '/api/superadmin/unban-ip', { ipAddress });
      msg('✅ IP desbaneada');
      await fetchBannedIps();
    } catch (err) {
      msg(err.message, true);
    }
  };

  const approveTraining = async (id) => {
    try {
      await req('patch', `/api/training-data/${id}/approve`);
      msg('✅ Aprobado');
      await fetchTrainingData(filterStatus);
    } catch (err) {
      msg(err.message, true);
    }
  };

  const rejectTraining = async (id) => {
    try {
      await req('patch', `/api/training-data/${id}/reject`);
      msg('❌ Rechazado');
      await fetchTrainingData(filterStatus);
    } catch (err) {
      msg(err.message, true);
    }
  };

  useEffect(() => {
    if (!apiKey) return;
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'superadmin') {
      fetchBannedUsers();
      fetchBannedIps();
      fetchAuditLog();
    } else if (activeTab === 'training') fetchTrainingData(filterStatus);
    else if (activeTab === 'api-usage') fetchApiUsage();
    else if (activeTab === 'adaptive') {
      fetchAdaptiveStats();
      fetchAdaptiveValidation();
    }
  }, [activeTab, filterStatus, apiKey]);

  if (!apiKey) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-black text-red-400 mb-4">🔐 Acceso denegado</h1>
          <button onClick={() => router.push('/login')} className="px-6 py-3 bg-green-500 text-gray-950 font-bold rounded-lg hover:bg-green-400">
            Ir al login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-green-400 mb-2">🦎 Panel Administrativo</h1>
            <p className="text-gray-400">Gestiona usuarios, roles, bans y AI training</p>
          </div>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
            ← Volver
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-200">{success}</p>
          </div>
        )}

        <div className="flex gap-2 mb-8 border-b border-gray-800 overflow-x-auto">
          {['users', 'superadmin', 'training', 'adaptive', 'trainer', ...(userRole === 'superadmin' ? ['api-usage'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold transition-colors whitespace-nowrap ${
                activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'users' && '👥 Usuarios'}
              {tab === 'superadmin' && '👑 Superadmin'}
              {tab === 'training' && '📊 Training'}
              {tab === 'adaptive' && '🧠 Adaptive'}
              {tab === 'trainer' && '🧪 Trainer'}
              {tab === 'api-usage' && '📡 API Usage'}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-green-400 mb-6">➕ Otorgar Acceso</h2>
              <form onSubmit={grantAccess} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="UUID de usuario"
                    className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="trainer">Trainer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-green-500 text-gray-950 font-bold rounded-lg hover:bg-green-400 disabled:opacity-50">
                    {loading ? '⏳' : '✅'} Otorgar
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-green-400 mb-6">📋 Usuarios ({users.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-400">User ID</th>
                      <th className="px-4 py-3 font-bold text-gray-400">Rol</th>
                      <th className="px-4 py-3 font-bold text-gray-400">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-white font-mono text-xs">{user.user_id.slice(0, 8)}...</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.role === 'superadmin' ? 'bg-purple-900/30 text-purple-300' :
                            user.role === 'admin' ? 'bg-blue-900/30 text-blue-300' : 'bg-green-900/30 text-green-300'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'superadmin' && (
          <div className="space-y-8">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-6">🚫 Banear Usuario</h2>
              <form onSubmit={banUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={banUserId} onChange={(e) => setBanUserId(e.target.value)} placeholder="UUID del usuario" className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white" />
                  <input type="text" value={banUserReason} onChange={(e) => setBanUserReason(e.target.value)} placeholder="Razón" className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white" />
                  <input type="number" value={banUserExpires} onChange={(e) => setBanUserExpires(e.target.value)} placeholder="Segundos (0=permanente)" className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white" />
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50">
                  {loading ? '⏳' : '🚫'} Banear Usuario
                </button>
              </form>
            </div>

            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-6">🚫 Banear IP</h2>
              <form onSubmit={banIp} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={banIpAddress} onChange={(e) => setBanIpAddress(e.target.value)} placeholder="192.168.1.1" className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white" />
                  <input type="text" value={banIpReason} onChange={(e) => setBanIpReason(e.target.value)} placeholder="Razón" className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white" />
                  <input type="number" value={banIpExpires} onChange={(e) => setBanIpExpires(e.target.value)} placeholder="Segundos (0=permanente)" className="px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white" />
                </div>
                <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50">
                  {loading ? '⏳' : '🚫'} Banear IP
                </button>
              </form>
            </div>

            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-6">🚫 Usuarios Baneados ({bannedUsers.length})</h2>
              <div className="space-y-3">
                {bannedUsers.map((user) => (
                  <div key={user.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{user.email}</p>
                      <p className="text-sm text-gray-400">Razón: {user.reason}</p>
                      <p className="text-xs text-gray-500">Baneado: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => unbanUser(user.user_id)} disabled={loading} className="px-4 py-2 bg-green-500 text-gray-950 font-bold rounded-lg hover:bg-green-400">
                      ✅ Desbanear
                    </button>
                  </div>
                ))}
              </div>
              {bannedUsers.length === 0 && <p className="text-center text-gray-400 py-8">Sin usuarios baneados</p>}
            </div>

            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-6">🚫 IPs Baneadas ({bannedIps.length})</h2>
              <div className="space-y-3">
                {bannedIps.map((ip) => (
                  <div key={ip.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-white">{ip.ip_address}</p>
                      <p className="text-sm text-gray-400">Razón: {ip.reason}</p>
                      <p className="text-xs text-gray-500">Baneada: {new Date(ip.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => unbanIp(ip.ip_address)} disabled={loading} className="px-4 py-2 bg-green-500 text-gray-950 font-bold rounded-lg hover:bg-green-400">
                      ✅ Desbanear
                    </button>
                  </div>
                ))}
              </div>
              {bannedIps.length === 0 && <p className="text-center text-gray-400 py-8">Sin IPs baneadas</p>}
            </div>

            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-blue-400 mb-6">📋 Audit Log ({auditLog.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLog.map((log) => (
                  <div key={log.id} className="bg-gray-800 rounded-lg p-3 text-xs">
                    <p className="font-mono text-gray-300">
                      <span className="font-bold text-blue-300">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                      {' '}<span className="font-bold text-green-300">{log.action}</span>
                    </p>
                  </div>
                ))}
              </div>
              {auditLog.length === 0 && <p className="text-center text-gray-400 py-8">Sin registros</p>}
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              {['pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                    filterStatus === status ? 'bg-green-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {status === 'pending' && '⏳'}
                  {status === 'approved' && '✅'}
                  {status === 'rejected' && '❌'}{' '}
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {trainingData.map((item) => (
                <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-white">Token: {item.token_address?.slice(0, 10)}...</p>
                        <p className="text-sm text-gray-400">
                          {item.rating ? `Rating: ${item.rating}/5` : 'Sin rating'} • {item.was_helpful ? '✅ Útil' : item.was_helpful === false ? '❌ No útil' : 'Sin evaluar'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm font-bold"
                        >
                          {expandedItem === item.id ? '▲ Ocultar' : '▼ Ver'}
                        </button>
                        {filterStatus === 'pending' && (
                          <>
                            <button onClick={() => approveTraining(item.id)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-sm font-bold">
                              ✅ Aprobar
                            </button>
                            <button onClick={() => rejectTraining(item.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-sm font-bold">
                              ❌ Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {expandedItem === item.id && (
                      <div className="space-y-3 mt-4 border-t border-gray-700 pt-4">
                        {item.user_feedback && (
                          <div className="bg-gray-800 rounded p-3">
                            <p className="text-xs text-purple-400 mb-1 font-bold">💬 Feedback del usuario:</p>
                            <p className="text-sm text-gray-300">{item.user_feedback}</p>
                          </div>
                        )}
                        {item.original_analysis && (
                          <div className="bg-gray-800 rounded p-3">
                            <p className="text-xs text-blue-400 mb-1 font-bold">📊 Análisis original:</p>
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
                              {typeof item.original_analysis === 'string' 
                                ? item.original_analysis 
                                : JSON.stringify(item.original_analysis, null, 2)}
                            </pre>
                          </div>
                        )}
                        {item.suggested_improvement && (
                          <div className="bg-blue-900/20 rounded p-3">
                            <p className="text-xs text-blue-300 mb-1 font-bold">💡 Sugerencia:</p>
                            <p className="text-xs text-blue-200">{item.suggested_improvement}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {trainingData.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-lg">No hay datos {filterStatus}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🧠 ADAPTIVE LEARNING TAB */}
        {activeTab === 'adaptive' && (
          <div className="space-y-6">
            {/* CONTROLES */}
            <div className="bg-gray-900 border-2 border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-purple-400">🧠 Adaptive Learning Control</h2>
                  {/* Indicar que los datos vienen de Rico directamente */}
                  <p className="text-xs text-gray-500 mt-1">
                    Fuente: <span className="text-cyan-400 font-mono">/api/rico/health</span> + <span className="text-cyan-400 font-mono">/api/rico/profiling/analysis</span>
                    {adaptiveStats?.ricoHealth && (
                      <span className={`ml-2 font-bold ${adaptiveStats.ricoHealth === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                        • Rico {adaptiveStats.ricoHealth}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => { fetchAdaptiveStats(); fetchAdaptiveValidation(); }}
                  disabled={adaptiveLoading}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {adaptiveLoading ? '⏳' : '🔄'} Refrescar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => toggleAdaptive(true)}
                  disabled={adaptiveLoading || adaptiveStats?.enabled}
                  className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-400 disabled:opacity-50"
                >
                  ✅ ACTIVAR
                </button>
                <button
                  onClick={() => toggleAdaptive(false)}
                  disabled={adaptiveLoading || !adaptiveStats?.enabled}
                  className="px-6 py-3 bg-yellow-500 text-gray-950 font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50"
                >
                  ⏸️ PAUSAR
                </button>
                {userRole === 'superadmin' && (
                  <button
                    onClick={resetAdaptive}
                    disabled={adaptiveLoading}
                    className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-400 disabled:opacity-50"
                  >
                    🔄 RESET
                  </button>
                )}
              </div>
            </div>

            {/* STATS */}
            {adaptiveStats && (
              <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-cyan-400 mb-4">📊 Estadísticas del Perfil</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Estado</p>
                    <p className="text-lg font-bold">
                      {adaptiveStats.enabled ? (
                        <span className="text-green-400">✅ ENABLED</span>
                      ) : (
                        <span className="text-yellow-400">⏸️ PAUSED</span>
                      )}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Modo</p>
                    <p className="text-lg font-bold">
                      {adaptiveStats.active ? (
                        <span className="text-cyan-400">🧠 ACTIVE</span>
                      ) : (
                        <span className="text-gray-500">👀 OBSERVING</span>
                      )}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Ratings</p>
                    <p className="text-2xl font-bold text-white">{adaptiveStats.totalRatings}</p>
                    <p className="text-xs text-gray-500">Min: {adaptiveStats.minRatingsRequired}</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Promedio</p>
                    <p className="text-2xl font-bold text-white">{adaptiveStats.avgRating.toFixed(2)}/5</p>
                    <div className="flex gap-0.5 mt-1">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={i <= Math.round(adaptiveStats.avgRating) ? 'text-yellow-400' : 'text-gray-600'}>
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Datos extra de Rico Storage */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Conversaciones guardadas</p>
                    <p className="text-xl font-bold text-white">{adaptiveStats.conversations}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Knowledge facts</p>
                    <p className="text-xl font-bold text-white">{adaptiveStats.knowledgeFacts}</p>
                  </div>
                  {adaptiveStats.metacognition && (
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Metacognición indexada</p>
                      <p className="text-xl font-bold text-white">{adaptiveStats.metacognition.indexed || 0}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-xs text-purple-400 font-bold mb-2">Patterns</p>
                    <p className="text-3xl font-black text-purple-300">{adaptiveStats.summary.patternsCount}</p>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-xs text-blue-400 font-bold mb-2">Styles</p>
                    <p className="text-3xl font-black text-blue-300">{adaptiveStats.summary.stylesCount}</p>
                  </div>
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <p className="text-xs text-green-400 font-bold mb-2">Preferences</p>
                    <p className="text-3xl font-black text-green-300">{adaptiveStats.summary.preferencesCount}</p>
                  </div>
                </div>

                {adaptiveStats.lastUpdated && (
                  <p className="text-xs text-gray-500 text-right">
                    Última actualización: {new Date(adaptiveStats.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* VALIDATION */}
            {adaptiveValidation && (
              <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-cyan-400 mb-4">🔍 Validación del Perfil</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Ready</p>
                    <p className="text-lg font-bold">
                      {adaptiveValidation.ready ? (
                        <span className="text-green-400">✅ YES</span>
                      ) : (
                        <span className="text-red-400">❌ NO</span>
                      )}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Confidence</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-bold text-white">
                        {(adaptiveValidation.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${adaptiveValidation.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Pressure Capitulations</p>
                    <p className="text-2xl font-bold text-white">{adaptiveValidation.entropy}</p>
                    <p className="text-xs text-gray-500">
                      {adaptiveValidation.isBalanced ? '✅ Balanced' : '⚠️ Unbalanced'}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Health</p>
                    <p className="text-lg font-bold">
                      {adaptiveValidation.healthyRating ? (
                        <span className="text-green-400">✅ HEALTHY</span>
                      ) : (
                        <span className="text-red-400">⚠️ LOW</span>
                      )}
                    </p>
                  </div>
                </div>

                {adaptiveValidation.diagnostics && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-purple-400 font-bold mb-2">🔬 Diagnósticos</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-300">
                        <span className="text-gray-500">Total patterns:</span> {adaptiveValidation.diagnostics.totalPatterns}
                      </p>
                      {adaptiveValidation.diagnostics.strongestPattern && (
                        <p className="text-gray-300">
                          <span className="text-gray-500">Top pattern:</span>{' '}
                          <span className="text-cyan-300">{adaptiveValidation.diagnostics.strongestPattern.pattern}</span>{' '}
                          ({adaptiveValidation.diagnostics.strongestPattern.score.toFixed(2)})
                        </p>
                      )}
                      <p className={`${
                        adaptiveValidation.diagnostics.weakestRating === 'OK' 
                          ? 'text-green-300' 
                          : 'text-red-300 font-bold'
                      }`}>
                        {adaptiveValidation.diagnostics.weakestRating}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TOP PATTERNS */}
            {adaptiveStats?.topPatterns && adaptiveStats.topPatterns.length > 0 && (
              <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-400 mb-4">🎯 Top Patterns Aprendidos</h3>
                <div className="space-y-2">
                  {adaptiveStats.topPatterns.map((pattern, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {pattern.sentiment === 'positive' ? '✅' : '❌'}
                        </span>
                        <div>
                          <p className="text-white font-bold">{pattern.pattern}</p>
                          <p className="text-xs text-gray-400">Score: {pattern.score}</p>
                        </div>
                      </div>
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            pattern.sentiment === 'positive' 
                              ? 'bg-gradient-to-r from-green-500 to-cyan-500' 
                              : 'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{ width: `${Math.min(Math.abs(pattern.score) * 50, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOP PREFERENCES */}
            {adaptiveStats?.topPreferences && adaptiveStats.topPreferences.length > 0 && (
              <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-green-400 mb-4">💡 Preferencias de Contenido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adaptiveStats.topPreferences.map((pref, idx) => (
                    <div key={idx} className={`rounded-lg p-3 border ${
                      pref.action === 'include' 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className={`font-bold ${
                          pref.action === 'include' ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {pref.action === 'include' ? '✅' : '🚫'} {pref.preference}
                        </p>
                        <span className="text-xs text-gray-400">{pref.score.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!adaptiveStats && !adaptiveLoading && (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg">Cargando estadísticas desde Rico...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trainer' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border-2 border-purple-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">🧪 Entrenar IA con Diferentes Modelos</h2>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300 mb-2 font-bold">ℹ️ Cómo usar el Trainer:</p>
                <ul className="text-xs text-blue-200 space-y-1 ml-4 list-disc">
                  <li><strong>Modo FLEXIBLE:</strong> Puedes calificar opcionalmente después de cada respuesta</li>
                  <li><strong>Modo STRICT:</strong> DEBES calificar cada respuesta antes de continuar</li>
                  <li><strong>API Key:</strong> Selecciona qué modelo usar (Free/Premium/Enterprise/Official)</li>
                  <li><strong>Context Window:</strong> Cuántos mensajes previos mantener (1-50)</li>
                  <li><strong>Rating Post-Respuesta:</strong> Cada mensaje tiene su propio rating individual</li>
                  <li><strong>🧠 Adaptive Learning:</strong> Tus ratings se guardan en Rico Storage con ID real y entrenan el perfil adaptativo</li>
                </ul>
              </div>
              <AITrainer 
                tokenAddress="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
                tokenContext={{ symbol: 'BONK' }}
                analysis={null}
              />
            </div>
          </div>
        )}

        {activeTab === 'api-usage' && userRole === 'superadmin' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-blue-400 mb-6">📡 API Usage Webwide</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-gray-400">Timestamp</th>
                      <th className="px-3 py-2 text-gray-400">Email</th>
                      <th className="px-3 py-2 text-gray-400">API Key</th>
                      <th className="px-3 py-2 text-gray-400">IP</th>
                      <th className="px-3 py-2 text-gray-400">Endpoint</th>
                      <th className="px-3 py-2 text-gray-400">Status</th>
                      <th className="px-3 py-2 text-gray-400">Duration</th>
                      <th className="px-3 py-2 text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiUsageLogs.map((log) => (
                      <>
                        <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="px-3 py-2 text-gray-300 font-mono">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="px-3 py-2 text-white">{log.email}</td>
                          <td className="px-3 py-2 font-mono text-cyan-400">{log.api_key?.slice(0, 12)}...</td>
                          <td className="px-3 py-2 font-mono text-gray-400">{log.ip_address}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              log.method === 'GET' ? 'bg-blue-900/30 text-blue-300' :
                              log.method === 'POST' ? 'bg-green-900/30 text-green-300' :
                              'bg-yellow-900/30 text-yellow-300'
                            }`}>
                              {log.method}
                            </span>
                            <span className="ml-2 text-gray-300">{log.endpoint}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              log.status_code < 300 ? 'bg-green-900/30 text-green-300' :
                              log.status_code < 400 ? 'bg-blue-900/30 text-blue-300' :
                              log.status_code < 500 ? 'bg-yellow-900/30 text-yellow-300' :
                              'bg-red-900/30 text-red-300'
                            }`}>
                              {log.status_code}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400">{log.duration_ms}ms</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                              className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 text-xs"
                            >
                              {expandedLog === log.id ? '▲' : '▼'}
                            </button>
                          </td>
                        </tr>
                        {expandedLog === log.id && (
                          <tr>
                            <td colSpan="8" className="px-3 py-4 bg-gray-950">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-cyan-400 mb-1 font-bold">📤 Request Body:</p>
                                  <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                                    {log.request_body || 'N/A'}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs text-green-400 mb-1 font-bold">📥 Response Body:</p>
                                  <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                                    {log.response_body || 'N/A'}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {apiUsageLogs.length === 0 && (
                <p className="text-center text-gray-400 py-8">Sin registros</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
