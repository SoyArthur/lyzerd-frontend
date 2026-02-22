'use client';
import { useState, useEffect, useRef } from 'react';

// 🔧 CONFIGURABLE - Cambia aquí cuando actualices los TOS
const LEGAL_VERSION = '3.5'; // Cambio automático detecta versión anterior
const LEGAL_CONTENT_KEY = 'lyzerd_legal_consent';

export default function LegalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [versionChanged, setVersionChanged] = useState(false); // Debug
  const bottomRef = useRef(null);

  useEffect(() => {
    // 1. DETECCIÓN DE BOTS (Crucial para AdSense)
    const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
    
    // 2. OBTENER CONSENTIMIENTO PREVIO
    const consent = localStorage.getItem(LEGAL_CONTENT_KEY);
    const parsedConsent = consent ? JSON.parse(consent) : null;
    
    // 3. COMPARAR VERSIONES
    const previousVersion = parsedConsent?.version;
    const hasVersionChanged = previousVersion && previousVersion !== LEGAL_VERSION;
    
    // 4. LÓGICA DE APERTURA
    // Si NO es bot Y (NO hay consentimiento previo O versión cambió)
    if (!isBot && (!consent || hasVersionChanged)) {
      setIsOpen(true);
      setVersionChanged(!!hasVersionChanged); // Para logging
      document.body.style.overflow = 'hidden';
      
      // 🔔 LOG DE DEBUG
      if (hasVersionChanged) {
        console.log(`⚠️ TOS Versionado: ${previousVersion} → ${LEGAL_VERSION}`);
        console.log('📋 Modal legal reabierto automáticamente');
      }
    }
  }, []);

  // Intersection Observer para detectar el final del scroll
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasScrolled(true);
        }
      },
      { threshold: 1.0 }
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => observer.disconnect();
  }, [isOpen]);

  const handleAccept = () => {
    if (!hasScrolled || !isChecked) return;

    // Guardar con versión actual
    const consentData = {
      accepted: true,
      timestamp: Date.now(),
      version: LEGAL_VERSION, // ✅ Versión actual
      previousVersions: [] // Opcional: historial
    };

    localStorage.setItem(LEGAL_CONTENT_KEY, JSON.stringify(consentData));
    
    // 🔔 LOG
    console.log(`✅ TOS V${LEGAL_VERSION} aceptados`);
    
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 border-2 border-red-600 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col">
        
        {/* Header con indicador de versión */}
        <div className="bg-red-900/30 border-b-2 border-red-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">
                  Advertencia Legal Obligatoria
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {versionChanged ? '🔄 Actualización de Términos' : 'V' + LEGAL_VERSION}
                </p>
              </div>
            </div>
            <div className="bg-red-500/20 border border-red-500 px-3 py-2 rounded">
              <p className="text-xs font-mono text-red-400">v{LEGAL_VERSION}</p>
            </div>
          </div>
        </div>

        {/* Alerta si versión cambió */}
        {versionChanged && (
          <div className="bg-yellow-950/40 border-t border-b border-yellow-600 p-4">
            <p className="text-xs text-yellow-300">
              <span className="font-bold">ℹ️ Actualizamos nuestros Términos.</span> Debes aceptar la nueva versión para continuar.
            </p>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-gray-300 scroll-smooth">
          <div className="bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r">
            <h3 className="font-bold text-red-400 text-sm mb-1 uppercase">🤖 IA Experimental</h3>
            <p className="text-xs leading-relaxed">
              Lyzerd utiliza modelos que pueden <strong>alucinar</strong>. Los datos pueden ser ficticios o erróneos.
            </p>
          </div>

          <div className="bg-orange-950/20 border-l-4 border-orange-500 p-4 rounded-r">
            <h3 className="font-bold text-orange-400 text-sm mb-1 uppercase">💰 Riesgo de Capital</h3>
            <p className="text-xs leading-relaxed">
              Pérdida total potencial. No somos asesores financieros. El mercado cripto no tiene piedad.
            </p>
          </div>

          <div className="bg-blue-950/20 border-l-4 border-blue-500 p-4 rounded-r">
            <h3 className="font-bold text-blue-400 text-sm mb-1 uppercase">📊 Análisis en Rangos</h3>
            <p className="text-xs leading-relaxed">
              Lyzerd proporciona análisis basados en rangos y patrones históricos. 
              No son recomendaciones específicas. Tú decides las acciones finales.
            </p>
          </div>

          <div className="p-4 bg-gray-800/50 rounded text-[11px] text-gray-400 space-y-2">
            <p>Usted acepta que el uso de esta herramienta es bajo su exclusivo riesgo y renuncia a cualquier acción legal contra el Desarrollador.</p>
            <p>Jurisdicción aplicable: Residencia del Desarrollador (Arbitraje Único).</p>
            <p className="text-gray-500 pt-2">
              <strong>Versión actual:</strong> {LEGAL_VERSION} | 
              <strong className="ml-2">Última actualización:</strong> {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>

          {/* Centinela de Scroll */}
          <div ref={bottomRef} className="h-4 w-full" />
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-gray-800 p-6 bg-gray-950 rounded-b-xl">
          <div className="flex items-center gap-3 mb-6">
            <input 
              type="checkbox" 
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={!hasScrolled}
              className="w-5 h-5 accent-red-600 cursor-pointer disabled:opacity-30"
              id="legal-checkbox"
            />
            <label 
              htmlFor="legal-checkbox"
              className={`text-xs md:text-sm cursor-pointer select-none ${hasScrolled ? 'text-white' : 'text-gray-600'}`}
            >
              He leído y acepto los <a href="/terms" target="_blank" className="text-red-500 underline">Términos y Condiciones v{LEGAL_VERSION}</a>
            </label>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => window.location.href = 'https://google.com'}
              className="px-6 py-3 bg-gray-800 text-gray-500 text-sm font-bold rounded-lg hover:bg-gray-700 transition-all"
            >
              SALIR
            </button>
            
            <button
              onClick={handleAccept}
              disabled={!hasScrolled || !isChecked}
              className="flex-1 px-6 py-3 bg-red-600 text-white text-sm font-black rounded-lg
                         hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600
                         transition-all duration-300 shadow-lg shadow-red-900/20"
            >
              {!hasScrolled ? 'DESLICE HASTA EL FINAL' : !isChecked ? 'MARQUE LA CASILLA' : `ACEPTAR V${LEGAL_VERSION}`}
            </button>
          </div>

          {/* Indicador de estado */}
          <p className="text-center text-[10px] text-gray-500 mt-4">
            {hasScrolled && isChecked ? '✅ Listo para aceptar' : '⏳ Completa los pasos'}
          </p>
        </div>
      </div>
    </div>
  );
}
