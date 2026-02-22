/**
 * 🦎 LYZERD AUTHENTICATION & TRAFFIC CONTROL SYSTEM
 * Version: 7.1.0 - "Identity Confirmation Protocol"
 * Logic: Strict Frontend Validation & Signal Feedback
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// --- CONFIGURACIÓN DE SISTEMA ---
const SYSTEM_NAME = 'LYZERD';
const TARGET_RESET_PATH = '/resetpassword';
const DEFAULT_REDIRECT = '/'; // Asegúrate que sea la ruta real
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * ENGINE: GESTIÓN DE PERSISTENCIA
 */
const identityStore = {
  save: (key, val) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`lzd_core_${key}`, typeof val === 'string' ? val : JSON.stringify(val));
    }
  },
  load: (key) => {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(`lzd_core_${key}`);
      try { return JSON.parse(item); } catch { return item; }
    }
    return null;
  },
  purge: () => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(k => k.startsWith('lzd_core_'))
        .forEach(k => localStorage.removeItem(k));
    }
  }
};

// --- COMPONENTES DE UI ---

const StatusBanner = ({ type, message }) => {
  if (!message) return null;
  const isError = type === 'error';
  
  return (
    <div className={`
      w-full p-4 rounded-2xl border mb-6 animate-in fade-in slide-in-from-top-2 duration-300
      ${isError 
        ? 'bg-red-950/30 border-red-500/30 text-red-400' 
        : 'bg-green-950/30 border-green-500/30 text-green-400'}
    `}>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold">{isError ? '⚠️' : '✓'}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};

const Field = ({ label, type, value, onChange, placeholder, icon, disabled }) => (
  <div className="space-y-2 group">
    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-focus-within:text-green-500 transition-colors ml-1">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-800 outline-none focus:border-green-500/50 focus:bg-gray-900 transition-all font-mono text-sm disabled:opacity-50"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg opacity-20 group-focus-within:opacity-100 transition-opacity grayscale group-focus-within:grayscale-0">
        {icon}
      </span>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | signup | recover
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  
  // Datos de Formulario
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // 1. INTERCEPTOR DE TRÁFICO
  useEffect(() => {
    const scanAndRedirect = () => {
      const { hash, pathname } = window.location;

      // Detectar flujo de recuperación de Supabase
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
        console.log('🦎 LYZERD: Protocolo de recuperación detectado.');
        router.replace(`${TARGET_RESET_PATH}${hash}`);
        return;
      }

      // Si ya tiene sesión, redirigir
      const sessionKey = identityStore.load('api_key');
      if (sessionKey && pathname === '/auth') { // O la ruta donde esté este componente
        router.push(DEFAULT_REDIRECT);
      }
    };

    if (typeof window !== 'undefined') {
      scanAndRedirect();
    }
  }, [router]);

  const updateField = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (status.msg) setStatus({ type: '', msg: '' }); // Limpiar error al escribir
  };

  // 2. EJECUCIÓN TÁCTICA
  const executeAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      // --- RECUPERACIÓN ---
      if (mode === 'recover') {
        await axios.post(`${API_URL}/api/auth/reset-password`, { 
          email: formData.email 
        });
        setStatus({ 
          type: 'success', 
          msg: 'ENLACE ENVIADO. Verifica tu bandeja para restaurar el acceso.' 
        });
        setLoading(false);
        return;
      }

      // --- LOGIN / SIGNUP ---
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      
      const { data } = await axios.post(`${API_URL}${endpoint}`, {
        email: formData.email,
        password: formData.password
      });

      // CASO SIGNUP: El backend ahora retorna "mustVerify"
      if (mode === 'signup') {
        if (data.mustVerify) {
            setStatus({ 
                type: 'success', 
                msg: 'REGISTRO INICIADO. Revisa tu email para activar la cuenta.' 
            });
            // Opcional: Cambiar a modo login para que esperen
            setTimeout(() => setMode('login'), 2000);
        } else {
            // Fallback por si la config de backend cambia
            setStatus({ type: 'success', msg: 'IDENTIDAD CREADA. Accediendo...' });
            loginSuccess(data);
        }
      } 
      // CASO LOGIN
      else {
        loginSuccess(data);
      }

    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      
      // Mapeo de errores - Terminal
      const errorMap = {
        'INVALID_CREDENTIALS': 'CREDENCIALES INVÁLIDAS.',
        'EMAIL_ALREADY_EXISTS': 'ERROR: Identidad ya registrada.',
        'EMAIL_NOT_CONFIRMED': 'ACCESO DENEGADO: Email no verificado. Revisa tu bandeja.',
        'USER_NOT_FOUND': 'ERROR: Usuario no encontrado.',
        'SIGNUP_FAILED_NO_ID': 'ERROR CRÍTICO: Fallo en creación de identidad.'
      };

      const finalMsg = errorMap[errorMsg] || `ERROR DEL SISTEMA: ${errorMsg}`;
      setStatus({ type: 'error', msg: finalMsg });
    } finally {
      setLoading(false);
    }
  };

  const loginSuccess = (data) => {
    const apiKey = data.apiKey;
    if (!apiKey) {
        setStatus({ type: 'error', msg: 'ERROR DE INTEGRIDAD: Sin llave de acceso.' });
        return;
    }
    identityStore.save('api_key', apiKey);
    identityStore.save('user_data', data); // Guarda info básica (plan, email)
    
    setStatus({ type: 'success', msg: 'ACCESO CONCEDIDO. Sincronizando...' });
    setTimeout(() => router.push(DEFAULT_REDIRECT), 800);
  };

  // --- CONFIGURACIÓN UI ---
  const uiConfig = useMemo(() => {
    return {
      login: { title: 'Acceso Central', btn: 'INGRESAR', footer: 'Crear Identidad', to: 'signup' },
      signup: { title: 'Nueva Identidad', btn: 'REGISTRAR', footer: 'Ya tengo cuenta', to: 'login' },
      recover: { title: 'Recuperar', btn: 'ENVIAR LINK', footer: 'Cancelar', to: 'login' }
    }[mode];
  }, [mode]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo Ambiental */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        
        {/* Header */}
        <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white tracking-tighter italic mb-2">
                LYZERD<span className="text-green-500 not-italic">.</span>
            </h1>
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.4em]">
                Secure Auth Protocol
            </p>
        </div>

        {/* Notificaciones */}
        <StatusBanner type={status.type} message={status.msg} />

        {/* Formulario */}
        <form onSubmit={executeAuth} className="bg-gray-950/50 backdrop-blur-md border border-gray-900 p-8 rounded-3xl shadow-2xl space-y-6">
            
            <h2 className="text-xl font-bold text-white uppercase tracking-tight text-center">
                {uiConfig.title}
            </h2>

            <Field 
              label="Email" 
              type="email" 
              placeholder="user@lyzerd.io"
              value={formData.email}
              onChange={updateField('email')}
              icon="◈"
              disabled={loading}
            />

            {mode !== 'recover' && (
                <div className="space-y-1">
                    <Field 
                        label="Password" 
                        type="password" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={updateField('password')}
                        icon="🔒"
                        disabled={loading}
                    />
                    {mode === 'login' && (
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={() => setMode('recover')} className="text-[10px] text-gray-600 hover:text-green-500 uppercase tracking-wider transition-colors">
                                ¿Olvidaste tu clave?
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-white hover:bg-green-400 text-black font-black py-4 rounded-xl tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-xs uppercase"
            >
              {loading ? 'PROCESANDO...' : uiConfig.btn}
            </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center">
            <button 
                onClick={() => {
                    setMode(uiConfig.to);
                    setStatus({ type: '', msg: '' });
                }}
                className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
            >
                {uiConfig.footer}
            </button>
        </div>

      </div>
    </div>
  );
}

