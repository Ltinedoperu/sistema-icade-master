import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// Renombramos PieChart a PieChartIcon para evitar conflictos raros
import { LogOut, Search, User, Plus, Trash2, Edit, X, BarChart3, TrendingUp, Users, Shield, Power, Eye, DollarSign, Check, XCircle, PieChart as PieChartIcon, Filter, Sun, Moon, GraduationCap } from 'lucide-react';

// --- GRÁFICOS (Modo Ultra Seguro) ---
const SimpleBarChart = ({ data, isDark }) => {
    try {
        const safeData = Array.isArray(data) ? data : [];
        const valores = safeData.map(d => d.value || 0);
        const max = valores.length > 0 ? Math.max(...valores) : 100;

        return (
            <div className={`flex items-end gap-2 h-32 pt-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                {safeData.map((d, i) => {
                    let porcentaje = 0;
                    if (max > 0) porcentaje = ((d.value || 0) / max) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="w-full bg-emerald-500 rounded-t opacity-50" style={{ height: `${porcentaje}%` }}></div>
                            <span className={`text-[10px] truncate w-full text-center ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{d.label || '-'}</span>
                        </div>
                    );
                })}
            </div>
        );
    } catch (e) {
        return <div className="text-xs text-red-500">Error en gráfico</div>;
    }
};

