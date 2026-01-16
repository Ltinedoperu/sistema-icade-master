import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, FileText, User, Plus, Trash2, Edit, X, DollarSign, Check, XCircle, BarChart3, TrendingUp, Users, Shield, Power, Eye, Download, Share2, Filter, PieChart, GraduationCap, Sun, Moon } from 'lucide-react';

// --- GRÁFICOS (Ajustado para contraste en ambos modos) ---
const SimpleBarChart = ({ data, darkMode }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className={`flex items-end gap-2 h-32 pt-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full bg-emerald-500/20 rounded-t hover:bg-emerald-500/40 transition-all relative group" style={{ height: `${(d.value / max) * 100}%` }}>
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded">{d.value}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('ventas');
  const [loading, setLoading] = useState(true);
  
  // --- TEMA (DARK / LIGHT) ---
  const [darkMode, setDarkMode] = useState(() => {
      const saved = localStorage.getItem('theme');
      return saved ? JSON.parse(saved) : true; // Por defecto Dark
  });

  const toggleTheme = () => {
      setDarkMode(prev => {
          const newState = !prev;
          localStorage.setItem('theme', JSON.stringify(newState));
          return newState;
      });
  };

  // Clases dinámicas basadas en el tema
  const theme = {
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-slate-50',
      text: darkMode ? 'text-slate-200' : 'text-slate-700',
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-200 shadow-sm',
      cardHeader: darkMode ? 'bg-[#0f1623] border-slate-800' : 'bg-slate-100 border-slate-200',
      input: darkMode ? 'bg-[#0B1120] border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500',
      tableHeader: darkMode ? 'bg-[#0f1623] text-amber-500 border-slate-700' : 'bg-slate-100 text-amber-600 border-slate-200',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-slate-50 border-slate-200',
      textSecondary: darkMode ? 'text-slate-400' : 'text-slate-500',
      title: darkMode ? 'text-white' : 'text-slate-900',
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-200',
      modalBg: darkMode ? 'bg-[#151e32]' : 'bg-white',
      accentText: darkMode ? 'text-amber-500' : 'text-amber-600'
  };

  // Datos
  const [currentUserRole, setCurrentUserRole] = useState('promotor');
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
  const [modalImgOpen, setModalImgOpen] = useState(false);
  const [imgPreview, setImgPreview] = useState({ url: '', tipo: '' });

  const [nuevoCurso, setNuevoCurso] = useState({ nivel: 'Inicial', nombre: '', tipo: 'General' });
  const [stats, setStats] = useState({ hoy: 0, mes: 0, total: 0 });
  const [reportData, setReportData] = useState({ daily: [] });

  useEffect(() => { 
      const role = localStorage.getItem('role') || 'promotor';
      setCurrentUserRole(role);
      fetchData(); 
      const handleEsc = (event) => { if (event.key === 'Escape') { closeAllModals(); }};
      window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const closeAllModals = () => {
      setModalEditOpen(false); setModalFichaOpen(false); setModalPayOpen(false); setModalUserOpen(false); setModalImgOpen(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: u } = await supabase.from('usuarios').select('*').order('rol', { ascending: true }); setUsuarios(u || []);
    const { data: v } = await supabase.from('clientes').select('*').order('created_at', { ascending: false }); setVentas(v || []); 
    calcularEstadisticas(v || []);
    const { data: c } = await supabase.from('cursos').select('*').order('created_at', { ascending: false }); setCursos(c || []);
    setLoading(false);
  };

  const obtenerNombreAsesor = (email, nombreGuardado) => {
    if (nombreGuardado) return nombreGuardado;
    const usuarioEncontrado = usuarios.find(u => u.email === email);
    return usuarioEncontrado ? usuarioEncontrado.nombre : (email?.split('@')[0] || 'Desc.');
  };

  const calcularEstadisticas = (data) => {
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

  // --- FILTROS ---
  const filteredVentas = ventas.filter(v => {
      const matchSearch = v.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || v.dni?.includes(searchTerm);
      const matchPromoter = filterPromoter ? v.promotor_email === filterPromoter : true;
      const matchCity = filterCity ? v.ciudad?.toLowerCase().includes(filterCity.toLowerCase()) : true;
      const matchUgel = filterUgel ? v.ugel?.toLowerCase().includes(filterUgel.toLowerCase()) : true;
      let matchDate = true;
      if (filterDateStart && filterDateEnd) {
          const d = new Date(v.created_at);
          const endDate = new Date(filterDateEnd); endDate.setHours(23,59,59);
          matchDate = d >= new Date(filterDateStart) && d <= endDate;
      }
      return matchSearch && matchPromoter && matchCity && matchUgel && matchDate;
  });

  // --- LÓGICA MODALES ---
  const abrirEditar = (venta) => { setEditForm(venta); setModalEditOpen(true); };
  const guardarEdicion = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('clientes').update({
        nombre: editForm.nombre, dni: editForm.dni, celular: editForm.celular, whatsapp: editForm.whatsapp,
        correo: editForm.correo, institucion: editForm.institucion, ugel: editForm.ugel, ciudad: editForm.ciudad,
        condicion_laboral: editForm.condicion_laboral, modalidad_pago: editForm.modalidad_pago, observaciones: editForm.observaciones,
        tipo_registro: editForm.tipo_registro, modalidad_estudio: editForm.modalidad_estudio, programa: editForm.programa,
        numero_ficha_fisica: editForm.numero_ficha_fisica
    }).eq('id', editForm.id);
    if (!error) { alert("Registro actualizado"); setModalEditOpen(false); fetchData(); } else { alert("Error: " + error.message); }
  };

  const abrirFicha = async (venta) => {
    setFichaData(venta); setModalFichaOpen(true);
    const { data } = await supabase.from('historial_pagos').select('*').eq('cliente_id', venta.id).order('fecha_pago', { ascending: true });
    setHistorialPagos(data || []);
  };

  const abrirPagar = (venta) => {
      setPayData(venta);
      const hoy = new Date().toISOString().split('T')[0];
      setNuevoPago({ concepto: '', monto: '', fecha_pago: hoy, medio_pago: 'Descuento por Planilla', material_entregado: false });
      setModalPayOpen(true);
  };
  const registrarPago = async (e) => {
      e.preventDefault(); if (!nuevoPago.concepto || !nuevoPago.monto) return alert("Faltan datos");
      const { error } = await supabase.from('historial_pagos').insert([{ cliente_id: payData.id, ...nuevoPago }]);
      if (!error) { 
          alert("Pago registrado."); 
          setModalPayOpen(false); 
          if(modalFichaOpen && fichaData?.id === payData.id) abrirFicha(payData); 
      } else { alert(error.message); }
  };

  const cambiarEstadoFicha = async (id, nuevoEstado) => {
      if(confirm(`¿Marcar como ${nuevoEstado}?`)) {
          const { error } = await supabase.from('clientes').update({ estado_ficha: nuevoEstado }).eq('id', id);
          if(!error) fetchData();
      }
  };

  const abrirVistaImagen = (url, tipo) => { setImgPreview({ url, tipo }); setModalImgOpen(true); };
  const descargarImagen = async (url) => { try { const res = await fetch(url); const blob = await res.blob(); const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.download = `ICADE_DOC.jpg`; document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (e) { alert("Error"); }};
  const compartirWhatsapp = (url) => { window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank'); };

  const abrirUsuario = (u=null) => { 
      if (u) setUserForm(u); else setUserForm({ id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true }); 
      setModalUserOpen(true); 
  };
  
  const guardarUsuario = async (e) => { 
      e.preventDefault(); 
      if (!userForm.dni) return alert("El DNI es obligatorio."); 
      const payload = { ...userForm, password: userForm.dni }; 
      if (!userForm.id) { 
          const { id, ...dataToSend } = payload;
          const { error } = await supabase.from('usuarios').insert([dataToSend]); 
          if (!error) { alert("Usuario Creado"); setModalUserOpen(false); fetchData(); } 
          else alert(error.message); 
      } else { 
          const { error } = await supabase.from('usuarios').update(payload).eq('id', userForm.id); 
          if (!error) { alert("Usuario Actualizado"); setModalUserOpen(false); fetchData(); } 
      } 
  };
  
  const toggleUserStatus = async (u) => { if(u.rol!=='admin' && confirm("¿Cambiar estado?")) { await supabase.from('usuarios').update({activo:!u.activo}).eq('id', u.id); fetchData(); }};
  const handleAddCurso = async (e) => { e.preventDefault(); if(nuevoCurso.nombre) { await supabase.from('cursos').insert([nuevoCurso]); setNuevoCurso({...nuevoCurso, nombre:''}); fetchData(); }};
  const handleDelCurso = async (id) => { if(confirm("¿Borrar?")) { await supabase.from('cursos').delete().eq('id', id); fetchData(); }};

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans pb-20 relative transition-colors duration-300`}>
      <nav className={`${theme.nav} shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 transition-colors`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-[#0B1120] font-bold text-xl -rotate-3">I</div>
            <div>
                <h1 className={`text-xl font-bold ${theme.title}`}>ICADE <span className="text-amber-500">ADMIN</span></h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Rol: {currentUserRole}</p>
            </div>
        </div>
        <div className="flex gap-4 overflow-x-auto items-center">
            {/* TEMA TOGGLE */}
            <button onClick={toggleTheme} className={`p-2 rounded-full border transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                {['ventas', 'reportes', 'cursos', 'equipo'].map(v => (
                     <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-sm font-bold whitespace-nowrap capitalize ${view === v ? 'bg-amber-500 text-[#0B1120]' : 'text-slate-400 hover:text-slate-500'}`}>{v}</button>
                ))}
            </div>
            <button onClick={handleLogout} className={`p-2 rounded-lg text-rose-400 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}><LogOut size={20} /></button>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto p-4 md:p-6">
        
        {view === 'ventas' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><TrendingUp size={24} /></div>
                    <div><p className={theme.textSecondary + " text-sm"}>Hoy</p><h3 className={`text-2xl font-bold ${theme.title}`}>{stats.hoy}</h3></div>
                </div>
                <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}>
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><BarChart3 size={24} /></div>
                    <div><p className={theme.textSecondary + " text-sm"}>Mes</p><h3 className={`text-2xl font-bold ${theme.title}`}>{stats.mes}</h3></div>
                </div>
                <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}>
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Users size={24} /></div>
                    <div><p className={theme.textSecondary + " text-sm"}>Total</p><h3 className={`text-2xl font-bold ${theme.title}`}>{stats.total}</h3></div>
                </div>
            </div>

            <div className={`${theme.card} p-4 rounded-2xl border mb-6 animate-fadeIn`}>
                <div className={`flex items-center gap-2 mb-3 ${theme.accentText} font-bold text-sm`}><Filter size={16}/> Filtros de Búsqueda</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={16}/><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${theme.input} rounded-xl py-2 px-4 pl-9 text-xs outline-none`}/></div>
                    <select value={filterPromoter} onChange={(e) => setFilterPromoter(e.target.value)} className={`${theme.input} rounded-xl py-2 px-3 text-xs outline-none`}><option value="">Todos los Promotores</option>{usuarios.filter(u => u.rol === 'promotor').map(u => (<option key={u.id} value={u.email}>{u.nombre} {u.apellidos}</option>))}</select>
                    <input type="text" placeholder="Ciudad" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className={`${theme.input} rounded-xl py-2 px-3 text-xs outline-none`}/>
                    <input type="text" placeholder="UGEL" value={filterUgel} onChange={(e) => setFilterUgel(e.target.value)} className={`${theme.input} rounded-xl py-2 px-3 text-xs outline-none`}/>
                    <div className="flex gap-1"><input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className={`w-1/2 ${theme.input} rounded-xl p-1 text-[10px] text-center`}/><input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className={`w-1/2 ${theme.input} rounded-xl p-1 text-[10px] text-center`}/></div>
                </div>
            </div>

            <div className={`${theme.card} rounded-2xl border overflow-hidden shadow-2xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className={`${theme.tableHeader} uppercase font-bold text-xs`}>
                            <tr>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} text-center`}>Estado</th>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Asesor</th>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Participante</th>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Laboral</th>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Pago</th>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>Programa</th>
                                <th className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} text-center`}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={darkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200'}>
                            {loading ? <tr><td colSpan="7" className="p-8 text-center text-slate-500">Cargando...</td></tr> : filteredVentas.map((venta) => (
                                <tr key={venta.id} className={`${theme.tableRow} transition-colors`}>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'} text-center`}>
                                        {currentUserRole !== 'supervisor' ? (
                                            <div className={`flex justify-center gap-1 mb-1 ${darkMode ? 'bg-[#0B1120]' : 'bg-slate-100'} p-1 rounded-lg border ${darkMode ? 'border-slate-700' : 'border-slate-200'} w-fit mx-auto`}>
                                                <button onClick={()=>cambiarEstadoFicha(venta.id, 'aprobado')} className={`p-1.5 rounded-md transition-all ${venta.estado_ficha === 'aprobado' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-500'}`} title="Aprobar"><Check size={14}/></button>
                                                <button onClick={()=>cambiarEstadoFicha(venta.id, 'rechazado')} className={`p-1.5 rounded-md transition-all ${venta.estado_ficha === 'rechazado' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-rose-500'}`} title="Rechazar"><XCircle size={14}/></button>
                                            </div>
                                        ) : null}
                                        <span className={`text-[9px] uppercase font-bold tracking-wider ${venta.estado_ficha==='aprobado'?'text-emerald-500':venta.estado_ficha==='rechazado'?'text-rose-500':'text-amber-500'}`}>{venta.estado_ficha || 'Pendiente'}</span>
                                    </td>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}><div className="flex flex-col"><span className={`${theme.title} font-mono`}>{new Date(venta.created_at).toLocaleDateString()}</span><span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-fit mt-1 uppercase">{obtenerNombreAsesor(venta.promotor_email, venta.promotor_nombre)}</span></div></td>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                                        <div className={`font-bold ${theme.title} flex items-center gap-2`}>{venta.nombre}</div>
                                        <div className={`text-xs ${theme.textSecondary}`}>{venta.dni}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">Ficha: {venta.numero_ficha_fisica || 'S/N'}</div>
                                    </td>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}><div className={theme.text}>{venta.condicion_laboral}</div><div className={`text-xs ${theme.textSecondary}`}>{venta.institucion}</div><div className="text-[10px] text-slate-500">{venta.ciudad}</div></td>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}><span className="px-2 py-1 rounded text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">{venta.modalidad_pago}</span></td>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'} text-xs text-slate-400 max-w-xs`}>
                                        <div className="text-amber-500 font-bold mb-1">{venta.tipo_registro}</div>
                                        {venta.modalidad_estudio === 'Acelerada' && <span className="bg-purple-500/20 text-purple-400 px-1 rounded border border-purple-500/30 text-[10px] mr-1">Acelerada</span>}
                                        <span className={`truncate block ${theme.textSecondary}`}>{venta.programa}</span>
                                    </td>
                                    <td className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-100'} text-center`}>
                                        <div className="flex justify-center gap-2">
                                            {/* Ver Ficha */}
                                            <button onClick={() => abrirFicha(venta)} className={`p-2 rounded border transition-colors ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white' : 'bg-blue-50 text-blue-500 border-blue-200 hover:bg-blue-500 hover:text-white'}`} title="Ver Ficha"><Eye size={16}/></button>
                                            
                                            {/* Acciones Bloqueadas para Supervisor */}
                                            {currentUserRole !== 'supervisor' && (
                                                <>
                                                    <button onClick={() => abrirEditar(venta)} className={`p-2 rounded border transition-colors ${darkMode ? 'bg-amber-900/30 text-amber-400 border-amber-500/50 hover:bg-amber-500 hover:text-black' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-500 hover:text-white'}`} title="Editar"><Edit size={16}/></button>
                                                    <button onClick={() => abrirPagar(venta)} className={`p-2 rounded border transition-colors ${darkMode ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500 hover:text-black' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-500 hover:text-white'}`} title="Pagar"><DollarSign size={16}/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </>
        )}

        {view === 'reportes' && (
            <div className="space-y-8 animate-fadeIn">
                <div className="flex justify-between items-center">
                    <h2 className={`text-2xl font-bold ${theme.title} flex items-center gap-2`}><PieChart className="text-amber-500"/> Reportes de Gestión</h2>
                    <div className="flex gap-2"><input type="date" className={`${theme.input} rounded p-2 text-xs`}/><input type="date" className={`${theme.input} rounded p-2 text-xs`}/></div>
                </div>
                <div className={`${theme.card} p-6 rounded-2xl border`}><h3 className={`${theme.title} font-bold mb-4`}>Ventas Diarias (Mes Actual)</h3><SimpleBarChart data={reportData.daily} darkMode={darkMode} /></div>
            </div>
        )}

        {view === 'equipo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`${theme.card} p-6 rounded-2xl border h-fit`}>
                    <h3 className={`text-xl font-bold ${theme.title} mb-4 flex items-center gap-2`}><Shield className="text-amber-500" /> Gestión de Equipo</h3>
                    {currentUserRole !== 'supervisor' && (
                        <button onClick={() => abrirUsuario()} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 w-full justify-center mb-4"><Plus size={20} /> Registrar Personal</button>
                    )}
                    <p className="text-xs text-slate-500 text-center">La clave de acceso será el número de DNI.</p>
                </div>
                <div className="lg:col-span-2 space-y-4">{usuarios.map(u => (<div key={u.id} className={`p-5 rounded-2xl border flex justify-between items-center ${!u.activo ? 'bg-slate-900/10 opacity-60' : theme.card}`}><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200 text-slate-700'} flex items-center justify-center font-bold text-white`}>{u.nombre?.charAt(0).toUpperCase()}</div><div><h4 className={`font-bold ${theme.title}`}>{u.nombre} {u.apellidos}</h4><p className="text-sm text-slate-400">{u.rol} • {u.dni}</p></div></div><div className="flex gap-2">
                    {/* Solo admin puede editar usuarios */}
                    {currentUserRole === 'admin' && (<><button onClick={() => abrirUsuario(u)} className="p-2 hover:bg-slate-700/20 rounded text-amber-500"><Edit size={16}/></button><button onClick={()=>toggleUserStatus(u)} className="p-2 hover:bg-slate-700/20 rounded text-rose-500"><Power size={16}/></button></>)}
                </div></div>))}</div>
            </div>
        )}

        {view === 'cursos' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`${theme.card} p-6 rounded-2xl border h-fit`}>
                    <h3 className={`text-xl font-bold ${theme.title} mb-4`}><Plus className="inline mr-2 text-amber-500"/> Nuevo Curso</h3>
                    {currentUserRole !== 'supervisor' && (
                        <form onSubmit={handleAddCurso} className="space-y-4"><select className={`w-full ${theme.input} rounded-xl p-3`} value={nuevoCurso.nivel} onChange={e=>setNuevoCurso({...nuevoCurso, nivel:e.target.value})}><option>Inicial</option><option>Primaria</option><option>Secundaria</option></select><input className={`w-full ${theme.input} rounded-xl p-3`} placeholder="Nombre del curso" value={nuevoCurso.nombre} onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})}/><button className="w-full bg-amber-600 p-3 rounded-xl font-bold text-white">Guardar</button></form>
                    )}
                </div>
                <div className="lg:col-span-2 space-y-2">{cursos.map(c=><div key={c.id} className={`${theme.card} p-4 rounded-xl border flex justify-between`}><div><span className="text-xs text-amber-500 block uppercase font-bold">{c.nivel}</span><span className={theme.title}>{c.nombre}</span></div>
                {currentUserRole === 'admin' && <button onClick={()=>handleDelCurso(c.id)} className="text-rose-500"><Trash2 size={18}/></button>}
                </div>)}</div>
             </div>
        )}
      </main>

      {/* ================= MODALES ================= */}
      
      {/* 1. EDITAR REGISTRO */}
      {modalEditOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalEditOpen(false)}></div>
            <div className={`${theme.modalBg} w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto z-10`}>
                <button onClick={() => setModalEditOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-white hover:bg-rose-600 transition-colors z-20"><X size={20}/></button>
                <h3 className={`text-xl font-bold ${theme.title} mb-6 flex items-center gap-2 mt-2`}><Edit className="text-amber-500"/> Editar Registro</h3>
                <form onSubmit={guardarEdicion} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Nombre</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})}/></div>
                        <div><label className="text-xs text-slate-400 ml-1">DNI</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.dni} onChange={e=>setEditForm({...editForm, dni:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Tipo</label><select className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.tipo_registro} onChange={e=>setEditForm({...editForm, tipo_registro:e.target.value})}><option>Diplomado</option><option>Especialización</option><option>Curso de Capacitación</option><option>Curso de Actualización</option><option>Nombramiento Docente</option><option>Ascenso Docente</option></select></div>
                        <div><label className="text-xs text-slate-400 ml-1">Modalidad</label><select className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.modalidad_estudio} onChange={e=>setEditForm({...editForm, modalidad_estudio:e.target.value})}><option>Programa Completo</option><option>Acelerada</option></select></div>
                    </div>
                    <div><label className="text-xs text-slate-400 ml-1">Cursos Inscritos (Programa)</label><textarea className={`w-full ${theme.input} rounded-xl p-3 h-24 text-sm font-mono`} value={editForm.programa || ''} onChange={e=>setEditForm({...editForm, programa:e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Celular</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.celular} onChange={e=>setEditForm({...editForm, celular:e.target.value})}/></div>
                        <div><label className="text-xs text-slate-400 ml-1">WhatsApp</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.whatsapp} onChange={e=>setEditForm({...editForm, whatsapp:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Centro Laboral</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.institucion} onChange={e=>setEditForm({...editForm, institucion:e.target.value})}/></div>
                        <div><label className="text-xs text-slate-400 ml-1">UGEL</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.ugel} onChange={e=>setEditForm({...editForm, ugel:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Ficha Física</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.numero_ficha_fisica} onChange={e=>setEditForm({...editForm, numero_ficha_fisica:e.target.value})}/></div>
                        <div><label className="text-xs text-slate-400 ml-1">Ciudad</label><input className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.ciudad} onChange={e=>setEditForm({...editForm, ciudad:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Condición</label><select className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.condicion_laboral} onChange={e=>setEditForm({...editForm, condicion_laboral:e.target.value})}><option>Nombrado</option><option>Contratado</option><option>Sin Vínculo</option></select></div>
                        <div><label className="text-xs text-slate-400 ml-1">Pago</label><select className={`w-full ${theme.input} rounded-xl p-3`} value={editForm.modalidad_pago} onChange={e=>setEditForm({...editForm, modalidad_pago:e.target.value})}><option>Pago a Cuenta</option><option>Descuento por Planilla</option></select></div>
                    </div>
                    <div><label className="text-xs text-slate-400 ml-1">Observaciones</label><textarea className={`w-full ${theme.input} rounded-xl p-3 h-24`} value={editForm.observaciones || ''} onChange={e=>setEditForm({...editForm, observaciones:e.target.value})}/></div>
                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2">Guardar Cambios</button>
                </form>
            </div>
        </div>
      )}

      {/* 2. FICHA COMPLETA */}
      {modalFichaOpen && fichaData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setModalFichaOpen(false)}></div>
            <div className={`${theme.modalBg} w-full max-w-5xl rounded-3xl border border-slate-700 shadow-2xl relative my-8 overflow-y-auto max-h-[95vh] z-10 flex flex-col`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme.cardHeader} rounded-t-3xl sticky top-0 z-20`}>
                    <div>
                        <h2 className={`text-2xl font-bold ${theme.title} flex items-center gap-2`}><GraduationCap className="text-amber-500"/> {fichaData.tipo_registro}: {fichaData.nombre}</h2>
                        <p className="text-slate-400 text-sm flex gap-2"><span>{fichaData.dni}</span> • <span className="text-emerald-500 font-bold">{fichaData.modalidad_estudio}</span></p>
                    </div>
                    <button onClick={() => setModalFichaOpen(false)} className="p-2 bg-slate-800 rounded-full text-white hover:bg-rose-600 transition-colors"><X size={24}/></button>
                </div>
                
                <div className="p-8 space-y-8 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-amber-500 font-bold uppercase text-xs border-b border-slate-700 pb-2">Datos Personales</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500 block">Celular</span> <span className={theme.title}>{fichaData.celular}</span></div>
                                <div><span className="text-slate-500 block">WhatsApp</span> <span className={theme.title}>{fichaData.whatsapp || '-'}</span></div>
                                <div className="col-span-2"><span className="text-slate-500 block">Correo</span> <span className={theme.title}>{fichaData.correo || '-'}</span></div>
                                <div className="col-span-2"><span className="text-slate-500 block">Dirección</span> <span className={theme.title}>{fichaData.direccion || '-'}</span></div>
                                <div><span className="text-slate-500 block">Ciudad</span> <span className={theme.title}>{fichaData.ciudad || '-'}</span></div>
                                <div><span className="text-slate-500 block">Ficha Física</span> <span className={`${theme.title} font-bold`}>{fichaData.numero_ficha_fisica || 'N/A'}</span></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-amber-500 font-bold uppercase text-xs border-b border-slate-700 pb-2">Información Laboral</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-slate-500 block">Condición</span> <span className={theme.title}>{fichaData.condicion_laboral}</span></div>
                                <div><span className="text-slate-500 block">Nivel</span> <span className={theme.title}>{fichaData.nivel || '-'}</span></div>
                                <div className="col-span-2"><span className="text-slate-500 block">Centro Laboral</span> <span className={theme.title}>{fichaData.institucion || 'Sin IE'}</span></div>
                                <div className="col-span-2"><span className="text-slate-500 block">UGEL / DRE</span> <span className={theme.title}>{fichaData.ugel || '-'}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-amber-500 font-bold uppercase text-xs border-b border-slate-700 pb-2">Academico y Documentos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <span className="text-slate-500 block text-xs">Cursos Inscritos</span>
                                <p className={`${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'} p-3 rounded text-sm mt-1 border border-slate-700`}>{fichaData.programa}</p>
                                <div className="mt-4 flex gap-4">
                                    {fichaData.foto_dni_url && <button onClick={()=>abrirVistaImagen(fichaData.foto_dni_url, 'DNI')} className="text-blue-400 hover:text-white border border-blue-900 bg-blue-900/20 px-3 py-1 rounded text-xs flex items-center gap-2"><User size={14}/> Ver DNI</button>}
                                    {fichaData.foto_contrato_url && <button onClick={()=>abrirVistaImagen(fichaData.foto_contrato_url, 'Contrato')} className="text-amber-400 hover:text-white border border-amber-900 bg-amber-900/20 px-3 py-1 rounded text-xs flex items-center gap-2"><FileText size={14}/> Ver Contrato</button>}
                                </div>
                            </div>
                            <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-500/20">
                                <h5 className="text-emerald-500 font-bold text-xs uppercase mb-2">Resumen Financiero</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500 block">Modalidad</span> <span className={theme.title}>{fichaData.modalidad_pago}</span></div>
                                    <div><span className="text-slate-500 block">Total Pactado</span> <span className="text-amber-500 font-bold">S/ {fichaData.total_pagar || '0.00'}</span></div>
                                    <div><span className="text-slate-500 block">Cuotas</span> <span className={theme.title}>{fichaData.num_cuotas || '1'}</span></div>
                                    <div><span className="text-slate-500 block">Mensualidad</span> <span className={theme.title}>S/ {fichaData.monto_mensual || '0.00'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-end pb-4">
                            <h3 className={`text-xl font-bold ${theme.title} flex items-center gap-2`}><DollarSign className="text-emerald-500"/> Historial de Pagos</h3>
                            <span className="text-xl font-bold text-emerald-500">Total Pagado: S/ {historialPagos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0).toFixed(2)}</span>
                        </div>
                        <div className={`overflow-hidden rounded-xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <table className="w-full text-sm text-left">
                                <thead className={theme.tableHeader}><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Medio</th><th className="px-4 py-3 text-right">Monto</th></tr></thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-800 bg-[#151e32]' : 'divide-slate-200 bg-white'}`}>
                                    {historialPagos.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-slate-500 italic">No hay pagos registrados aún.</td></tr> : 
                                    historialPagos.map((pago) => (
                                        <tr key={pago.id} className={`${theme.tableRow} transition-colors`}>
                                            <td className={`${theme.textSecondary} font-mono text-xs px-4 py-3`}>{pago.fecha_pago}</td>
                                            <td className={`px-4 py-3 font-bold ${theme.title}`}>{pago.concepto}</td>
                                            <td className="px-4 py-3"><span className={`text-[10px] ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'} px-2 py-0.5 rounded border`}>{pago.medio_pago}</span></td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-500 font-bold">S/ {parseFloat(pago.monto).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 3. PAGAR */}
      {modalPayOpen && payData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setModalPayOpen(false)}></div>
            <div className={`${theme.modalBg} w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl p-6 relative z-10`}>
                <button onClick={() => setModalPayOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-white hover:bg-rose-600 transition-colors"><X size={20}/></button>
                <div className="mb-6">
                    <h2 className={`text-2xl font-bold ${theme.title} flex items-center gap-2`}><DollarSign className="text-emerald-500"/> Registrar Pago</h2>
                    <p className="text-slate-400 text-sm mt-1 font-mono">{payData.nombre} • DNI: {payData.dni}</p>
                </div>
                <form onSubmit={registrarPago} className="space-y-4 bg-emerald-900/10 p-6 rounded-2xl border border-emerald-500/20">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] text-slate-400 uppercase font-bold">Concepto (Mes)</label><input className={`w-full ${theme.input} rounded-lg p-3 text-sm`} placeholder="Ej. Enero 2026" value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} required/></div>
                        <div className="space-y-1"><label className="text-[10px] text-slate-400 uppercase font-bold">Monto (S/)</label><input type="number" step="0.01" className={`w-full ${theme.input} rounded-lg p-3 text-sm font-bold text-emerald-500`} placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} required/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] text-slate-400 uppercase font-bold">Medio de Pago</label>
                        <select className={`w-full ${theme.input} rounded-lg p-3 text-sm`} value={nuevoPago.medio_pago} onChange={e=>setNuevoPago({...nuevoPago, medio_pago:e.target.value})}>
                            <option>Descuento por Planilla</option><option>Yape</option><option>Plin</option><option>BCP</option><option>Banco de la Nación</option><option>Interbank</option><option>BBVA</option><option>Efectivo</option><option>Otro</option>
                        </select></div>
                        <div className="space-y-1"><label className="text-[10px] text-slate-400 uppercase font-bold">Fecha de Pago</label><input type="date" className={`w-full ${theme.input} rounded-lg p-3 text-sm`} value={nuevoPago.fecha_pago} onChange={e=>setNuevoPago({...nuevoPago, fecha_pago:e.target.value})} required/></div>
                    </div>
                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center gap-2 mt-2 shadow-lg shadow-emerald-900/20"><Plus size={18}/> Agregar Pago</button>
                </form>
            </div>
        </div>
      )}

      {/* 4. MODAL USUARIO */}
      {modalUserOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setModalUserOpen(false)}></div>
            <div className={`${theme.modalBg} w-full max-w-lg rounded-3xl border border-slate-700 p-8 relative z-10 shadow-2xl`}>
                <button onClick={() => setModalUserOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-white"><X size={20}/></button>
                <h3 className={`${theme.title} font-bold text-xl mb-6 flex items-center gap-2`}><User className="text-amber-500"/> {userForm.id ? 'Editar Personal' : 'Nuevo Integrante'}</h3>
                <form onSubmit={guardarUsuario} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">Nombres</label><input className={`w-full ${theme.input} p-3 rounded-xl`} value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} required/></div>
                        <div><label className="text-xs text-slate-400 ml-1">Apellidos</label><input className={`w-full ${theme.input} p-3 rounded-xl`} value={userForm.apellidos} onChange={e=>setUserForm({...userForm, apellidos:e.target.value})} required/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 ml-1">DNI (Será la clave)</label><input className={`w-full ${theme.input} p-3 rounded-xl`} value={userForm.dni} onChange={e=>setUserForm({...userForm, dni:e.target.value})} required/></div>
                        <div><label className="text-xs text-slate-400 ml-1">Celular</label><input className={`w-full ${theme.input} p-3 rounded-xl`} value={userForm.celular} onChange={e=>setUserForm({...userForm, celular:e.target.value})} required/></div>
                    </div>
                    <div><label className="text-xs text-slate-400 ml-1">Correo Electrónico</label><input type="email" className={`w-full ${theme.input} p-3 rounded-xl`} value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} required/></div>
                    
                    <div>
                        <label className="text-xs text-slate-400 ml-1">Rol de Acceso</label>
                        <select className={`w-full ${theme.input} p-3 rounded-xl outline-none`} value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})}>
                            <option value="promotor">Promotor (Ventas)</option>
                            <option value="supervisor">Supervisor (Solo Lectura)</option>
                            <option value="admin">Administrador (Total)</option>
                        </select>
                    </div>

                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4 shadow-lg">Guardar Datos</button>
                </form>
            </div>
        </div>
      )}

      {/* 5. VISOR IMAGEN */}
      {modalImgOpen && imgPreview.url && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95" onClick={() => setModalImgOpen(false)}></div>
            <div className="relative w-full max-w-3xl h-[80vh] flex items-center justify-center z-20"><img src={imgPreview.url} className="max-w-full max-h-full object-contain shadow-2xl"/></div>
            <div className="flex gap-4 mt-4 z-20"><button onClick={() => compartirWhatsapp(imgPreview.url)} className="bg-[#25D366] text-white px-6 py-2 rounded-full font-bold flex gap-2 items-center"><Share2 size={18}/> Enviar</button><button onClick={() => descargarImagen(imgPreview.url)} className="bg-amber-500 text-black px-6 py-2 rounded-full font-bold flex gap-2 items-center"><Download size={18}/> Descargar</button><button onClick={() => setModalImgOpen(false)} className="bg-slate-700 text-white px-6 py-2 rounded-full font-bold flex gap-2 items-center"><X size={18}/> Cerrar</button></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;