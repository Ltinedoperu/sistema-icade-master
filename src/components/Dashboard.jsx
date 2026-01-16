import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, User, Plus, Trash2, Edit, X, BarChart3, TrendingUp, Users, Shield, Power, Eye, DollarSign, Check, XCircle, PieChart as PieChartIcon, Filter, Sun, Moon, GraduationCap, Calendar, Phone, Mail, MapPin, Briefcase, CreditCard } from 'lucide-react';

// --- GRÁFICOS (Contrastes mejorados) ---
const SimpleBarChart = ({ data, isDark }) => {
    const safeData = data && Array.isArray(data) ? data : [];
    const valores = safeData.map(d => d.value || 0);
    const max = valores.length > 0 ? Math.max(...valores) : 1;

    return (
        <div className={`flex items-end gap-2 h-40 pt-6 border-b ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
            {safeData.map((d, i) => {
                let porcentaje = 0;
                if (max > 0) porcentaje = ((d.value || 0) / max) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="w-full bg-emerald-500 rounded-t-md transition-all duration-500 relative group hover:bg-emerald-400" style={{ height: `${porcentaje}%`, opacity: 0.8 }}>
                            <span className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 ${isDark ? 'text-white bg-slate-800' : 'text-white bg-slate-800'}`}>
                                {d.value}
                            </span>
                        </div>
                        <span className={`text-[10px] font-bold truncate w-full text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {d.label || '-'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [errorFatal, setErrorFatal] = useState(null);
  const [view, setView] = useState('ventas');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('promotor');
  
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

  // Modales
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [fichaData, setFichaData] = useState(null);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [modalPayOpen, setModalPayOpen] = useState(false);
  const [payData, setPayData] = useState(null);
  const [nuevoPago, setNuevoPago] = useState({ concepto: '', monto: '', fecha_pago: '', medio_pago: 'Descuento por Planilla', material_entregado: false });
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true });
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
      } catch (err) { setErrorFatal("Error de conexión"); }
      const handleEsc = (event) => { if (event.key === 'Escape') { closeAllModals(); }};
      window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- TEMA DEFINITIVO (Alto Contraste en Light Mode) ---
  const theme = {
      // Fondo: Oscuro vs Gris Azulado Suave (No blanco puro)
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-slate-100',
      
      // Texto: Blanco vs Gris Oscuro (Casi negro)
      textMain: darkMode ? 'text-slate-200' : 'text-slate-800',
      textSec: darkMode ? 'text-slate-400' : 'text-slate-600',
      textAccent: darkMode ? 'text-amber-500' : 'text-amber-600',
      
      // Tarjetas: Bordes más definidos en modo claro
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      
      // Modales
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-white border-slate-300 shadow-2xl',
      modalHeader: darkMode ? 'bg-[#0f1623] border-slate-800' : 'bg-slate-50 border-slate-200',

      // Inputs: Bordes fuertes en modo claro
      input: darkMode 
          ? 'bg-[#0B1120] border-slate-700 text-white placeholder-slate-500' 
          : 'bg-white border-slate-400 text-slate-900 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500',
      inputLabel: darkMode ? 'text-slate-400' : 'text-slate-700 font-bold',

      // Tablas
      tableHeader: darkMode ? 'bg-[#0f1623] text-amber-500' : 'bg-slate-200 text-slate-800 border-b border-slate-300',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-amber-50 border-slate-300',
      tableDivide: darkMode ? 'divide-slate-800' : 'divide-slate-300',
      
      // Botones
      btnGhost: darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100',
      btnAction: darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700',
  };

  const closeAllModals = () => { setModalEditOpen(false); setModalFichaOpen(false); setModalPayOpen(false); setModalUserOpen(false); };

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: u } = await supabase.from('usuarios').select('*'); setUsuarios(u || []);
        const { data: v } = await supabase.from('clientes').select('*').order('created_at', { ascending: false }); setVentas(v || []); 
        calcularEstadisticas(v || []);
        const { data: c } = await supabase.from('cursos').select('*').order('created_at', { ascending: false }); setCursos(c || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // FUNCIÓN BLINDADA (Aquí estaba el error de la ficha)
  const obtenerNombreAsesor = (email) => {
    if (!email) return 'Sin Asignar';
    if (!usuarios || usuarios.length === 0) return email.split('@')[0]; // Fallback seguro
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
    const days = {};
    ventasMes.forEach(v => { const d = new Date(v.created_at).getDate(); days[d] = (days[d] || 0) + 1; });
    setReportData({ daily: Object.keys(days).map(k => ({ label: k, value: days[k] })) });
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const filteredVentas = ventas.filter(v => {
      if (!v) return false;
      const term = searchTerm.toLowerCase();
      const matchSearch = (v.nombre?.toLowerCase() || '').includes(term) || (v.dni || '').includes(term);
      const matchPromoter = filterPromoter ? v.promotor_email === filterPromoter : true;
      const matchCity = filterCity ? (v.ciudad?.toLowerCase() || '').includes(filterCity.toLowerCase()) : true;
      const matchUgel = filterUgel ? (v.ugel?.toLowerCase() || '').includes(filterUgel.toLowerCase()) : true;
      let matchDate = true;
      if (filterDateStart && filterDateEnd) {
          const d = new Date(v.created_at);
          const end = new Date(filterDateEnd); end.setHours(23,59,59);
          matchDate = d >= new Date(filterDateStart) && d <= end;
      }
      return matchSearch && matchPromoter && matchCity && matchUgel && matchDate;
  });

  const abrirEditar = (v) => { setEditForm(v || {}); setModalEditOpen(true); };
  const guardarEdicion = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('clientes').update({
        nombre: editForm.nombre, dni: editForm.dni, celular: editForm.celular, whatsapp: editForm.whatsapp,
        correo: editForm.correo, institucion: editForm.institucion, ugel: editForm.ugel, ciudad: editForm.ciudad,
        condicion_laboral: editForm.condicion_laboral, modalidad_pago: editForm.modalidad_pago, observaciones: editForm.observaciones,
        tipo_registro: editForm.tipo_registro, modalidad_estudio: editForm.modalidad_estudio, programa: editForm.programa,
        numero_ficha_fisica: editForm.numero_ficha_fisica
    }).eq('id', editForm.id);
    if (!error) { alert("Actualizado"); setModalEditOpen(false); fetchData(); } else { alert(error.message); }
  };

  const abrirFicha = async (v) => {
    if (!v) return;
    setFichaData(v); setModalFichaOpen(true);
    const { data } = await supabase.from('historial_pagos').select('*').eq('cliente_id', v.id);
    setHistorialPagos(data || []);
  };

  const abrirPagar = (v) => {
      setPayData(v);
      setNuevoPago({ concepto: '', monto: '', fecha_pago: new Date().toISOString().split('T')[0], medio_pago: 'Descuento por Planilla', material_entregado: false });
      setModalPayOpen(true);
  };
  const registrarPago = async (e) => {
      e.preventDefault(); 
      const { error } = await supabase.from('historial_pagos').insert([{ cliente_id: payData.id, ...nuevoPago }]);
      if (!error) { alert("Pago registrado"); setModalPayOpen(false); if(modalFichaOpen) abrirFicha(payData); fetchData(); }
  };

  const cambiarEstadoFicha = async (id, est) => { if(confirm("¿Cambiar estado?")) { await supabase.from('clientes').update({ estado_ficha: est }).eq('id', id); fetchData(); }};
  const abrirUsuario = (u=null) => { setUserForm(u || { id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true }); setModalUserOpen(true); };
  const guardarUsuario = async (e) => { e.preventDefault(); const payload = { ...userForm, password: userForm.dni }; if(!userForm.id) await supabase.from('usuarios').insert([{...payload, id: undefined}]); else await supabase.from('usuarios').update(payload).eq('id', userForm.id); setModalUserOpen(false); fetchData(); };
  const toggleUserStatus = async (u) => { if(u.rol!=='admin' && confirm("¿Cambiar acceso?")) { await supabase.from('usuarios').update({activo:!u.activo}).eq('id', u.id); fetchData(); }};
  const handleAddCurso = async (e) => { e.preventDefault(); if(nuevoCurso.nombre) { await supabase.from('cursos').insert([nuevoCurso]); setNuevoCurso({...nuevoCurso, nombre:''}); fetchData(); }};
  const handleDelCurso = async (id) => { if(confirm("¿Borrar?")) { await supabase.from('cursos').delete().eq('id', id); fetchData(); }};

  if (errorFatal) return <div className="p-10 text-center"><h1 className="text-xl font-bold">Error de conexión</h1><button onClick={handleLogout} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Reiniciar</button></div>;

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${theme.bg} ${theme.textMain}`}>
      <nav className={`${theme.nav} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 border-b`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-[#0B1120] font-black text-xl shadow-lg">I</div>
            <div>
                <h1 className={`text-xl font-black ${theme.textMain}`}>ICADE <span className={theme.textAccent}>MANAGER</span></h1>
                <p className={`text-[10px] uppercase font-bold ${theme.textSec}`}>{currentUserRole}</p>
            </div>
        </div>
        <div className="flex gap-3 items-center flex-wrap justify-center">
          <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all ${theme.btnGhost}`}>{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          <div className={`flex p-1 rounded-xl border ${darkMode ? 'bg-[#0f1623] border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
             {['ventas', 'reportes', 'equipo', 'cursos'].map(v => (
                 <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${view === v ? 'bg-amber-500 text-[#0B1120] shadow-sm' : `${theme.textSec} hover:text-slate-900`}`}>{v}</button>
             ))}
          </div>
          <button onClick={handleLogout} className={`p-2.5 rounded-xl text-rose-500 border transition-all ${theme.btnGhost}`}><LogOut size={20}/></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
        {loading && <div className="text-center py-10 opacity-50 font-bold">Cargando sistema...</div>}

        {!loading && view === 'ventas' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`${theme.card} p-6 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><TrendingUp size={28}/></div><div><p className={`text-xs font-bold uppercase ${theme.textSec}`}>Ventas Hoy</p><h3 className={`text-3xl font-black ${theme.textMain}`}>{stats.hoy}</h3></div></div>
                    <div className={`${theme.card} p-6 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl"><Calendar size={28}/></div><div><p className={`text-xs font-bold uppercase ${theme.textSec}`}>Este Mes</p><h3 className={`text-3xl font-black ${theme.textMain}`}>{stats.mes}</h3></div></div>
                    <div className={`${theme.card} p-6 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl"><Briefcase size={28}/></div><div><p className={`text-xs font-bold uppercase ${theme.textSec}`}>Total</p><h3 className={`text-3xl font-black ${theme.textMain}`}>{stats.total}</h3></div></div>
                </div>

                <div className={`${theme.card} p-5 rounded-2xl border mb-6`}>
                    <div className={`flex items-center gap-2 mb-4 font-bold text-sm uppercase ${theme.textAccent}`}><Filter size={16}/> Filtros Avanzados</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="relative md:col-span-2"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full border rounded-xl py-3 px-4 pl-10 text-sm outline-none ${theme.input}`}/></div>
                        <select value={filterPromoter} onChange={(e) => setFilterPromoter(e.target.value)} className={`border rounded-xl py-3 px-4 text-sm outline-none ${theme.input}`}><option value="">Todos los Asesores</option>{usuarios.filter(u => u.rol === 'promotor').map(u => (<option key={u.id} value={u.email}>{u.nombre}</option>))}</select>
                        <input type="text" placeholder="Ciudad..." value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className={`border rounded-xl py-3 px-4 text-sm outline-none ${theme.input}`}/>
                        <div className="flex gap-2"><input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className={`w-full border rounded-xl p-2 text-xs text-center outline-none ${theme.input}`}/><input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className={`w-full border rounded-xl p-2 text-xs text-center outline-none ${theme.input}`}/></div>
                    </div>
                </div>

                <div className={`${theme.card} rounded-2xl border overflow-hidden shadow-sm`}>
                    <div className="overflow-x-auto">
                        <table className={`w-full text-sm text-left border-collapse ${theme.tableDivide}`}>
                            <thead className={theme.tableHeader}><tr><th className="px-6 py-4 text-center">Estado</th><th className="px-6 py-4">Fecha / Asesor</th><th className="px-6 py-4">Alumno</th><th className="px-6 py-4">Laboral</th><th className="px-6 py-4">Programa</th><th className="px-6 py-4 text-center">Acciones</th></tr></thead>
                            <tbody className={`divide-y ${theme.tableDivide}`}>
                                {filteredVentas.map((venta) => (
                                <tr key={venta.id} className={theme.tableRow}>
                                    <td className="px-6 py-4 text-center"><div className="flex flex-col items-center gap-2"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${venta.estado_ficha==='aprobado'?'bg-emerald-100 text-emerald-700 border-emerald-200':venta.estado_ficha==='rechazado'?'bg-rose-100 text-rose-700 border-rose-200':'bg-amber-100 text-amber-700 border-amber-200'}`}>{venta.estado_ficha || 'Pendiente'}</span>{currentUserRole!=='supervisor'&&( <div className="flex gap-1"><button onClick={()=>cambiarEstadoFicha(venta.id, 'aprobado')} className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"><Check size={14}/></button><button onClick={()=>cambiarEstadoFicha(venta.id, 'rechazado')} className="p-1 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white"><XCircle size={14}/></button></div>)}</div></td>
                                    <td className="px-6 py-4"><div className="flex flex-col"><span className={`font-mono text-xs ${theme.textSec}`}>{new Date(venta.created_at).toLocaleDateString()}</span><span className="text-xs font-bold text-emerald-600">{obtenerNombreAsesor(venta.promotor_email)}</span></div></td>
                                    <td className="px-6 py-4"><div className={`font-bold ${theme.textMain}`}>{venta.nombre} {venta.apellidos}</div><div className={`text-xs ${theme.textSec}`}>{venta.dni}</div></td>
                                    <td className="px-6 py-4"><div className={`text-xs ${theme.textMain}`}>{venta.condicion_laboral}</div><div className={`text-[10px] ${theme.textSec}`}>{venta.ciudad}</div></td>
                                    <td className="px-6 py-4 max-w-[200px]"><div className={`text-[10px] font-bold uppercase ${theme.textAccent}`}>{venta.tipo_registro}</div><div className={`text-xs truncate ${theme.textMain}`}>{venta.programa}</div></td>
                                    <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2">
                                        <button onClick={()=>abrirFicha(venta)} className={`p-2 rounded border shadow-sm ${theme.btnAction}`}><Eye size={16} className="text-blue-500"/></button>
                                        {currentUserRole!=='supervisor'&&(<><button onClick={()=>abrirEditar(venta)} className={`p-2 rounded border shadow-sm ${theme.btnAction}`}><Edit size={16} className="text-amber-500"/></button><button onClick={()=>abrirPagar(venta)} className={`p-2 rounded border shadow-sm ${theme.btnAction}`}><DollarSign size={16} className="text-emerald-500"/></button></>)}
                                    </div></td>
                                </tr>))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {view === 'reportes' && (
            <div className={`${theme.card} p-6 rounded-2xl border`}>
                <h3 className={`text-xl font-bold mb-6 ${theme.textMain}`}>Ventas Diarias (Mes Actual)</h3>
                <SimpleBarChart data={reportData.daily} isDark={darkMode} />
            </div>
        )}

        {view === 'equipo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${theme.card} p-6 rounded-2xl border h-fit`}>
                    <h3 className={`text-xl font-black mb-4 ${theme.textMain}`}>Gestión de Equipo</h3>
                    {currentUserRole!=='supervisor'&&<button onClick={()=>abrirUsuario()} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl mb-4 flex justify-center gap-2"><Plus size={20}/> Nuevo Usuario</button>}
                </div>
                <div className="lg:col-span-2 space-y-3">{usuarios.map(u=>(<div key={u.id} className={`${theme.card} p-4 rounded-xl border flex justify-between items-center ${!u.activo?'opacity-50':''}`}><div><h4 className={`font-bold ${theme.textMain}`}>{u.nombre} {u.apellidos}</h4><p className={`text-xs ${theme.textSec}`}>{u.rol} • {u.dni}</p></div>{currentUserRole==='admin'&&<button onClick={()=>abrirUsuario(u)} className="text-amber-500"><Edit size={18}/></button>}</div>))}</div>
            </div>
        )}

        {view === 'cursos' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`${theme.card} p-6 rounded-2xl border h-fit`}>
                    <h3 className={`text-xl font-black mb-4 ${theme.textMain}`}>Cursos</h3>
                    {currentUserRole!=='supervisor'&&<form onSubmit={handleAddCurso} className="space-y-3"><select className={`w-full border rounded-lg p-2 ${theme.input}`} value={nuevoCurso.nivel} onChange={e=>setNuevoCurso({...nuevoCurso, nivel:e.target.value})}><option value="Inicial">Inicial</option><option value="Primaria">Primaria</option></select><input className={`w-full border rounded-lg p-2 ${theme.input}`} placeholder="Nombre..." value={nuevoCurso.nombre} onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})}/><button className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg">Guardar</button></form>}
                </div>
                <div className="lg:col-span-2 grid gap-3 grid-cols-1 sm:grid-cols-2">{cursos.map(c=>(<div key={c.id} className={`${theme.card} p-4 rounded-xl border flex justify-between`}><div><span className={`text-[10px] font-bold uppercase block ${theme.textAccent}`}>{c.nivel}</span><span className={theme.textMain}>{c.nombre}</span></div>{currentUserRole==='admin'&&<button onClick={()=>handleDelCurso(c.id)}><Trash2 size={16} className="text-slate-400 hover:text-rose-500"/></button>}</div>))}</div>
             </div>
        )}
      </main>

      {/* MODALES CORREGIDOS (Fondo de alto contraste en Light Mode) */}
      {modalFichaOpen && fichaData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAllModals}></div>
            <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl relative my-8 overflow-hidden flex flex-col max-h-[95vh] z-10 ${theme.modalBg}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme.modalHeader}`}>
                    <div><h2 className={`text-2xl font-black ${theme.textMain}`}>{fichaData.nombre}</h2><p className={`text-sm ${theme.textSec}`}>{fichaData.dni}</p></div>
                    <button onClick={closeAllModals} className={`p-2 rounded-full ${theme.btnGhost}`}><X size={24}/></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                        <h4 className={`text-xs font-black uppercase mb-2 ${theme.textAccent}`}>Programa</h4>
                        <p className={`text-lg font-bold leading-tight ${theme.textMain}`}>{fichaData.programa}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><h4 className={`text-xs font-black uppercase border-b pb-2 mb-3 ${theme.textSec}`}>Contacto</h4><p className={theme.textMain}>Cel: {fichaData.celular}</p><p className={theme.textMain}>Email: {fichaData.correo}</p></div>
                        <div><h4 className={`text-xs font-black uppercase border-b pb-2 mb-3 ${theme.textSec}`}>Ubicación</h4><p className={theme.textMain}>{fichaData.ciudad}</p><p className={theme.textMain}>{fichaData.institucion}</p></div>
                    </div>
                    <div className={`pt-4 border-t ${darkMode?'border-slate-700':'border-slate-300'}`}>
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme.textMain}`}><DollarSign className="text-emerald-500"/> Pagos</h3>
                         {historialPagos.length===0?<p className="text-slate-500 italic">Sin pagos.</p>:<table className={`w-full text-sm ${theme.tableDivide}`}><thead className={theme.tableHeader}><tr><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Concepto</th><th className="p-2 text-right">Monto</th></tr></thead><tbody className={`divide-y ${theme.tableDivide}`}>{historialPagos.map(p=>(<tr key={p.id}><td className={`p-2 ${theme.textSec}`}>{p.fecha_pago}</td><td className={`p-2 font-bold ${theme.textMain}`}>{p.concepto}</td><td className="p-2 text-right font-black text-emerald-500">S/ {p.monto}</td></tr>))}</tbody></table>}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* OTROS MODALES (Simplificados visualmente) */}
      {(modalEditOpen || modalUserOpen || modalPayOpen) && <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeAllModals}><div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-lg shadow-2xl border ${darkMode?'border-slate-700':'border-slate-300'}`} onClick={e=>e.stopPropagation()}>
            <h2 className={`text-xl font-black mb-4 ${theme.textMain}`}>Formulario</h2>
            {modalEditOpen && <form onSubmit={guardarEdicion} className="space-y-3">
                <input value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`} placeholder="Nombre"/>
                <input value={editForm.dni} onChange={e=>setEditForm({...editForm, dni:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`} placeholder="DNI"/>
                <input value={editForm.celular} onChange={e=>setEditForm({...editForm, celular:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`} placeholder="Celular"/>
                <button className="w-full bg-amber-500 p-3 rounded-lg font-bold text-white mt-2">Guardar Cambios</button>
            </form>}
            {modalPayOpen && <form onSubmit={registrarPago} className="space-y-3">
                <input value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`} placeholder="Concepto"/>
                <input type="number" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input} text-emerald-500 font-bold`} placeholder="Monto S/"/>
                <button className="w-full bg-emerald-500 p-3 rounded-lg font-bold text-white mt-2">Registrar Pago</button>
            </form>}
             {modalUserOpen && <form onSubmit={guardarUsuario} className="space-y-3">
                <input value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`} placeholder="Nombre"/>
                <input value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`} placeholder="Email"/>
                 <select value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})} className={`w-full border rounded-lg p-3 ${theme.input}`}><option value="promotor">Promotor</option><option value="admin">Admin</option></select>
                <button className="w-full bg-amber-500 p-3 rounded-lg font-bold text-white mt-2">Guardar Usuario</button>
            </form>}
      </div></div>}
    </div>
  );
};
export default Dashboard;