const Dashboard = () => {
  const navigate = useNavigate();
  // Estado para capturar errores fatales
  const [errorFatal, setErrorFatal] = useState(null);

  const [view, setView] = useState('ventas');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('promotor'); // Default seguro
  
  // Datos
  const [ventas, setVentas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros
  const [filterPromoter, setFilterPromoter] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterUgel, setFilterUgel] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Modales y Formularios (Inicializados con valores seguros)
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [fichaData, setFichaData] = useState(null);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [modalPayOpen, setModalPayOpen] = useState(false);
  const [payData, setPayData] = useState(null);
  const [nuevoPago, setNuevoPago] = useState({ concepto: '', monto: '', fecha_pago: '', medio_pago: 'Efectivo', material_entregado: false });
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true });
  const [nuevoCurso, setNuevoCurso] = useState({ nivel: 'Inicial', nombre: '', tipo: 'General' });
  
  const [stats, setStats] = useState({ hoy: 0, mes: 0, total: 0 });
  const [reportData, setReportData] = useState({ daily: [] });

  useEffect(() => {
      try {
          const role = localStorage.getItem('role') || 'promotor';
          setCurrentUserRole(role);
          
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme === 'light') setDarkMode(false);

          fetchData(); 
      } catch (err) {
          console.error("Error crítico al iniciar:", err);
          setErrorFatal(err.message);
      }
      
      const handleEsc = (event) => { if (event.key === 'Escape') closeAllModals(); };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const theme = {
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-gray-100',
      text: darkMode ? 'text-slate-200' : 'text-gray-800',
      textSec: darkMode ? 'text-slate-400' : 'text-gray-500',
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-gray-200 shadow-sm',
      input: darkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900',
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-gray-200 shadow-sm',
      tableHeader: darkMode ? 'bg-[#0f1623]' : 'bg-gray-50 text-gray-700',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-gray-50 border-gray-200',
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-white border-gray-200',
      btnGhost: darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const closeAllModals = () => {
      setModalEditOpen(false); setModalFichaOpen(false); setModalPayOpen(false); setModalUserOpen(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: u } = await supabase.from('usuarios').select('*');
        setUsuarios(u || []);
        
        const { data: v } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
        setVentas(v || []);
        calcularEstadisticas(v || []);
        
        const { data: c } = await supabase.from('cursos').select('*').order('created_at', { ascending: false });
        setCursos(c || []);
    } catch (err) {
        console.error("Error cargando datos:", err);
    } finally {
        setLoading(false);
    }
  };

  const obtenerNombreAsesor = (email) => {
    if (!email) return 'Desconocido';
    const usuario = usuarios.find(u => u.email === email);
    return usuario ? usuario.nombre : email.split('@')[0];
  };

  const calcularEstadisticas = (data) => {
    if (!data) return;
    const hoy = new Date().toLocaleDateString();
    const esteMes = new Date().getMonth();
    const ventasHoy = data.filter(v => new Date(v.created_at).toLocaleDateString() === hoy);
    const ventasMes = data.filter(v => new Date(v.created_at).getMonth() === esteMes);
    setStats({ hoy: ventasHoy.length, mes: ventasMes.length, total: data.length });
    
    // Gráfico simple
    const days = {};
    ventasMes.forEach(v => { const d = new Date(v.created_at).getDate(); days[d] = (days[d] || 0) + 1; });
    setReportData({ daily: Object.keys(days).map(k => ({ label: k, value: days[k] })) });
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  // Filtros seguros
  const filteredVentas = ventas.filter(v => {
      if (!v) return false;
      const term = searchTerm.toLowerCase();
      const matchSearch = (v.nombre || '').toLowerCase().includes(term) || (v.dni || '').includes(term);
      const matchPromoter = filterPromoter ? v.promotor_email === filterPromoter : true;
      return matchSearch && matchPromoter;
  });

  // Acciones
  const abrirEditar = (v) => { setEditForm(v || {}); setModalEditOpen(true); };
  const abrirPagar = (v) => { setPayData(v); setNuevoPago({...nuevoPago, fecha_pago: new Date().toISOString().split('T')[0]}); setModalPayOpen(true); };
  const abrirFicha = async (v) => {
      setFichaData(v); setModalFichaOpen(true);
      const { data } = await supabase.from('historial_pagos').select('*').eq('cliente_id', v.id);
      setHistorialPagos(data || []);
  };
  const abrirUsuario = (u) => { setUserForm(u || { nombre:'', apellidos:'', dni:'', celular:'', email:'', rol:'promotor', activo:true }); setModalUserOpen(true); };
  
  // Guardados
  const guardarEdicion = async (e) => { e.preventDefault(); await supabase.from('clientes').update(editForm).eq('id', editForm.id); setModalEditOpen(false); fetchData(); };
  const registrarPago = async (e) => { e.preventDefault(); await supabase.from('historial_pagos').insert([{cliente_id: payData.id, ...nuevoPago}]); setModalPayOpen(false); };
  const guardarUsuario = async (e) => { e.preventDefault(); if(!userForm.id) await supabase.from('usuarios').insert([{...userForm, password: userForm.dni}]); else await supabase.from('usuarios').update(userForm).eq('id', userForm.id); setModalUserOpen(false); fetchData(); };
  const toggleUserStatus = async (u) => { await supabase.from('usuarios').update({activo: !u.activo}).eq('id', u.id); fetchData(); };
  const handleAddCurso = async (e) => { e.preventDefault(); await supabase.from('cursos').insert([nuevoCurso]); setNuevoCurso({...nuevoCurso, nombre:''}); fetchData(); };
  const handleDelCurso = async (id) => { if(confirm("Borrar?")) { await supabase.from('cursos').delete().eq('id', id); fetchData(); }};
  const cambiarEstadoFicha = async (id, est) => { await supabase.from('clientes').update({estado_ficha: est}).eq('id', id); fetchData(); };

  // --- RENDER DE EMERGENCIA ---
  if (errorFatal) return <div className="p-10 bg-red-900 text-white"><h1>Error Fatal: {errorFatal}</h1><button onClick={handleLogout} className="mt-4 bg-white text-red-900 p-2 rounded">Cerrar Sesión (Reset)</button></div>;

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      
      {/* NAVBAR */}
      <nav className={`${theme.nav} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 border-b`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-[#0B1120] font-bold text-xl">I</div>
            <div>
                <h1 className="text-xl font-bold">ICADE <span className="text-amber-500">ADMIN</span></h1>
                <p className={`text-[10px] uppercase tracking-widest ${theme.textSec}`}>{currentUserRole}</p>
            </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-lg border ${theme.btnGhost}`}>{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-slate-800' : 'bg-gray-200'}`}>
             {['ventas', 'reportes', 'equipo', 'cursos'].map(v => (
                 <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-sm capitalize rounded ${view===v ? 'bg-amber-500 text-black font-bold' : theme.textSec}`}>{v}</button>
             ))}
          </div>
          <button onClick={handleLogout} className="p-2 text-rose-500 border rounded-lg bg-slate-800/50"><LogOut size={20}/></button>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto p-4 md:p-6">
        {loading && <div className="text-center py-10 opacity-50">Cargando datos...</div>}

        {/* VISTA VENTAS */}
        {!loading && view === 'ventas' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`${theme.card} p-4 rounded-xl border`}>Total Hoy: <span className="text-2xl font-bold block">{stats.hoy}</span></div>
                <div className={`${theme.card} p-4 rounded-xl border`}>Este Mes: <span className="text-2xl font-bold block">{stats.mes}</span></div>
                <div className={`${theme.card} p-4 rounded-xl border`}>Total: <span className="text-2xl font-bold block">{stats.total}</span></div>
            </div>

            <div className={`${theme.card} p-4 rounded-xl border mb-4 flex gap-2`}>
                <Search size={18} className="text-slate-500 mt-2"/>
                <input placeholder="Buscar por nombre o DNI..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={`w-full bg-transparent outline-none ${theme.text}`}/>
            </div>

            <div className={`${theme.card} rounded-xl border overflow-hidden overflow-x-auto`}>
                <table className="w-full text-sm text-left">
                    <thead className={theme.tableHeader}><tr><th className="p-4">Estado</th><th className="p-4">Alumno</th><th className="p-4">Asesor</th><th className="p-4 text-center">Acciones</th></tr></thead>
                    <tbody className={`divide-y ${darkMode?'divide-slate-800':'divide-gray-200'}`}>
                        {filteredVentas.map(v => (
                            <tr key={v.id} className={theme.tableRow}>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold uppercase ${v.estado_ficha==='aprobado'?'text-emerald-500':v.estado_ficha==='rechazado'?'text-rose-500':'text-amber-500'}`}>{v.estado_ficha || 'Pendiente'}</span>
                                    {currentUserRole !== 'supervisor' && (
                                        <div className="flex gap-1 mt-1">
                                            <button onClick={()=>cambiarEstadoFicha(v.id, 'aprobado')} className="text-emerald-500 hover:bg-emerald-500/20 p-1 rounded"><Check size={12}/></button>
                                            <button onClick={()=>cambiarEstadoFicha(v.id, 'rechazado')} className="text-rose-500 hover:bg-rose-500/20 p-1 rounded"><XCircle size={12}/></button>
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="font-bold">{v.nombre}</div>
                                    <div className={`text-xs ${theme.textSec}`}>{v.dni}</div>
                                </td>
                                <td className="p-4 text-xs">{obtenerNombreAsesor(v.promotor_email)}</td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={()=>abrirFicha(v)} className="p-2 bg-blue-500/10 text-blue-500 rounded"><Eye size={16}/></button>
                                    {currentUserRole !== 'supervisor' && (
                                        <>
                                        <button onClick={()=>abrirEditar(v)} className="p-2 bg-amber-500/10 text-amber-500 rounded"><Edit size={16}/></button>
                                        <button onClick={()=>abrirPagar(v)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded"><DollarSign size={16}/></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </>
        )}

        {/* OTRAS VISTAS SIMPLIFICADAS */}
        {view === 'reportes' && <div className={`${theme.card} p-6 rounded-xl border`}><h3>Gráfico Mensual</h3><SimpleBarChart data={reportData.daily} isDark={darkMode}/></div>}
        
        {view === 'equipo' && (
            <div>
                <button onClick={()=>abrirUsuario()} className="bg-amber-500 text-black px-4 py-2 rounded mb-4 font-bold flex gap-2 items-center"><Plus size={16}/> Nuevo Usuario</button>
                <div className="grid gap-4">{usuarios.map(u => (
                    <div key={u.id} className={`${theme.card} p-4 rounded-xl border flex justify-between items-center`}>
                        <div><div className="font-bold">{u.nombre} {u.apellidos}</div><div className="text-xs opacity-50">{u.rol}</div></div>
                        {currentUserRole === 'admin' && <div className="flex gap-2"><button onClick={()=>abrirUsuario(u)} className="text-amber-500"><Edit size={16}/></button><button onClick={()=>toggleUserStatus(u)} className={u.activo?'text-rose-500':'text-green-500'}><Power size={16}/></button></div>}
                    </div>
                ))}</div>
            </div>
        )}

        {view === 'cursos' && (
             <div>
                <form onSubmit={handleAddCurso} className="flex gap-2 mb-4"><input placeholder="Nuevo curso..." value={nuevoCurso.nombre} onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})} className={`flex-1 border p-2 rounded ${theme.input}`}/><button className="bg-amber-500 text-black px-4 rounded font-bold">Agregar</button></form>
                <div className="grid gap-2">{cursos.map(c=><div key={c.id} className={`${theme.card} p-3 rounded border flex justify-between`}><span>{c.nombre}</span>{currentUserRole==='admin'&&<button onClick={()=>handleDelCurso(c.id)} className="text-rose-500"><Trash2 size={16}/></button>}</div>)}</div>
             </div>
        )}

      </main>

      {/* MODALES BASICOS (Contenido dinámico seguro) */}
      {(modalEditOpen || modalUserOpen || modalPayOpen) && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAllModals}><div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-lg`} onClick={e=>e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Formulario</h2>
            {modalEditOpen && <form onSubmit={guardarEdicion} className="space-y-3">
                <input value={editForm.nombre || ''} onChange={e=>setEditForm({...editForm, nombre:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Nombre"/>
                <input value={editForm.dni || ''} onChange={e=>setEditForm({...editForm, dni:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="DNI"/>
                <button className="w-full bg-amber-500 p-2 rounded text-black font-bold">Guardar</button>
            </form>}
            {modalPayOpen && <form onSubmit={registrarPago} className="space-y-3">
                <input value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Concepto"/>
                <input type="number" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Monto S/"/>
                <button className="w-full bg-emerald-500 p-2 rounded text-white font-bold">Registrar Pago</button>
            </form>}
            {modalUserOpen && <form onSubmit={guardarUsuario} className="space-y-3">
                <input value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Nombre"/>
                <input value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Email"/>
                <select value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`}><option value="promotor">Promotor</option><option value="admin">Admin</option><option value="supervisor">Supervisor</option></select>
                <button className="w-full bg-amber-500 p-2 rounded text-black font-bold">Guardar Usuario</button>
            </form>}
      </div></div>}

      {modalFichaOpen && <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={closeAllModals}><div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-3xl h-[80vh] overflow-y-auto`} onClick={e=>e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">{fichaData?.nombre}</h2>
        <p className="opacity-70 mb-6">DNI: {fichaData?.dni}</p>
        <div className="border-t pt-4">
            <h3 className="font-bold mb-2">Pagos</h3>
            {historialPagos.map(p=><div key={p.id} className="flex justify-between border-b py-2 text-sm"><span>{p.fecha_pago} - {p.concepto}</span><span className="text-emerald-500 font-bold">S/ {p.monto}</span></div>)}
        </div>
      </div></div>}
    </div>
  );
};

export default Dashboard;