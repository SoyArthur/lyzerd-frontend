// ═══════════════════════════════════════════════════════════════
// stripeComponent.jsx - STRIPE SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, memo } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ═══════════════════════════════════════════════════════════════
// PLAN CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const PLANS = {
  free: {
    name: 'Free',
    icon: '🆓',
    price: '$0',
    period: '',
    features: [
      '10 búsquedas/día',
      '100 búsquedas/mes',
      '5 créditos/día',
      'Análisis básico',
      'Sin soporte prioritario',
    ],
    limits: { daily: 10, monthly: 100, credits: 5 },
    color: 'gray',
  },
  premium: {
    name: 'Premium',
    icon: '⭐',
    price: '$29',
    period: '/mes',
    features: [
      '100 búsquedas/día',
      '2,000 búsquedas/mes',
      '50 créditos/día',
      'Análisis avanzado',
      'Históricos extendidos',
      'Soporte prioritario',
    ],
    limits: { daily: 100, monthly: 2000, credits: 50 },
    color: 'cyan',
  },
  enterprise: {
    name: 'Enterprise',
    icon: '🏢',
    price: '$99',
    period: '/mes',
    features: [
      'Búsquedas ilimitadas',
      'Sin límites mensuales',
      '500 créditos/día',
      'Análisis premium + IA',
      'Trending por tier',
      'Whale concentration',
      'Data quality metrics',
      'API dedicada',
      'Soporte 24/7',
    ],
    limits: { daily: 999999, monthly: 999999, credits: 500 },
    color: 'yellow',
  },
};

