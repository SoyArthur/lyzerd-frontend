// components/ChatBox.jsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Tooltip from './Tooltip';

// ── TYPEWRITER HOOK ───────────────────────────────────────────
// Recibe el texto completo y devuelve el texto visible carácter a carácter.
// speed: ms entre caracteres. onDone: callback cuando termina.
function useTypewriter(text, speed = 12, onDone) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);
  const frameRef                  = useRef(null);
  const indexRef                  = useRef(0);

  useEffect(() => {
    // Reset cuando llega texto nuevo
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);

    if (!text) return;

    const tick = () => {
      indexRef.current += 1;
      const slice = text.slice(0, indexRef.current);
      setDisplayed(slice);

      if (indexRef.current < text.length) {
        frameRef.current = setTimeout(tick, speed);
      } else {
        setDone(true);
        onDone?.();
      }
    };

    frameRef.current = setTimeout(tick, speed);
    return () => clearTimeout(frameRef.current);
  }, [text, speed]);

  return { displayed, done };
}

// ── MENSAJE ASISTENTE ─────────────────────────────────────────
// Componente separado para que cada mensaje tenga su propio estado de typewriter
function AssistantMessage({ msg, publicMode, onRate, onHelpful }) {
  const { displayed, done } = useTypewriter(msg.content, 10);

  return (
    <div>
      <div className="text-sm p-3 rounded-lg font-mono bg-gray-900/80 text-gray-200 mr-8 border border-gray-800">
        <div className="text-xs text-blue-400 mb-1 font-bold">🤖 Lyzerd AI</div>
        <div className="whitespace-pre-line">
          {displayed}
          {!done && (
            <span className="inline-block w-[2px] h-[1em] bg-blue-400 ml-[1px] animate-pulse align-middle" />
          )}
        </div>
      </div>

      {/* Feedback — aparece solo cuando el typewriter terminó */}
      {done && !msg.metadata?.feedbackSent && publicMode && (
        <div className="mt-2 flex items-center gap-2 ml-8">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => onRate(msg.id, rating)}
                className={`text-lg hover:scale-110 transition-transform ${
                  msg.metadata?.rating === rating ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <button
            onClick={() => onHelpful(msg.id, true)}
            className={`text-sm px-2 py-1 rounded transition-colors ${
              msg.metadata?.helpful === true
                ? 'bg-green-500/30 text-green-300'
                : 'bg-gray-800 text-gray-500 hover:text-green-400'
            }`}
          >
            👍
          </button>
          <button
            onClick={() => onHelpful(msg.id, false)}
            className={`text-sm px-2 py-1 rounded transition-colors ${
              msg.metadata?.helpful === false
                ? 'bg-red-500/30 text-red-300'
                : 'bg-gray-800 text-gray-500 hover:text-red-400'
            }`}
          >
            👎
          </button>
        </div>
      )}

      {done && msg.metadata?.feedbackSent && publicMode && (
        <div className="mt-2 ml-8 text-xs text-green-400">
          ✅ Feedback enviado{msg.metadata.rating && `: ${msg.metadata.rating}/5`}
        </div>
      )}
    </div>
  );
}

// ── CHATBOX ───────────────────────────────────────────────────
export default function ChatBox({ tokenAddress, tokenContext, apiUrl, analysis }) {
  const [msgs, setMsgs]           = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [min, setMin]             = useState(false);
  const [publicMode, setPublicMode] = useState(false);
  const endRef                    = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const ctx = useCallback(() => {
    if (!analysis) return tokenContext;
    return {
      ...tokenContext,
      symbol:             analysis.symbol,
      name:               analysis.name,
      blockchain:         analysis.blockchain,
      price:              analysis.price,
      priceChange24h:     analysis.priceChange24h,
      priceChange7d:      analysis.priceChange7d,
      priceChange30d:     analysis.priceChange30d,
      marketCap:          analysis.marketCap,
      volume24h:          analysis.volume24h,
      volumeChange:       analysis.volumeChange,
      holders:            analysis.holders,
      holdersChange24h:   analysis.holdersChange24h,
      whales:             analysis.whales?.slice(0, 5),
      whaleConcentration: analysis.whales?.slice(0, 3).reduce((sum, w) => sum + w.percent, 0),
      liquidity:          analysis.liquidity,
      liquidityLocked:    analysis.liquidity?.lockedPercent || 0,
      safetyScore:        analysis.safetyScore,
      momentumScore:      analysis.momentumScore,
      safetyBreakdown:    analysis.safetyBreakdown,
      momentumBreakdown:  analysis.momentumBreakdown,
      rsi:                analysis.rsi,
      hasRSI:             !!analysis.rsi,
      hasHistoricalData:  !!analysis.historicalData,
      historicalStats:    analysis.historicalData?.stats,
      ath:                analysis.ath,
      atl:                analysis.atl,
      contractVerified:   analysis.contractInfo?.verified,
      mintable:           analysis.contractInfo?.mintable,
      freezable:          analysis.contractInfo?.freezable,
      cached:             analysis.cached,
      deep:               analysis.deep,
    };
  }, [analysis, tokenContext]);

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sendFeedback = async (msg) => {
    if (!publicMode) return;
    try {
      await axios.post(`${apiUrl}/api/feedback`, {
        tokenAddress,
        analysisData:  analysis,
        aiResponse:    msg.content,
        rating:        msg.metadata.rating,
        wasHelpful:    msg.metadata.helpful,
        feedbackText:  msg.userMessage || '',
        userPlan:      msg.metadata.userPlan,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('lyzerd_api_key')}` }
      });
    } catch (err) {
      console.error('[Feedback]', err);
    }
  };

  const rateMessage = async (msgId, rating) => {
    setMsgs(prev => prev.map(m =>
      m.id === msgId ? { ...m, metadata: { ...m.metadata, rating } } : m
    ));
    const msg = msgs.find(m => m.id === msgId);
    if (msg && publicMode) {
      await sendFeedback({ ...msg, metadata: { ...msg.metadata, rating } });
      setMsgs(prev => prev.map(m =>
        m.id === msgId ? { ...m, metadata: { ...m.metadata, feedbackSent: true } } : m
      ));
    }
  };

  const markHelpful = async (msgId, helpful) => {
    setMsgs(prev => prev.map(m =>
      m.id === msgId ? { ...m, metadata: { ...m.metadata, helpful } } : m
    ));
    const msg = msgs.find(m => m.id === msgId);
    if (msg && publicMode) {
      await sendFeedback({ ...msg, metadata: { ...msg.metadata, helpful } });
      setMsgs(prev => prev.map(m =>
        m.id === msgId ? { ...m, metadata: { ...m.metadata, feedbackSent: true } } : m
      ));
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setMsgs(prev => [...prev, { role: 'user', content: userMessage, id: generateId() }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${apiUrl}/api/chat`, {
        message:      userMessage,
        tokenAddress,
        tokenContext: ctx(),
        history:      msgs
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role, content: m.content })),
        userPlan: 'official',
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('lyzerd_api_key')}` }
      });

      setMsgs(prev => [...prev, {
        id:          generateId(),
        role:        'assistant',
        content:     data.response,
        timestamp:   new Date().toISOString(),
        userMessage,
        metadata:    { rating: null, helpful: null, feedbackSent: false, userPlan: 'official' }
      }]);
    } catch (err) {
      console.error('[Chat]', err);
      setMsgs(prev => [...prev, {
        role:     'assistant',
        content:  'Error. Intenta de nuevo.',
        id:       generateId(),
        metadata: { rating: null, helpful: null, feedbackSent: true, userPlan: 'official' }
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quick = [
    '¿Qué precio target me das?',
    '¿Cuál sería un buen stop loss?',
    analysis?.safetyScore < 40  ? '¿Es muy riesgoso? ¿Por qué?'        :
    analysis?.safetyScore > 70  ? '¿Es buena para hold largo plazo?'    : null,
    analysis?.rsi > 70          ? 'RSI alto, ¿espero corrección?'       :
    analysis?.rsi < 30          ? 'RSI bajo, ¿buen punto de entrada?'   : null,
    analysis?.momentumScore > 70 ? '¿Cuánto más puede subir?'           : null,
  ].filter(Boolean).slice(0, 5);

  // ── MINIMIZED ─────────────────────────────────────────────────
  if (min) {
    return (
      <button
        onClick={() => setMin(false)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-4 rounded-full shadow-2xl hover:bg-blue-600 transition-all hover:scale-110"
      >
        <span className="text-2xl">💬</span>
      </button>
    );
  }

  // ── FULL ──────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900/80 border border-blue-500/30 rounded-lg overflow-hidden backdrop-blur-sm">

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-blue-500/10 border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="text-lg font-bold font-mono tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            CHAT IA
          </h3>
          <Tooltip content="Pregunta lo que sea. La IA tiene acceso completo a todos los datos del análisis.">
            <span className="text-xs text-gray-500 cursor-help">?</span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPublicMode(!publicMode)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all text-xs ${
              publicMode
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {publicMode ? '🌐 PÚBLICO' : '🔒 PRIVADO'}
          </button>
          <button onClick={() => setMin(true)} className="text-gray-400 hover:text-white transition-colors">
            ➖
          </button>
        </div>
      </div>

      {/* Aviso modo público */}
      {publicMode && (
        <div className="p-3 bg-yellow-900/20 border-b border-yellow-500/30">
          <p className="text-xs text-yellow-400 font-bold">
            ⚠️ Modo público: Califica respuestas para enviar feedback automático
          </p>
        </div>
      )}

      {/* Mensajes */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-950/50">
        {msgs.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <div className="text-sm text-gray-500 font-mono">
              Pregunta sobre {tokenContext?.symbol || 'este token'}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {quick.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); setTimeout(send, 100); }}
                  className="text-xs px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full hover:border-blue-500 hover:text-blue-400 transition-colors font-mono"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) =>
          m.role === 'user' ? (
            <div key={m.id}>
              <div className="text-sm p-3 rounded-lg font-mono bg-blue-500/20 text-gray-200 ml-8">
                {m.content}
              </div>
            </div>
          ) : (
            <AssistantMessage
              key={m.id}
              msg={m}
              publicMode={publicMode}
              onRate={rateMessage}
              onHelpful={markHelpful}
            />
          )
        )}

        {loading && (
          <div className="text-sm text-center p-4">
            <div className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg border border-blue-500/30 font-mono">
              <div className="animate-pulse">💭</div>
              <span className="text-gray-400">Analizando...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-900/80 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && input.trim() && send()}
            placeholder="Escribe tu pregunta..."
            className="flex-1 px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-6 py-2.5 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-mono"
          >
            {loading ? '...' : 'SEND'}
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500 font-mono flex items-center justify-between">
          <span>
            💡 IA conoce: holders ({analysis?.holders?.toLocaleString() || 'N/A'}), scores ({analysis?.safetyScore}/100, {analysis?.momentumScore}/100)
            {analysis?.rsi && `, RSI (${analysis.rsi})`}
          </span>
          {publicMode && <span className="text-purple-400">🌐 Training activo</span>}
        </div>
      </div>
    </div>
  );
}
