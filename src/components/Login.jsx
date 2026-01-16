import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader } from 'lucide-react';

// --- PEGA AQUÍ TU LINK DE IMGBB (Mantén las comillas) ---
const LOGO_URL = "logo_icade.png"; 
// --------------------------------------------------------

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Verifica usuario y contraseña (DNI) directamente en tu tabla
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('password', password) 
        .single();

      if (error || !usuario) {
        throw new Error("Correo o contraseña incorrectos.");
      }

      if (!usuario.activo) {
        throw new Error("Usuario desactivado.");
      }

      // Guardar datos de sesión
      localStorage.setItem('role', usuario.rol);
      localStorage.setItem('user_email', usuario.email);
      
      navigate('/dashboard');

    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#151e32] border border-slate-800 rounded-3xl p-8 shadow-2xl">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
            {/* Si pusiste el link, sale la imagen. Si no, sale la 'I' */}
            {LOGO_URL && LOGO_URL.includes('http') ? (
                <img 
                    src={LOGO_URL} 
                    alt="Logo Empresa" 
                    className="h-28 w-auto object-contain mb-4" 
                />
            ) : (
                <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center text-[#0B1120] font-black text-4xl mb-4">
                    I
                </div>
            )}
            
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight text-center">
                ICADE PERÚ
            </h1>
            <p className="text-slate-400 text-sm mt-1">Acceso al Sistema Integrado</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2 ml-1">Correo Electrónico</label>
            <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-3 pl-12 text-white outline-none focus:border-amber-500 transition-colors"
                  placeholder="usuario@icade.com"
                  required
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2 ml-1">Contraseña / DNI</label>
            <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-500" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-3 pl-12 text-white outline-none focus:border-amber-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-[#0B1120] font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" /> : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;