// ═══════════════════════════════════════════════════════════════
// STRIPE MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════
export const StripeModal = memo(({ onClose, currentPlan = 'free', isDark, C, Glass, Btn }) => {
  const [loading, setLoading] = useState({});
  const [subInfo, setSubInfo] = useState(null);
  const [fetchingInfo, setFetchingInfo] = useState(true);

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('lyzerd_api_key') : null;

  // Fetch subscription info
  useEffect(() => {
    const fetchInfo = async () => {
      if (!apiKey) return;
      
      try {
        const { data } = await axios.get(`${API}/api/stripe/subscription-info`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        setSubInfo(data.subscription);
      } catch (err) {
        console.error('[Stripe] Failed to fetch info:', err);
      } finally {
        setFetchingInfo(false);
      }
    };

    fetchInfo();
  }, [apiKey]);

  const handleUpgrade = useCallback(async (plan) => {
    if (!apiKey) return;
    
    setLoading(prev => ({ ...prev, [plan]: true }));
    
    try {
      const { data } = await axios.post(
        `${API}/api/stripe/create-checkout-session`,
        { plan },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al crear sesión de pago');
      setLoading(prev => ({ ...prev, [plan]: false }));
    }
  }, [apiKey]);

  const handleManageBilling = useCallback(async () => {
    if (!apiKey) return;
    
    setLoading(prev => ({ ...prev, portal: true }));
    
    try {
      const { data } = await axios.post(
        `${API}/api/stripe/create-portal-session`,
        {},
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      
      // Redirect to Stripe Portal
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error al abrir portal');
      setLoading(prev => ({ ...prev, portal: false }));
    }
  }, [apiKey]);

  const PlanCard = memo(({ planId, plan, isCurrent }) => {
    const isDowngrade = 
      (currentPlan === 'enterprise' && planId !== 'enterprise') ||
      (currentPlan === 'premium' && planId === 'free');

    return (
      <div 
        className={`relative ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 border-2 transition-all ${
          isCurrent 
            ? `ring-4 ${C[plan.color]?.border || 'ring-cyan-500'} scale-105 shadow-2xl ${C[plan.color]?.glow || 'shadow-cyan-500/20'}` 
            : 'hover:scale-[1.02]'
        }`}
      >
        {isCurrent && (
          <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-cyan-500 text-white' : 'bg-cyan-400 text-white'}`}>
            Plan Actual
          </div>
        )}

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{plan.icon}</div>
          <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            {plan.name}
          </h3>
          <div className={`text-4xl font-black ${C[plan.color]?.text || 'text-cyan-400'} mb-1`}>
            {plan.price}
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} font-normal`}>
              {plan.period}
            </span>
          </div>
        </div>

        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, idx) => (
            <li key={idx} className={`flex items-start gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className={`${C[plan.color]?.text || 'text-cyan-400'} text-lg`}>✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {planId === 'free' ? (
          <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} py-3`}>
            Plan gratuito
          </div>
        ) : isCurrent ? (
          <Btn 
            onClick={handleManageBilling}
            disabled={loading.portal}
            variant="secondary"
            isDark={isDark}
            className="w-full"
          >
            {loading.portal ? '⏳ Cargando...' : '⚙️ Gestionar Plan'}
          </Btn>
        ) : isDowngrade ? (
          <div className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} py-3`}>
            Downgrade desde portal
          </div>
        ) : (
          <Btn
            onClick={() => handleUpgrade(planId)}
            disabled={loading[planId]}
            variant="primary"
            isDark={isDark}
            className="w-full"
          >
            {loading[planId] ? '⏳ Procesando...' : '🚀 Upgrade'}
          </Btn>
        )}
      </div>
    );
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
      <div className="max-w-6xl w-full my-8">
        <Glass isDark={isDark} glow className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className={`text-4xl font-black bg-gradient-to-r ${C.cyan?.gradient || 'from-cyan-400 to-teal-400'} bg-clip-text text-transparent mb-2`}>
                💎 Planes & Precios
              </h2>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Elige el plan perfecto para ti
              </div>
            </div>
            <button 
              onClick={onClose} 
              className={`text-4xl ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              ✕
            </button>
          </div>

          {/* Current Subscription Info */}
          {fetchingInfo ? (
            <div className={`mb-6 p-4 ${isDark ? 'bg-gray-900/50' : 'bg-gray-100'} rounded-xl text-center`}>
              <div className="text-sm text-gray-400">Cargando información...</div>
            </div>
          ) : subInfo?.hasActiveSubscription && (
            <div className={`mb-6 p-6 ${isDark ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-100 border-cyan-300'} rounded-xl border-2`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${isDark ? 'text-cyan-300' : 'text-cyan-900'} font-bold mb-1`}>
                    Suscripción Activa
                  </div>
                  <div className={`${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
                    Plan: <span className="font-black uppercase">{subInfo.plan}</span>
                    {subInfo.cancelAtPeriodEnd && (
                      <span className="ml-2 px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">
                        Cancela: {new Date(subInfo.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {!subInfo.cancelAtPeriodEnd && subInfo.currentPeriodEnd && (
                    <div className={`text-xs mt-1 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      Renueva: {new Date(subInfo.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Btn
                  onClick={handleManageBilling}
                  disabled={loading.portal}
                  variant="secondary"
                  isDark={isDark}
                  className="!px-6"
                >
                  {loading.portal ? '⏳' : '⚙️ Gestionar'}
                </Btn>
              </div>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {Object.entries(PLANS).map(([planId, plan]) => (
              <PlanCard 
                key={planId}
                planId={planId}
                plan={plan}
                isCurrent={currentPlan === planId}
              />
            ))}
          </div>

          {/* Footer */}
          <div className={`pt-6 border-t-2 ${isDark ? 'border-gray-700' : 'border-gray-200'} text-center`}>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              💳 Pagos procesados de forma segura por <span className="font-bold">Stripe</span>
            </div>
            <div className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Cancela cuando quieras • Sin cargos ocultos • Facturación mensual
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
});

StripeModal.displayName = 'StripeModal';

// ═══════════════════════════════════════════════════════════════
// PLAN BADGE COMPONENT (for Header)
// ═══════════════════════════════════════════════════════════════
export const PlanBadge = memo(({ plan = 'free', isDark, C, onClick }) => {
  const planConfig = PLANS[plan] || PLANS.free;
  
  return (
    <button
      onClick={onClick}
      className={`group relative px-4 py-2 rounded-xl font-bold transition-all hover:scale-105 ${
        isDark 
          ? 'bg-gray-800/50 hover:bg-gray-800/70 border-gray-700' 
          : 'bg-white hover:bg-gray-50 border-gray-200'
      } border-2 cursor-pointer`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{planConfig.icon}</span>
        <div className="text-left">
          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase font-bold`}>
            Plan
          </div>
          <div className={`text-sm ${C[planConfig.color]?.text || 'text-cyan-400'}`}>
            {planConfig.name}
          </div>
        </div>
      </div>
      
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
        plan === 'free' ? 'bg-gray-500' : plan === 'premium' ? 'bg-cyan-500' : 'bg-yellow-500'
      } animate-pulse opacity-0 group-hover:opacity-100 transition-opacity`} />
    </button>
  );
});

PlanBadge.displayName = 'PlanBadge';

export default StripeModal;
