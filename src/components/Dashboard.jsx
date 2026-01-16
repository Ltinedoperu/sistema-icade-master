import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, User, Plus, Trash2, Edit, X, BarChart3, TrendingUp, Users, Shield, Power, Eye, DollarSign, Check, XCircle, PieChart, Filter, GraduationCap, Calendar, MapPin, Briefcase, CreditCard } from 'lucide-react';

// --- GRÁFICOS (Versión Estable) ---
const SimpleBarChart = ({ data }) => {
    const safeData = data && Array.isArray(data) ? data : [];
    const valores = safeData.map(d => d.value || 0);
    const max = valores.length > 0 ? Math.max(...valores) : 1;

    return (
        <div className="flex items-end gap-2 h-40 pt-6 border-b border-slate-700">
            {safeData.map((d, i) => {
                let porcentaje = 0;
                if (max > 0) porcentaje = ((d.value || 0) / max) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="w-full bg-emerald-500 rounded-t-md opacity-70 hover:opacity-100 transition-all" style={{ height: `${porcentaje}%` }}></div>
                        <span className="text-[10px] text-slate-500 truncate w-full text-center">{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('ventas');
  const [loading, setLoading] = useState(true);
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
      const role = localStorage.getItem('role') || 'promotor';
      setCurrentUserRole(role);
      fetchData();
  }, []);

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
    // Gráfico simple
    const days = {};
    data.filter(v => new Date(v.created_at).getMonth() === esteMes).forEach(v => {
        const d = new Date(v.created_at).getDate();
        days[d] = (days[d] || 0) + 1;
    });
    setReportData({ daily: Object.keys(days).map(k => ({ label: k, value: days[k] })) });
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

  // Acciones
  const abrirEditar = (v) => { setEditForm(v); setModalEditOpen(true); };
  
  const guardarEdicion = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('clientes').update(editForm).eq('id', editForm.id);
    if (!error) { alert("Guardado"); setModalEditOpen(false); fetchData(); }
  };

  const abrirFicha = async (v) => {
    setFichaData(v);
    setHistorialPagos([]); // Limpiar previo
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
    <div className="min-h-screen font-sans pb-20 bg-[#0B1120] text-slate-200">
      
      {/* NAVBAR */}
      <nav className="bg-[#151e32] border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-[#0B1120] font-bold text-xl">I</div>
            <div>
                <h1 className="text-xl font-bold text-white">ICADE <span className="text-amber-500">ADMIN</span></h1>
                <p className="text-[10px] uppercase font-bold text-slate-500">{currentUserRole}</p>
            </div>
        </div>
        <div className="flex gap-3">
             <div className="flex p-1 rounded-xl border bg-[#0f1623] border-slate-800">
             {['ventas', 'reportes', 'equipo', 'cursos'].map(v => (
                 <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize ${view === v ? 'bg-amber-500 text-[#0B1120]' : 'text-slate-500 hover:text-white'}`}>{v}</button>
             ))}
          </div>
          <button onClick={handleLogout} className="p-2.5 rounded-xl text-rose-500 border border-slate-700 bg-slate-800 hover:bg-rose-500 hover:text-white"><LogOut size={20}/></button>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto p-4 md:p-6">
        {loading ? <p className="text-center p-10 opacity-50">Cargando sistema...</p> : (
            <>
            {/* VISTA VENTAS */}
            {view === 'ventas' && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-[#151e32] border border-slate-800 p-5 rounded-2xl flex items-center gap-4"><div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><TrendingUp/></div><div><p className="text-xs font-bold uppercase text-slate-500">Hoy</p><h3 className="text-2xl font-bold text-white">{stats.hoy}</h3></div></div>
                    <div className="bg-[#151e32] border border-slate-800 p-5 rounded-2xl flex items-center gap-4"><div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Calendar/></div><div><p className="text-xs font-bold uppercase text-slate-500">Mes</p><h3 className="text-2xl font-bold text-white">{stats.mes}</h3></div></div>
                    <div className="bg-[#151e32] border border-slate-800 p-5 rounded-2xl flex items-center gap-4"><div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Users/></div><div><p className="text-xs font-bold uppercase text-slate-500">Total</p><h3 className="text-2xl font-bold text-white">{stats.total}</h3></div></div>
                </div>

                <div className="bg-[#151e32] border border-slate-800 p-4 rounded-2xl mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2 relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={18}/><input placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-2 pl-10 text-white"/></div>
                        <select value={filterPromoter} onChange={e=>setFilterPromoter(e.target.value)} className="bg-[#0B1120] border border-slate-700 rounded-xl p-2 text-white"><option value="">Todos los Asesores</option>{usuarios.filter(u=>u.rol==='promotor').map(u=><option key={u.id} value={u.email}>{u.nombre}</option>)}</select>
                        <input placeholder="Ciudad" value={filterCity} onChange={e=>setFilterCity(e.target.value)} className="bg-[#0B1120] border border-slate-700 rounded-xl p-2 text-white"/>
                        <div className="flex gap-2"><input type="date" value={filterDateStart} onChange={e=>setFilterDateStart(e.target.value)} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-2 text-white"/><input type="date" value={filterDateEnd} onChange={e=>setFilterDateEnd(e.target.value)} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-2 text-white"/></div>
                    </div>
                </div>

                <div className="bg-[#151e32] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#0f1623] text-amber-500 uppercase font-bold text-xs"><tr><th className="p-4 text-center">Estado</th><th className="p-4">Asesor</th><th className="p-4">Alumno</th><th className="p-4">Laboral</th><th className="p-4">Programa</th><th className="p-4 text-center">Acciones</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredVentas.map(v => (
                                    <tr key={v.id} className="hover:bg-[#1a253a] border-slate-800">
                                        <td className="p-4 text-center">
                                            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${v.estado_ficha==='aprobado'?'text-emerald-500':v.estado_ficha==='rechazado'?'text-rose-500':'text-amber-500'}`}>{v.estado_ficha || 'Pendiente'}</span>
                                            {currentUserRole !== 'supervisor' && <div className="flex justify-center gap-1 mt-1"><button onClick={()=>cambiarEstadoFicha(v.id, 'aprobado')} className="text-slate-500 hover:text-emerald-500"><Check size={14}/></button><button onClick={()=>cambiarEstadoFicha(v.id, 'rechazado')} className="text-slate-500 hover:text-rose-500"><XCircle size={14}/></button></div>}
                                        </td>
                                        <td className="p-4"><div className="flex flex-col"><span className="text-slate-500 font-mono text-xs">{new Date(v.created_at).toLocaleDateString()}</span><span className="text-xs font-bold text-emerald-500 uppercase">{obtenerNombreAsesor(v.promotor_email)}</span></div></td>
                                        <td className="p-4"><div className="font-bold text-white">{v.nombre}</div><div className="text-xs text-slate-500">{v.dni}</div><div className="text-[10px] text-slate-600">{v.ciudad}</div></td>
                                        <td className="p-4"><div className="text-slate-300">{v.condicion_laboral}</div><div className="text-xs text-slate-500">{v.institucion}</div></td>
                                        <td className="p-4 max-w-xs"><div className="text-amber-500 font-bold text-[10px] uppercase">{v.tipo_registro}</div><div className="truncate text-xs text-slate-400">{v.programa}</div></td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button onClick={()=>abrirFicha(v)} className="p-2 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"><Eye size={16}/></button>
                                            {currentUserRole !== 'supervisor' && <><button onClick={()=>abrirEditar(v)} className="p-2 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black"><Edit size={16}/></button><button onClick={()=>abrirPagar(v)} className="p-2 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white"><DollarSign size={16}/></button></>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            )}
            
            {/* OTRAS VISTAS */}
            {view === 'reportes' && <div className="bg-[#151e32] border border-slate-800 p-6 rounded-2xl"><h3 className="font-bold text-white mb-4">Ventas Diarias</h3><SimpleBarChart data={reportData.daily} /></div>}
            
            {view === 'equipo' && <div className="grid gap-4">{usuarios.map(u=><div key={u.id} className="bg-[#151e32] border border-slate-800 p-4 rounded-xl flex justify-between items-center"><div><div className="font-bold text-white">{u.nombre}</div><div className="text-xs text-slate-500">{u.rol} • {u.dni}</div></div>{currentUserRole==='admin'&&<button onClick={()=>abrirUsuario(u)} className="text-amber-500"><Edit/></button>}</div>)}<button onClick={()=>abrirUsuario()} className="fixed bottom-6 right-6 bg-amber-500 text-black p-4 rounded-full shadow-lg"><Plus/></button></div>}
            
            {view === 'cursos' && <div className="grid gap-4">{currentUserRole!=='supervisor'&&<form onSubmit={handleAddCurso} className="flex gap-2"><input value={nuevoCurso.nombre} onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})} className="bg-[#0B1120] border border-slate-700 p-2 rounded w-full text-white" placeholder="Nuevo curso..."/><button className="bg-amber-500 px-4 rounded font-bold text-black">Agregar</button></form>}{cursos.map(c=><div key={c.id} className="bg-[#151e32] border border-slate-800 p-3 rounded flex justify-between"><span>{c.nombre}</span>{currentUserRole==='admin'&&<button onClick={()=>handleDelCurso(c.id)} className="text-rose-500"><Trash2 size={16}/></button>}</div>)}</div>}
            </>
        )}
      </main>

      {/* MODALES CLÁSICOS */}
      {modalEditOpen && editForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className="bg-[#151e32] border border-slate-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between mb-4"><h3 className="font-bold text-xl text-white">Editar</h3><button onClick={closeAllModals}><X/></button></div>
                <form onSubmit={guardarEdicion} className="space-y-3">
                    <input value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="Nombre"/>
                    <input value={editForm.dni} onChange={e=>setEditForm({...editForm, dni:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="DNI"/>
                    <input value={editForm.celular} onChange={e=>setEditForm({...editForm, celular:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="Celular"/>
                    <button className="w-full bg-amber-500 p-2 rounded font-bold text-black mt-2">Guardar Cambios</button>
                </form>
            </div>
        </div>
      )}

      {modalFichaOpen && fichaData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className="bg-[#151e32] border border-slate-700 p-6 rounded-2xl w-full max-w-3xl h-[80vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                    <div><h2 className="text-2xl font-bold text-white">{fichaData.nombre}</h2><p className="text-slate-400">{fichaData.dni}</p></div>
                    <button onClick={closeAllModals}><X className="text-white"/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
                    <div><h4 className="font-bold uppercase text-amber-500 mb-2">Datos</h4><p>Cel: {fichaData.celular}</p><p>Email: {fichaData.correo}</p></div>
                    <div><h4 className="font-bold uppercase text-amber-500 mb-2">Ubicación</h4><p>{fichaData.ciudad}</p><p>{fichaData.institucion}</p></div>
                </div>
                <div className="bg-[#0B1120] p-4 rounded-xl border border-slate-700 mb-6"><h4 className="font-bold text-amber-500 text-xs uppercase">Programa</h4><p className="text-lg font-bold text-white">{fichaData.programa}</p></div>
                <div className="border-t border-slate-700 pt-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-white"><DollarSign className="text-emerald-500"/> Pagos</h3>
                    {historialPagos.length === 0 ? <p className="text-slate-500 italic">No hay pagos.</p> : (
                        <table className="w-full text-sm">
                            <thead className="text-left text-slate-500"><tr><th>Fecha</th><th>Concepto</th><th className="text-right">Monto</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {historialPagos.map(p=>(
                                    <tr key={p.id} className="py-2">
                                        <td className="py-2 text-slate-400">{p.fecha_pago}</td>
                                        <td className="font-bold text-white">{p.concepto}</td>
                                        <td className="text-right text-emerald-500 font-bold">S/ {parseFloat(p.monto).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      )}

      {modalPayOpen && payData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className="bg-[#151e32] border border-slate-700 p-6 rounded-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4 text-white">Registrar Pago</h3>
                <form onSubmit={registrarPago} className="space-y-3">
                    <input value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="Concepto" required/>
                    <input type="number" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="Monto" required/>
                    <button className="w-full bg-emerald-500 text-white font-bold p-2 rounded">Guardar Pago</button>
                </form>
            </div>
        </div>
      )}

      {modalUserOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
            <div className="bg-[#151e32] border border-slate-700 p-6 rounded-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
                <h3 className="font-bold text-xl mb-4 text-white">Usuario</h3>
                <form onSubmit={guardarUsuario} className="space-y-3">
                    <input value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="Nombre"/>
                    <input value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white" placeholder="Email"/>
                    <select value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 p-2 rounded text-white"><option value="promotor">Promotor</option><option value="admin">Admin</option></select>
                    <button className="w-full bg-amber-500 font-bold p-2 rounded text-black">Guardar</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;