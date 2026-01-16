import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para el logo y nombre
  const [empresa, setEmpresa] = useState({ 
      nombre: 'ICADE PERÚ', 
      logo_url: '' 
  });

  useEffect(() => {
    // 1. Cargar Logo y Nombre de la Empresa
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('configuracion').select('nombre_empresa, logo_url').single();
        if (data) {
            setEmpresa({
                nombre: data.nombre_empresa || 'ICADE PERÚ',
                logo_url: data.logo_url || ''
            });
        }
      } catch (e) { console.log("Config por defecto"); }
    };
    fetchConfig();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 2. CAMBIO CLAVE: Buscar directamente en la tabla 'usuarios'
      // Verificamos si existe alguien con ese email Y esa contraseña
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('password', password) // Compara con la columna password (que suele ser el DNI)
        .single();

      if (error || !usuario) {
        throw new Error("Correo o contraseña incorrectos (o el usuario no existe en la tabla).");
      }

      if (!usuario.activo) {
        throw new Error("Este usuario ha sido desactivado por el administrador.");
      }

      // 3. Si existe, guardar datos y entrar
      localStorage.setItem('role', usuario.rol);
      localStorage.setItem('user_email', usuario.email);
      localStorage.setItem('user_name', usuario.nombre); // Para mostrar "Hola, Juan" si quieres luego
      
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
        
        {/* LOGO EMPRESA */}
        <div className="flex flex-col items-center mb-8">
            {empresa.logo_url ? (
                <img 
                    src={empresa.logo_url} 
                    alt="Logo Empresa" 
                    className="h-24 w-auto object-contain mb-4 bg-white/5 p-2 rounded-xl" 
                />
            ) : (
                <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center text-[#0B1120] font-black text-4xl mb-4 shadow-lg shadow-amber-500/20 -rotate-3">
                    I
                </div>
            )}
            
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight text-center">
                {empresa.nombre}
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
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2 ml-1">Contraseña (DNI)</label>
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