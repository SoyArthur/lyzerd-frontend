'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Reutilizamos la lógica de storage para consistencia
const storage = {
  set: (k, v) => typeof window !== 'undefined' && localStorage.setItem(`lyzerd_${k}`, v),
};

// Componentes UI idénticos al Login para convergencia total
function Alert({ type, children }) {
  const styles = { 
    success: 'bg-green-900/30 border-green-500 text-green-200', 
    error: 'bg-red-900/30 border-red-500 text-red-300',
    info: 'bg-blue-900/30 border-blue-500 text-blue-200'
  };
  return (
    <div className={`border-2 rounded-xl p-4 mb-6 ${styles[type]}`}>
      <p className="text-sm font-bold">{children}</p>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-green-500 uppercase tracking-wide">{label}</label>
      <input 
        {...props} 
        className="w-full px-4 py-3 bg-gray-950 border-2 border-gray-800 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-green-500 transition-all disabled:opacity-50" 
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Extracción limpia del token desde el hash de Supabase/Auth
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (accessToken) {
      setToken(accessToken);
      validateToken(accessToken);
    } else {
      setError('Token no detectado. Acceso denegado.');
      setValidating(false);
      setTimeout(() => router.push('/login'), 2000);
    }
  }, []);

  const validateToken = async (tokenToVerify) => {
    try {
      await axios.post(`${API}/api/auth/validate-reset-token`, {}, {
        headers: { 'Authorization': `Bearer ${tokenToVerify}` }
      });
      setValidating(false);
    } catch (err) {
      setError('El enlace ha expirado o es inválido.');
      setValidating(false);
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden');
    if (newPassword.length < 8) return setError('Mínimo 8 caracteres requeridos');

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API}/api/auth/update-password`, 
        { newPassword },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMessage('✅ Contraseña actualizada con éxito.');
      
      // Auto-login terminal
      if (data.apiKey) {
        storage.set('api_key', data.apiKey);
        storage.set('user', JSON.stringify(data.user));
      }

      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-500 font-mono animate-pulse uppercase tracking-widest">
          Validando Credenciales...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🦎</div>
          <h1 className="text-5xl font-black text-white">LYZERD<span className="text-green-500">.</span></h1>
          <p className="text-gray-500 text-xs font-mono mt-2 uppercase tracking-widest">Restablecer Seguridad</p>
        </div>

        {message && <Alert type="success">{message}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {!message && (
          <form onSubmit={handleSubmit} className="bg-gray-900/40 backdrop-blur-xl border-2 border-gray-800 p-8 rounded-3xl space-y-6">
            <Input 
              label="Nueva Contraseña" 
              type="password" 
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Input 
              label="Confirmar Contraseña" 
              type="password" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-500 text-black font-black rounded-2xl hover:bg-green-400 transition-all disabled:opacity-50"
            >
              {loading ? 'ACTUALIZANDO...' : 'RESETEAR CONTRASEÑA'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
