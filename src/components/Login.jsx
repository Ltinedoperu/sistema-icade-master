import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar usuario por correo y contraseña
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error("Credenciales incorrectas.");
      }

      // 2. Verificar si está activo
      if (data.activo === false) {
        throw new Error("Usuario desactivado. Contacte al administrador.");
      }

      // 3. Guardar sesión en el navegador
      localStorage.setItem('role', data.rol);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('userName', data.nombre || 'Usuario');
      localStorage.setItem('userId', data.id);

      // --- CORRECCIÓN AQUÍ ---
      // Si es Admin O Supervisor -> Van al Dashboard
      // Si es Promotor -> Va al Formulario
      if (data.rol === 'admin' || data.rol === 'supervisor') {
        navigate('/dashboard');
      } else {
        navigate('/formulario');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] px-4 font-sans">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg -rotate-3">
          <div className="w-1.5 h-8 bg-[#0B1120] rounded-full"></div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">ICADE <span className="text-amber-500">PERÚ</span></h1>
        <p className="text-slate-400 text-sm mt-1">Acceso al Sistema Integrado</p>
      </div>

      <div className="w-full max-w-md bg-[#151e32] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 ml-1">Correo Electrónico</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-slate-500" size={20} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0B1120] border border-slate-700 rounded-xl text-white outline-none focus:border-amber-500 transition-all"
                placeholder="usuario@icadeperu.com" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 ml-1">Contraseña / DNI</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-slate-500" size={20} />
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-[#0B1120] border border-slate-700 rounded-xl text-white outline-none focus:border-amber-500 transition-all"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center font-bold">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-[#0B1120] font-bold text-lg rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;