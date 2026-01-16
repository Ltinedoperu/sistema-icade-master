import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, User, Plus, Trash2, Edit, X, BarChart3, TrendingUp, Users, Shield, Power, Eye, DollarSign, Check, XCircle, PieChart, Filter, Sun, Moon, GraduationCap, Calendar, MapPin, Briefcase, CreditCard, Phone, Mail } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
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
  
  // Ficha (Corrección aquí)
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

  useEffect(() => {
      const role = localStorage.getItem('role') || 'promotor';
      setCurrentUserRole(role);
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') setDarkMode(false);
      fetchData();
  }, []);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- TEMA (SOLUCIÓN AL BLANCO EXCESIVO) ---
  const theme = {
      // Fondo general gris suave en modo claro para contraste
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-slate-100', 
      // Textos más oscuros en modo claro
      text: darkMode ? 'text-slate-200' : 'text-slate-900',
      textSec: darkMode ? 'text-slate-400' : 'text-slate-600',
      // Tarjetas blancas con bordes más definidos en modo claro
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      // Inputs con bordes grises más visibles
      input: darkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-white border-slate-400 text-slate-900',
      tableHeader: darkMode ? 'bg-[#0f1623]' : 'bg-slate-200 text-slate-800',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-slate-50 border-slate-300',
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-white border-slate-300',
      btnGhost: darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100',
  };

  const closeAllModals = () => {
      setModalEditOpen(false); setModalFichaOpen(false); setModalPayOpen(false); setModalUserOpen(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: u } = await supabase.from('usuarios').select('*'); setUsuarios(u || []);
        const { data: v } = await supabase.from('clientes').select('*').order('created_at', { ascending: false }); setVentas(v || []); 
        calcularEstadisticas(v || []);
        const { data: c } = await supabase.from('cursos').select('*').order('created_at', { ascending: false }); setCursos(c || []);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const obtenerNombreAsesor = (email) => {
    if (!usuarios.length) return email;
    const u = usuarios.find(x => x.email === email);
    return u ? u.nombre : email?.split('@')[0];
  };

  const calcularEstadisticas = (data) => {
    const hoy = new Date().toLocaleDateString();
    const esteMes = new Date().getMonth();
    setStats({
        hoy: data.filter(v => new Date(v.created_at).toLocaleDateString() === hoy).length,
        mes: data.filter(v => new Date(v.created_at).getMonth() === esteMes).length,
        total: data.length
    });
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const filteredVentas = ventas.filter(v => {
      const matchSearch = (v.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || (v.dni || '').includes(searchTerm);
      const matchPromoter = filterPromoter ? v.promotor_email === filterPromoter : true;
      const matchCity = filterCity ? (v.ciudad || '').toLowerCase().includes(filterCity.toLowerCase()) : true;
      const matchUgel = filterUgel ? (v.ugel || '').toLowerCase().includes(filterUgel.toLowerCase()) : true;
      let matchDate = true;
      if (filterDateStart && filterDateEnd) {
          const d = new Date(v.created_at);
          const end = new Date(filterDateEnd); end.setHours(23,59,59);
          matchDate = d >= new Date(filterDateStart) && d <= end;
      }
      return matchSearch && matchPromoter && matchCity && matchUgel && matchDate;
  });

  const abrirEditar = (v) => { setEditForm(v); setModalEditOpen(true); };
  const guardarEdicion = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('clientes').update(editForm).eq('id', editForm.id);
    if (!error) { alert("Guardado"); setModalEditOpen(false); fetchData(); }
  };

  // --- SOLUCIÓN AL ERROR DE FICHA ---
  const abrirFicha = async (v) => {
    setFichaData(v);
    setHistorialPagos([]); // Limpiar para evitar errores de renderizado
    setModalFichaOpen(true);
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
      if (!error) { alert("Pago OK"); setModalPayOpen(false); if(modalFichaOpen) abrirFicha(payData); fetchData(); }
  };

  const cambiarEstadoFicha = async (id, est) => { if(confirm("¿Cambiar estado?")) { await supabase.from('clientes').update({ estado_ficha: est }).eq('id', id); fetchData(); }};
  const abrirUsuario = (u=null) => { setUserForm(u || { id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true }); setModalUserOpen(true); };
  const guardarUsuario = async (e) => { e.preventDefault(); const p = { ...userForm, password: userForm.dni }; if(!userForm.id) await supabase.from('usuarios').insert([{...p, id: undefined}]); else await supabase.from('usuarios').update(p).eq('id', userForm.id); setModalUserOpen(false); fetchData(); };
  const toggleUserStatus = async (u) => { if(u.rol!=='admin' && confirm("¿Cambiar acceso?")) { await supabase.from('usuarios').update({activo:!u.activo}).eq('id', u.id); fetchData(); }};
  const handleAddCurso = async (e) => { e.preventDefault(); await supabase.from('cursos').insert([nuevoCurso]); setNuevoCurso({...nuevoCurso, nombre:''}); fetchData(); };
  const handleDelCurso = async (id) => { if(confirm("¿Borrar?")) { await supabase.from('cursos').delete().eq('id', id); fetchData(); }};

  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      <nav className={`${theme.nav} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 border-b`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-[#0B1120] font-bold text-xl">I</div>
            <div>
                <h1 className="text-xl font-bold">ICADE <span className="text-amber-500">ADMIN</span></h1>
                <p className={`text-[10px] uppercase font-bold ${theme.textSec}`}>{currentUserRole}</p>
            </div>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleTheme} className={`p-2 rounded border ${theme.btnGhost}`}>{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          <button onClick={handleLogout} className={`p-2 rounded border text-rose-500 ${theme.btnGhost}`}><LogOut size={20}/></button>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto p-4 md:p-6">
        {loading ? <p className="text-center p-10 opacity-50">Cargando...</p> : (
            <>
            {/* STATS */}
            {view === 'ventas' && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><TrendingUp/></div><div><p className={`text-xs font-bold uppercase ${theme.textSec}`}>Hoy</p><h3 className="text-2xl font-bold">{stats.hoy}</h3></div></div>
                    <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Calendar/></div><div><p className={`text-xs font-bold uppercase ${theme.textSec}`}>Mes</p><h3 className="text-2xl font-bold">{stats.mes}</h3></div></div>
                    <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Users/></div><div><p className={`text-xs font-bold uppercase ${theme.textSec}`}>Total</p><h3 className="text-2xl font-bold">{stats.total}</h3></div></div>
                </div>

                <div className={`${theme.card} p-4 rounded-2xl border mb-6`}>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2 relative"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><input placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={`w-full border rounded-xl py-2 pl-10 ${theme.input}`}/></div>
                        <select value={filterPromoter} onChange={e=>setFilterPromoter(e.target.value)} className={`border rounded-xl p-2 ${theme.input}`}><option value="">Todos los Asesores</option>{usuarios.filter(u=>u.rol==='promotor').map(u=><option key={u.id} value={u.email}>{u.nombre}</option>)}</select>
                        <input placeholder="Ciudad" value={filterCity} onChange={e=>setFilterCity(e.target.value)} className={`border rounded-xl p-2 ${theme.input}`}/>
                        <div className="flex gap-2"><input type="date" value={filterDateStart} onChange={e=>setFilterDateStart(e.target.value)} className={`w-full border rounded-xl p-2 ${theme.input}`}/><input type="date" value={filterDateEnd} onChange={e=>setFilterDateEnd(e.target.value)} className={`w-full border rounded-xl p-2 ${theme.input}`}/></div>
                    </div>
                </div>

                <div className={`${theme.card} rounded-2xl border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className={theme.tableHeader}><tr><th className="p-4">Estado</th><th className="p-4">Asesor</th><th className="p-4">Alumno</th><th className="p-4">Programa</th><th className="p-4 text-center">Acciones</th></tr></thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                                {filteredVentas.map(v => (
                                    <tr key={v.id} className={theme.tableRow}>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${v.estado_ficha==='aprobado'?'bg-emerald-500/10 text-emerald-500':v.estado_ficha==='rechazado'?'bg-rose-500/10 text-rose-500':'bg-amber-500/10 text-amber-500'}`}>{v.estado_ficha || 'Pendiente'}</span>
                                            {currentUserRole !== 'supervisor' && <div className="flex gap-1 mt-1"><button onClick={()=>cambiarEstadoFicha(v.id, 'aprobado')} className="text-emerald-500 hover:bg-emerald-500/20 p-1 rounded"><Check size={14}/></button><button onClick={()=>cambiarEstadoFicha(v.id, 'rechazado')} className="text-rose-500 hover:bg-rose-500/20 p-1 rounded"><XCircle size={14}/></button></div>}
                                        </td>
                                        <td className="p-4"><div className="flex flex-col"><span className={`text-xs ${theme.textSec}`}>{new Date(v.created_at).toLocaleDateString()}</span><span className="text-xs font-bold text-emerald-500">{obtenerNombreAsesor(v.promotor_email)}</span></div></td>
                                        <td className="p-4"><div className="font-bold">{v.nombre}</div><div className={`text-xs ${theme.textSec}`}>{v.dni}</div><div className={`text-[10px] ${theme.textSec}`}>{v.ciudad}</div></td>
                                        <td className="p-4 max-w-xs"><div className="text-amber-500 font-bold text-xs">{v.tipo_registro}</div><div className="truncate text-xs">{v.programa}</div></td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button onClick={()=>abrirFicha(v)} className={`p-2 rounded border ${theme.btnGhost}`}><Eye size={16} className="text-blue-500"/></button>
                                            {currentUserRole !== 'supervisor' && <><button onClick={()=>abrirEditar(v)} className={`p-2 rounded border ${theme.btnGhost}`}><Edit size={16} className="text-amber-500"/></button><button onClick={()=>abrirPagar(v)} className={`p-2 rounded border ${theme.btnGhost}`}><DollarSign size={16} className="text-emerald-500"/></button></>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            )}
            
            {view === 'equipo' && <div className="grid gap-4">{usuarios.map(u=><div key={u.id} className={`${theme.card} p-4 rounded-xl border flex justify-between items-center`}><div><div className="font-bold">{u.nombre}</div><div className={`text-xs ${theme.textSec}`}>{u.rol} • {u.dni}</div></div>{currentUserRole==='admin'&&<button onClick={()=>abrirUsuario(u)}><Edit className="text-amber-500"/></button>}</div>)}<button onClick={()=>abrirUsuario()} className="fixed bottom-6 right-6 bg-amber-500 text-black p-4 rounded-full shadow-lg"><Plus/></button></div>}
            
            {view === 'cursos' && <div className="grid gap-4">{currentUserRole!=='supervisor'&&<form onSubmit={handleAddCurso} className="flex gap-2"><input value={nuevoCurso.nombre} onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})} className={`border p-2 rounded w-full ${theme.input}`} placeholder="Nuevo curso..."/><button className="bg-amber-500 px-4 rounded font-bold">Agregar</button></form>}{cursos.map(c=><div key={c.id} className={`${theme.card} p-3 rounded border flex justify-between`}><span>{c.nombre}</span>{currentUserRole==='admin'&&<button onClick={()=>handleDelCurso(c.id)} className="text-rose-500"><Trash2 size={16}/></button>}</div>)}</div>}
            </>
        )}
      </main>

      {/* MODALES */}
      {/* 1. EDITAR */}
      {modalEditOpen && editForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-lg shadow-2xl border ${darkMode?'border-slate-700':'border-slate-300'}`} onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4">Editar</h3>
                <form onSubmit={guardarEdicion} className="space-y-3">
                    <input value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Nombre"/>
                    <input value={editForm.dni} onChange={e=>setEditForm({...editForm, dni:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="DNI"/>
                    <input value={editForm.celular} onChange={e=>setEditForm({...editForm, celular:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Celular"/>
                    <button className="w-full bg-amber-500 p-2 rounded font-bold mt-2">Guardar</button>
                </form>
            </div>
        </div>
      )}

      {/* 2. FICHA (SOLUCIÓN PANTALLA AZUL: Renderizado Condicional Seguro) */}
      {modalFichaOpen && fichaData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-3xl h-[80vh] overflow-y-auto shadow-2xl border ${darkMode?'border-slate-700':'border-slate-300'}`} onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div><h2 className="text-2xl font-bold">{fichaData.nombre}</h2><p className={theme.textSec}>{fichaData.dni}</p></div>
                    <button onClick={closeAllModals}><X/></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div><h4 className={`font-bold uppercase text-xs mb-2 ${theme.textSec}`}>Datos</h4><p>Cel: {fichaData.celular}</p><p>Email: {fichaData.correo}</p></div>
                    <div><h4 className={`font-bold uppercase text-xs mb-2 ${theme.textSec}`}>Ubicación</h4><p>{fichaData.ciudad}</p><p>{fichaData.institucion}</p></div>
                </div>
                
                <div className={`p-4 rounded-xl border mb-6 ${darkMode?'bg-slate-800/50 border-slate-700':'bg-slate-50 border-slate-200'}`}>
                    <h4 className="font-bold text-amber-500 text-xs uppercase">Programa</h4>
                    <p className="text-lg font-bold">{fichaData.programa}</p>
                </div>

                <div className="border-t pt-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><DollarSign className="text-emerald-500"/> Pagos</h3>
                    {historialPagos.length === 0 ? <p className="text-slate-500 italic">No hay pagos registrados.</p> : (
                        <table className="w-full text-sm">
                            <thead className="text-left opacity-50"><tr><th>Fecha</th><th>Concepto</th><th className="text-right">Monto</th></tr></thead>
                            <tbody className="divide-y divide-slate-700/20">
                                {historialPagos.map(p=>(
                                    <tr key={p.id} className="py-2">
                                        <td className="py-2">{p.fecha_pago}</td>
                                        <td className="font-bold">{p.concepto}</td>
                                        <td className="text-right text-emerald-500 font-bold">S/ {parseFloat(p.monto).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot><tr><td colSpan="3" className="text-right pt-4 font-bold text-lg">Total: S/ {historialPagos.reduce((a,b)=>a+(parseFloat(b.monto)||0),0).toFixed(2)}</td></tr></tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* 3. PAGAR */}
      {modalPayOpen && payData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-md`} onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4">Registrar Pago</h3>
                <form onSubmit={registrarPago} className="space-y-3">
                    <input value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Concepto" required/>
                    <input type="number" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Monto" required/>
                    <button className="w-full bg-emerald-500 text-white font-bold p-2 rounded">Guardar Pago</button>
                </form>
            </div>
        </div>
      )}

      {/* 4. USUARIO */}
      {modalUserOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className={`${theme.modalBg} p-6 rounded-2xl w-full max-w-md`} onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4">Usuario</h3>
                <form onSubmit={guardarUsuario} className="space-y-3">
                    <input value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Nombre"/>
                    <input value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`} placeholder="Email"/>
                    <select value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})} className={`w-full border p-2 rounded ${theme.input}`}><option value="promotor">Promotor</option><option value="admin">Admin</option></select>
                    <button className="w-full bg-amber-500 font-bold p-2 rounded">Guardar</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;