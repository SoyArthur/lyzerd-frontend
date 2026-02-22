// components/AITrainer.jsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const LS = { get: k => typeof window !== 'undefined' ? localStorage.getItem(`lyzerd_${k}`) : null };

export default function AITrainer() {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenData, setTokenData]             = useState(null);
  const [loadingToken, setLoadingToken]       = useState(false);
  const [tokenError, setTokenError]           = useState(null);

  const [msgs, setMsgs]       = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState('official');

  const endRef = useRef(null);
  const apiKey = LS.get('api_key');

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);

  // ── FETCH TOKEN ────────────────────────────────────────────────────────
  const fetchTokenData = useCallback(async () => {
    if (!contractAddress.trim()) { setTokenError('Contract address requerida'); return; }
    setLoadingToken(true); setTokenError(null); setTokenData(null);
    try {
      const { data } = await axios.post(
        `${API}/api/analyze`,
        { address: contractAddress },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      setTokenData(data);
    } catch (err) {
      setTokenError(err.response?.data?.message || err.message);
    } finally {
      setLoadingToken(false);
    }
  }, [contractAddress, apiKey]);

  // ── SEND MESSAGE ───────────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (!input.trim() || !tokenData) return;
    const userMsg = input;
    setMsgs(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/api/chat`,
        { message: userMsg, tokenAddress: contractAddress, tokenContext: tokenData, history: msgs, userPlan },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'Sin respuesta',
        id: Date.now(),
        conversationId: data.conversationId || null,
        feedbackSent: false,
        rating: null,
      }]);
    } catch (err) {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Error. Intenta de nuevo.', feedbackSent: true }]);
    } finally {
      setLoading(false);
    }
  }, [input, msgs, contractAddress, tokenData, apiKey, userPlan]);

  // ── SEND FEEDBACK (directo a Rico, sin aprobación manual) ──────────────
  const sendFeedback = useCallback(async (msgId, rating) => {
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || msg.feedbackSent) return;

    setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, rating, feedbackSent: true } : m));

    try {
      await axios.post(
        `${API}/api/feedback`,
        {
          conversationId: msg.conversationId || null,
          tokenAddress: contractAddress,
          analysisData: tokenData,
          aiResponse: msg.content,
          rating,
          wasHelpful: rating >= 3,
          userPlan,
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      console.log(`[Feedback] ⭐ ${rating}/5 enviado (convId: ${msg.conversationId || 'none'})`);
    } catch (err) {
      console.error('[Feedback] ❌', err.message);
    }
  }, [msgs, contractAddress, tokenData, apiKey, userPlan]);

  const planConfig = {
    free:       { label: '🆓 FREE',       delay: '5s' },
    premium:    { label: '💎 PREMIUM',    delay: '3s' },
    enterprise: { label: '🏢 ENTERPRISE', delay: '2s' },
    official:   { label: '⚡ OFFICIAL',   delay: '0s' },
  };

  return (
    <div className="space-y-4">

      {/* TOKEN INPUT */}
      <div className="bg-gray-900/80 border-2 border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-black text-green-400 mb-4">🔍 Cargar Token</h3>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={contractAddress}
            onChange={e => setContractAddress(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !loadingToken && fetchTokenData()}
            placeholder="Contract Address (Solana/Ethereum)"
            className="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-green-500 transition-colors"
            disabled={loadingToken}
          />
          <button
            onClick={fetchTokenData}
            disabled={loadingToken || !contractAddress.trim()}
            className="px-6 py-2.5 bg-green-500 text-gray-950 font-bold rounded-lg hover:bg-green-400 disabled:opacity-50 transition-all text-sm"
          >
            {loadingToken ? '⏳' : '🔍'} Cargar
          </button>
        </div>

        {tokenError && (
          <div className="bg-red-900/30 border border-red-500/50 rounded p-3 text-red-200 text-sm">❌ {tokenError}</div>
        )}

        {tokenData && (
          <div className="bg-gray-950/50 border border-green-500/30 rounded p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-green-400">{tokenData.symbol} — {tokenData.name}</p>
                <p className="text-xs text-gray-400">{tokenData.blockchain?.toUpperCase()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Precio:</span><span className="text-white ml-2">${tokenData.price?.toFixed(8)}</span></div>
              <div><span className="text-gray-500">Holders:</span><span className="text-white ml-2">{tokenData.holders?.toLocaleString()}</span></div>
              <div><span className="text-gray-500">Seguridad:</span><span className="text-green-400 ml-2">{tokenData.safetyScore}/100</span></div>
              <div><span className="text-gray-500">Momentum:</span><span className="text-purple-400 ml-2">{tokenData.momentumScore}/100</span></div>
            </div>
          </div>
        )}
      </div>

      {/* CHAT */}
      <div className="bg-gray-900/80 border-2 border-purple-500/30 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-purple-500/10 border-b-2 border-purple-500/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <h3 className="text-lg font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI TRAINER</h3>
          </div>
          <div className="flex items-center gap-2 bg-gray-950/50 px-3 py-2 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-400 font-bold">Plan:</span>
            <select
              value={userPlan}
              onChange={e => setUserPlan(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
            >
              {Object.entries(planConfig).map(([k, { label }]) => (
                <option key={k} value={k} className="bg-gray-900">{label}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">({planConfig[userPlan].delay})</span>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-950/50">
          {!tokenData && (
            <div className="text-center p-8 text-gray-500">⬆️ Primero carga un token para empezar</div>
          )}

          {msgs.map((m, i) => (
            <div key={i}>
              <div className={`text-sm p-3 rounded-lg ${
                m.role === 'user'
                  ? 'bg-purple-500/20 text-gray-200 ml-8 border border-purple-500/30'
                  : 'bg-gray-900/80 text-gray-200 mr-8 border border-gray-800'
              }`}>
                {m.role === 'assistant' && (
                  <div className="text-xs mb-1 font-bold flex items-center gap-2">
                    <span className="text-purple-400">🤖 Lyzerd AI</span>
                    {m.conversationId && (
                      <span className="text-gray-600 font-mono">💾 {m.conversationId.toString().slice(0, 8)}</span>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-line">{m.content}</div>
              </div>

              {/* RATING INLINE */}
              {m.role === 'assistant' && !m.feedbackSent && (
                <div className="mt-1 ml-8 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => sendFeedback(m.id, r)}
                      className="text-lg hover:scale-110 transition-transform opacity-40 hover:opacity-100"
                    >
                      ⭐
                    </button>
                  ))}
                  <span className="text-xs text-gray-600 ml-2">Califica para entrenar a Rico</span>
                </div>
              )}

              {m.role === 'assistant' && m.feedbackSent && m.rating && (
                <div className="mt-1 ml-8 text-xs text-green-400">
                  ✅ Rico aprendió — {m.rating}/5
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-center p-4">
              <div className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg border border-purple-500/30">
                <div className="animate-pulse">💭</div>
                <span className="text-gray-400 text-sm">Pensando... ({planConfig[userPlan].label})</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* INPUT */}
        <div className="p-4 bg-gray-900/80 border-t-2 border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !loading && send()}
              placeholder={tokenData ? 'Pregunta algo sobre el token...' : '⬆️ Primero carga un token'}
              className="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              disabled={loading || !tokenData}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim() || !tokenData}
              className="px-6 py-2.5 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-all text-sm"
            >
              {loading ? '⏳' : 'SEND'}
            </button>
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>⭐ Califica cada respuesta para entrenar a Rico</span>
            <span>{msgs.length} mensajes • {planConfig[userPlan].label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
