import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      console.error(err);
      setError(
          err.code === 'auth/invalid-credential' 
          ? 'Credenciales incorrectas' 
          : err.code === 'auth/email-already-in-use'
          ? 'El correo ya está registrado'
          : err.code === 'auth/weak-password'
          ? 'Contraseña débil (mínimo 6 caracteres)'
          : 'Error al ' + (isLogin ? 'iniciar sesión' : 'registrarte')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center p-4 selection:bg-primary/30">
      
      <div className="bg-surface p-10 rounded-[2rem] border border-white/5 shadow-2xl w-full max-w-md relative overflow-hidden">
        
        {/* Decorative Blur */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-700/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-800 shadow-[0_0_30px_rgba(139,92,246,0.6)] flex items-center justify-center mb-6">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-center">
            {isLogin ? 'Bienvenido de Nuevo' : 'Crea tu Cuenta'}
          </h1>
          <p className="text-text-muted mt-2 text-center text-sm">
            Tus finanzas personales avanzadas y seguras.
          </p>
        </div>

        {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm font-semibold text-center animate-pulse">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5">
          <label className="flex flex-col gap-2 font-medium">
            <span className="text-sm text-text-muted">Correo Electrónico</span>
            <input 
              type="email" 
              required
              className="bg-black/20 border border-white/10 p-4 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </label>

          <label className="flex flex-col gap-2 font-medium">
            <span className="text-sm text-text-muted">Contraseña</span>
            <input 
              type="password" 
              required
              minLength="6"
              className="bg-black/20 border border-white/10 p-4 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button 
            disabled={loading}
            className="mt-4 bg-gradient-to-r from-primary to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50"
          >
            {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarme')}
          </button>
        </form>

        <div className="relative z-10 mt-8 text-center text-sm text-text-muted">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'} {' '}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-primary font-bold hover:underline"
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
