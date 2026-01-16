import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, FileText, User, RefreshCw, Plus, Trash2, Layers, Briefcase, MapPin, Edit, X, Save, MessageCircle, BarChart3, TrendingUp, Users, Shield, Power, Lock, Eye, Download, Share2, ExternalLink, DollarSign, Package, CheckCircle, Calendar, GraduationCap, Zap, PieChart, Filter, Check, XCircle, CreditCard, Building, Sun, Moon } from 'lucide-react';

// --- GRÁFICOS (Adaptados al Tema) ---
const SimpleBarChart = ({ data, isDark }) => {
    const safeData = data || [];
    const valores = safeData.map(d => d.value);
    const max = valores.length > 0 ? Math.max(...valores) : 1;

    return (
        <div className={`flex items-end gap-2 h-32 pt-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
            {safeData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div 
                        className="w-full bg-emerald-500 rounded-t hover:bg-emerald-400 transition-all relative group opacity-60 hover:opacity-100" 
                        style={{ height: `${(d.value / max) * 100}%` }}
                    >
                        <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1 rounded ${isDark ? 'text-white bg-black' : 'text-slate-800 bg-white border shadow-sm'}`}>
                            {d.value}
                        </span>
                    </div>
                    <span className={`text-[10px] truncate w-full text-center ${isDark ? 'text-slate-500' : 'text-slate-600 font-bold'}`}>
                        {d.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('ventas');
  const [loading, setLoading] = useState(true);
  
  // --- TEMA: INICIAR EN DARK POR DEFECTO ---
  const [darkMode, setDarkMode] = useState(true);

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
      
      // Recuperar tema guardado
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') setDarkMode(false);

      fetchData(); 
      const handleEsc = (event) => { if (event.key === 'Escape') { closeAllModals(); }};
      window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- PALETA DE COLORES (Aquí está la magia del diseño) ---
  const theme = {
      // Fondo General: Gris muy suave en modo claro para descansar la vista
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-slate-100',
      // Texto Principal
      text: darkMode ? 'text-slate-200' : 'text-slate-800',
      // Texto Secundario
      textSec: darkMode ? 'text-slate-400' : 'text-slate-500',
      // Tarjetas: Blancas con borde definido en modo claro
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      // Navbar
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      // Inputs (Cajas de texto)
      input: darkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-white border-slate-400 text-slate-900',
      // Tablas
      tableHeader: darkMode ? 'bg-[#0f1623] text-amber-500' : 'bg-slate-200 text-slate-800 border-b border-slate-300',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-amber-50 border-slate-300',
      // Modales
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-white border-slate-300',
      // Botones secundarios
      btnGhost: darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100',
  };

  const closeAllModals = () => {
      setModalEditOpen(false); setModalFichaOpen(false); setModalPayOpen(false); setModalUserOpen(false); setModalImgOpen(false);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: u } = await supabase.from('usuarios').select('*').order('rol', { ascending: true }); setUsuarios(u || []);
        const { data: v } = await supabase.from('clientes').select('*').order('created_at', { ascending: false }); setVentas(v || []); 
        calcularEstadisticas(v || []);
        const { data: c } = await supabase.from('cursos').select('*').order('created_at', { ascending: false }); setCursos(c || []);
    } catch(e) { console.error(e); }
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
    setHistorialPagos([]); // Limpieza anti-crash
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
    <div className={`min-h-screen font-sans pb-20 relative transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      
      {/* NAVBAR */}
      <nav className={`${theme.nav} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 border-b transition-colors duration-300`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-[#0B1120] font-bold text-xl -rotate-3">I</div>
            <div>
                <h1 className="text-xl font-bold">ICADE <span className="text-amber-500">ADMIN</span></h1>
                <p className={`text-[10px] uppercase font-bold ${theme.textSec}`}>Rol: {currentUserRole}</p>
            </div>
        </div>
        <div className="flex gap-4 overflow-x-auto items-center">
          
          {/* BOTÓN TEMA (SOL / LUNA) */}
          <button onClick={toggleTheme} className={`p-2 rounded-lg border transition-all ${theme.btnGhost}`}>
              {darkMode ? <Sun size={20} className="text-amber-400"/> : <Moon size={20} className="text-indigo-600"/>}
          </button>

          <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
             {['ventas', 'reportes', 'cursos', 'equipo'].map((v) => (
                 <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-md text-sm font-bold whitespace-nowrap capitalize transition-all ${view === v ? 'bg-amber-500 text-[#0B1120]' : `${theme.textSec} hover:text-slate-600`}`}>{v}</button>
             ))}
          </div>
          <button onClick={handleLogout} className={`p-2 rounded-lg text-rose-500 border transition-all ${theme.btnGhost}`}><LogOut size={20} /></button>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto p-4 md:p-6 transition-colors duration-300">
        
        {view === 'ventas' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><TrendingUp size={24} /></div><div><p className={`text-sm ${theme.textSec}`}>Hoy</p><h3 className="text-2xl font-bold">{stats.hoy}</h3></div></div>
                <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><BarChart3 size={24} /></div><div><p className={`text-sm ${theme.textSec}`}>Mes</p><h3 className="text-2xl font-bold">{stats.mes}</h3></div></div>
                <div className={`${theme.card} p-5 rounded-2xl border flex items-center gap-4`}><div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Users size={24} /></div><div><p className={`text-sm ${theme.textSec}`}>Total</p><h3 className="text-2xl font-bold">{stats.total}</h3></div></div>
            </div>

            <div className={`${theme.card} p-4 rounded-2xl border mb-6 animate-fadeIn`}>
                <div className="flex items-center gap-2 mb-3 text-amber-500 font-bold text-sm"><Filter size={16}/> Filtros de Búsqueda</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={16}/><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full border rounded-xl py-2 px-4 pl-9 text-xs outline-none ${theme.input}`}/></div>
                    <select value={filterPromoter} onChange={(e) => setFilterPromoter(e.target.value)} className={`border rounded-xl py-2 px-3 text-xs outline-none ${theme.input}`}><option value="">Todos los Promotores</option>{usuarios.filter(u => u.rol === 'promotor').map(u => (<option key={u.id} value={u.email}>{u.nombre} {u.apellidos}</option>))}</select>
                    <input type="text" placeholder="Ciudad" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className={`border rounded-xl py-2 px-3 text-xs outline-none ${theme.input}`}/>
                    <input type="text" placeholder="UGEL" value={filterUgel} onChange={(e) => setFilterUgel(e.target.value)} className={`border rounded-xl py-2 px-3 text-xs outline-none ${theme.input}`}/>
                    <div className="flex gap-1"><input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className={`w-1/2 border rounded-xl p-1 text-[10px] text-center ${theme.input}`}/><input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className={`w-1/2 border rounded-xl p-1 text-[10px] text-center ${theme.input}`}/></div>
                </div>
            </div>

            <div className={`${theme.card} rounded-2xl border overflow-hidden shadow-xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className={`${theme.tableHeader} font-bold text-xs uppercase`}>
                            <tr>
                                <th className="px-6 py-4 border-b border-inherit text-center">Estado</th>
                                <th className="px-6 py-4 border-b border-inherit">Asesor</th>
                                <th className="px-6 py-4 border-b border-inherit">Participante</th>
                                <th className="px-6 py-4 border-b border-inherit">Laboral</th>
                                <th className="px-6 py-4 border-b border-inherit">Pago</th>
                                <th className="px-6 py-4 border-b border-inherit">Programa</th>
                                <th className="px-6 py-4 border-b border-inherit text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                            {loading ? <tr><td colSpan="7" className="p-8 text-center text-slate-500">Cargando...</td></tr> : filteredVentas.map((venta) => (
                                <tr key={venta.id} className={`${theme.tableRow} transition-colors`}>
                                    <td className="px-6 py-4 border-b border-inherit text-center">
                                        {currentUserRole !== 'supervisor' ? (
                                            <div className={`flex justify-center gap-1 mb-1 p-1 rounded-lg border w-fit mx-auto ${darkMode ? 'bg-[#0B1120] border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                                                <button onClick={()=>cambiarEstadoFicha(venta.id, 'aprobado')} className={`p-1.5 rounded-md transition-all ${venta.estado_ficha === 'aprobado' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-emerald-500'}`} title="Aprobar"><Check size={14}/></button>
                                                <button onClick={()=>cambiarEstadoFicha(venta.id, 'rechazado')} className={`p-1.5 rounded-md transition-all ${venta.estado_ficha === 'rechazado' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-rose-500'}`} title="Rechazar"><XCircle size={14}/></button>
                                            </div>
                                        ) : null}
                                        <span className={`text-[9px] uppercase font-bold tracking-wider ${venta.estado_ficha==='aprobado'?'text-emerald-500':venta.estado_ficha==='rechazado'?'text-rose-500':'text-amber-500'}`}>{venta.estado_ficha || 'Pendiente'}</span>
                                    </td>
                                    <td className="px-6 py-4 border-b border-inherit"><div className="flex flex-col"><span className={`font-mono text-xs ${theme.textSec}`}>{new Date(venta.created_at).toLocaleDateString()}</span><span className="text-[10px] text-emerald-500 font-bold uppercase mt-1">{obtenerNombreAsesor(venta.promotor_email, venta.promotor_nombre)}</span></div></td>
                                    <td className="px-6 py-4 border-b border-inherit">
                                        <div className="font-bold flex items-center gap-2">{venta.nombre}</div>
                                        <div className={`text-xs ${theme.textSec}`}>{venta.dni}</div>
                                        <div className={`text-[10px] ${theme.textSec} mt-1 opacity-70`}>Ficha: {venta.numero_ficha_fisica || 'S/N'}</div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-inherit"><div className="text-sm">{venta.condicion_laboral}</div><div className={`text-xs ${theme.textSec}`}>{venta.institucion}</div><div className={`text-[10px] ${theme.textSec}`}>{venta.ciudad}</div></td>
                                    <td className="px-6 py-4 border-b border-inherit"><span className="px-2 py-1 rounded text-xs font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">{venta.modalidad_pago}</span></td>
                                    <td className="px-6 py-4 border-b border-inherit text-xs max-w-xs">
                                        <div className="text-amber-500 font-bold mb-1">{venta.tipo_registro}</div>
                                        {venta.modalidad_estudio === 'Acelerada' && <span className="bg-purple-500/20 text-purple-400 px-1 rounded border border-purple-500/30 text-[10px] mr-1">Acelerada</span>}
                                        <span className={`truncate block ${theme.textSec}`}>{venta.programa}</span>
                                    </td>
                                    <td className="px-6 py-4 border-b border-inherit text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => abrirFicha(venta)} className={`p-2 rounded border transition-colors ${theme.btnGhost} hover:text-blue-500 hover:border-blue-500`} title="Ver Ficha"><Eye size={16}/></button>
                                            {currentUserRole !== 'supervisor' && (
                                                <>
                                                    <button onClick={() => abrirEditar(venta)} className={`p-2 rounded border transition-colors ${theme.btnGhost} hover:text-amber-500 hover:border-amber-500`} title="Editar"><Edit size={16}/></button>
                                                    <button onClick={() => abrirPagar(venta)} className={`p-2 rounded border transition-colors ${theme.btnGhost} hover:text-emerald-500 hover:border-emerald-500`} title="Pagar"><DollarSign size={16}/></button>
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
                    <h2 className="text-2xl font-bold flex items-center gap-2"><PieChart className="text-amber-500"/> Reportes de Gestión</h2>
                    <div className="flex gap-2"><input type="date" className={`border rounded p-2 text-xs ${theme.input}`}/><input type="date" className={`border rounded p-2 text-xs ${theme.input}`}/></div>
                </div>
                <div className={`${theme.card} p-6 rounded-2xl border`}><h3 className="font-bold mb-4">Ventas Diarias (Mes Actual)</h3><SimpleBarChart data={reportData.daily} isDark={darkMode} /></div>
            </div>
        )}

        {view === 'equipo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`${theme.card} p-6 rounded-2xl border h-fit`}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="text-amber-500" /> Gestión de Equipo</h3>
                    {currentUserRole !== 'supervisor' && (
                        <button onClick={() => abrirUsuario()} className="bg-amber-600 hover:bg-amber-500 text-[#0B1120] font-bold py-2 px-4 rounded-xl flex items-center gap-2 w-full justify-center mb-4"><Plus size={20} /> Registrar Personal</button>
                    )}
                    <p className={`text-xs text-center ${theme.textSec}`}>La clave de acceso será el número de DNI.</p>
                </div>
                <div className="lg:col-span-2 space-y-4">{usuarios.map(u => (<div key={u.id} className={`p-5 rounded-2xl border flex justify-between items-center ${!u.activo ? 'opacity-60' : ''} ${theme.card}`}><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>{u.nombre?.charAt(0).toUpperCase()}</div><div><h4 className="font-bold">{u.nombre} {u.apellidos}</h4><p className={`text-sm ${theme.textSec}`}>{u.rol} • {u.dni}</p></div></div><div className="flex gap-2">
                    {currentUserRole === 'admin' && (<><button onClick={() => abrirUsuario(u)} className={`p-2 rounded hover:bg-slate-500/10 text-amber-500`}><Edit size={16}/></button><button onClick={()=>toggleUserStatus(u)} className={`p-2 rounded hover:bg-slate-500/10 text-rose-500`}><Power size={16}/></button></>)}
                </div></div>))}</div>
            </div>
        )}

        {view === 'cursos' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`${theme.card} p-6 rounded-2xl border h-fit`}>
                    <h3 className="text-xl font-bold mb-4"><Plus className="inline mr-2 text-amber-500"/> Nuevo Curso</h3>
                    {currentUserRole !== 'supervisor' && (
                        <form onSubmit={handleAddCurso} className="space-y-4"><select className={`w-full border rounded-xl p-3 ${theme.input}`} value={nuevoCurso.nivel} onChange={e=>setNuevoCurso({...nuevoCurso, nivel:e.target.value})}><option value="Inicial">Inicial</option><option value="Primaria">Primaria</option><option value="Secundaria">Secundaria</option></select><input className={`w-full border rounded-xl p-3 ${theme.input}`} placeholder="Nombre del curso" value={nuevoCurso.nombre} onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})}/><button className="w-full bg-amber-600 p-3 rounded-xl font-bold text-black">Guardar</button></form>
                    )}
                </div>
                <div className="lg:col-span-2 space-y-2">{cursos.map(c=><div key={c.id} className={`${theme.card} p-4 rounded-xl border flex justify-between`}><div><span className="text-xs text-amber-500 block uppercase font-bold">{c.nivel}</span><span className="">{c.nombre}</span></div>
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
            <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto z-10 ${theme.modalBg}`}>
                <button onClick={() => setModalEditOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-20 ${theme.btnGhost}`}><X size={20}/></button>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 mt-2"><Edit className="text-amber-500"/> Editar Registro</h3>
                <form onSubmit={guardarEdicion} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Nombre</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})}/></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>DNI</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.dni} onChange={e=>setEditForm({...editForm, dni:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Tipo</label><select className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.tipo_registro} onChange={e=>setEditForm({...editForm, tipo_registro:e.target.value})}><option>Diplomado</option><option>Especialización</option><option>Curso de Capacitación</option><option>Curso de Actualización</option><option>Nombramiento Docente</option><option>Ascenso Docente</option></select></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Modalidad</label><select className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.modalidad_estudio} onChange={e=>setEditForm({...editForm, modalidad_estudio:e.target.value})}><option>Programa Completo</option><option>Acelerada</option></select></div>
                    </div>
                    <div><label className={`text-xs ml-1 ${theme.textSec}`}>Cursos Inscritos (Programa)</label><textarea className={`w-full border rounded-xl p-3 h-24 text-sm font-mono ${theme.input}`} value={editForm.programa || ''} onChange={e=>setEditForm({...editForm, programa:e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Celular</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.celular} onChange={e=>setEditForm({...editForm, celular:e.target.value})}/></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>WhatsApp</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.whatsapp} onChange={e=>setEditForm({...editForm, whatsapp:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Centro Laboral</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.institucion} onChange={e=>setEditForm({...editForm, institucion:e.target.value})}/></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>UGEL</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.ugel} onChange={e=>setEditForm({...editForm, ugel:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Ficha Física</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.numero_ficha_fisica} onChange={e=>setEditForm({...editForm, numero_ficha_fisica:e.target.value})}/></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Ciudad</label><input className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.ciudad} onChange={e=>setEditForm({...editForm, ciudad:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Condición</label><select className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.condicion_laboral} onChange={e=>setEditForm({...editForm, condicion_laboral:e.target.value})}><option>Nombrado</option><option>Contratado</option><option>Sin Vínculo</option></select></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Pago</label><select className={`w-full border rounded-xl p-3 ${theme.input}`} value={editForm.modalidad_pago} onChange={e=>setEditForm({...editForm, modalidad_pago:e.target.value})}><option>Pago a Cuenta</option><option>Descuento por Planilla</option></select></div>
                    </div>
                    <div><label className={`text-xs ml-1 ${theme.textSec}`}>Observaciones</label><textarea className={`w-full border rounded-xl p-3 h-24 ${theme.input}`} value={editForm.observaciones || ''} onChange={e=>setEditForm({...editForm, observaciones:e.target.value})}/></div>
                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-[#0B1120] font-bold py-3 rounded-xl shadow-lg mt-2">Guardar Cambios</button>
                </form>
            </div>
        </div>
      )}

      {/* 2. FICHA COMPLETA (SOLO LECTURA + LISTA PAGOS) */}
      {modalFichaOpen && fichaData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setModalFichaOpen(false)}></div>
            <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl relative my-8 overflow-y-auto max-h-[95vh] z-10 flex flex-col ${theme.modalBg} ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className={`flex justify-between items-center p-6 border-b rounded-t-3xl sticky top-0 z-20 ${darkMode ? 'bg-[#0f1623] border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="text-amber-500"/> {fichaData.tipo_registro}: {fichaData.nombre}</h2>
                        <p className={`text-sm flex gap-2 ${theme.textSec}`}><span>{fichaData.dni}</span> • <span className="text-emerald-500 font-bold">{fichaData.modalidad_estudio}</span></p>
                    </div>
                    <button onClick={() => setModalFichaOpen(false)} className={`p-2 rounded-full transition-colors ${theme.btnGhost}`}><X size={24}/></button>
                </div>
                
                <div className="p-8 space-y-8 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className={`text-amber-500 font-bold uppercase text-xs border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>Datos Personales</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className={`block ${theme.textSec}`}>Celular</span> <span>{fichaData.celular}</span></div>
                                <div><span className={`block ${theme.textSec}`}>WhatsApp</span> <span>{fichaData.whatsapp || '-'}</span></div>
                                <div className="col-span-2"><span className={`block ${theme.textSec}`}>Correo</span> <span>{fichaData.correo || '-'}</span></div>
                                <div className="col-span-2"><span className={`block ${theme.textSec}`}>Dirección</span> <span>{fichaData.direccion || '-'}</span></div>
                                <div><span className={`block ${theme.textSec}`}>Ciudad</span> <span>{fichaData.ciudad || '-'}</span></div>
                                <div><span className={`block ${theme.textSec}`}>Ficha Física</span> <span className="font-bold">{fichaData.numero_ficha_fisica || 'N/A'}</span></div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className={`text-amber-500 font-bold uppercase text-xs border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>Información Laboral</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className={`block ${theme.textSec}`}>Condición</span> <span>{fichaData.condicion_laboral}</span></div>
                                <div><span className={`block ${theme.textSec}`}>Nivel</span> <span>{fichaData.nivel || '-'}</span></div>
                                <div className="col-span-2"><span className={`block ${theme.textSec}`}>Centro Laboral</span> <span>{fichaData.institucion || 'Sin IE'}</span></div>
                                <div className="col-span-2"><span className={`block ${theme.textSec}`}>UGEL / DRE</span> <span>{fichaData.ugel || '-'}</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className={`text-amber-500 font-bold uppercase text-xs border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>Academico y Documentos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <span className={`block text-xs ${theme.textSec}`}>Cursos Inscritos</span>
                                <p className={`p-3 rounded text-sm mt-1 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>{fichaData.programa}</p>
                                <div className="mt-4 flex gap-4">
                                    {fichaData.foto_dni_url && <button onClick={()=>abrirVistaImagen(fichaData.foto_dni_url, 'DNI')} className="text-blue-500 hover:text-blue-600 border border-blue-500/30 bg-blue-500/10 px-3 py-1 rounded text-xs flex items-center gap-2"><User size={14}/> Ver DNI</button>}
                                    {fichaData.foto_contrato_url && <button onClick={()=>abrirVistaImagen(fichaData.foto_contrato_url, 'Contrato')} className="text-amber-500 hover:text-amber-600 border border-amber-500/30 bg-amber-500/10 px-3 py-1 rounded text-xs flex items-center gap-2"><FileText size={14}/> Ver Contrato</button>}
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                <h5 className="text-emerald-500 font-bold text-xs uppercase mb-2">Resumen Financiero</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className={`block ${theme.textSec}`}>Modalidad</span> <span>{fichaData.modalidad_pago}</span></div>
                                    <div><span className={`block ${theme.textSec}`}>Total Pactado</span> <span className="text-amber-500 font-bold">S/ {fichaData.total_pagar || '0.00'}</span></div>
                                    <div><span className={`block ${theme.textSec}`}>Cuotas</span> <span>{fichaData.num_cuotas || '1'}</span></div>
                                    <div><span className={`block ${theme.textSec}`}>Mensualidad</span> <span>S/ {fichaData.monto_mensual || '0.00'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-end pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2"><DollarSign className="text-emerald-500"/> Historial de Pagos</h3>
                            <span className="text-xl font-bold text-emerald-500">Total Pagado: S/ {historialPagos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0).toFixed(2)}</span>
                        </div>
                        <div className={`overflow-hidden rounded-xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <table className="w-full text-sm text-left">
                                <thead className={theme.tableHeader}><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Medio</th><th className="px-4 py-3 text-right">Monto</th></tr></thead>
                                <tbody className={`divide-y ${darkMode ? 'divide-slate-800 bg-[#151e32]' : 'divide-slate-200 bg-white'}`}>
                                    {historialPagos.length === 0 ? <tr><td colSpan="4" className={`p-6 text-center italic ${theme.textSec}`}>No hay pagos registrados aún.</td></tr> : 
                                    historialPagos.map((pago) => (
                                        <tr key={pago.id} className={theme.tableRow}>
                                            <td className={`px-4 py-3 font-mono text-xs ${theme.textSec}`}>{pago.fecha_pago}</td>
                                            <td className="px-4 py-3 font-bold">{pago.concepto}</td>
                                            <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{pago.medio_pago}</span></td>
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

      {/* 3. PAGAR (SOLO FORMULARIO) */}
      {modalPayOpen && payData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setModalPayOpen(false)}></div>
            <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-6 relative z-10 ${theme.modalBg}`}>
                <button onClick={() => setModalPayOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${theme.btnGhost}`}><X size={20}/></button>
                <div className="mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="text-emerald-500"/> Registrar Pago</h2>
                    <p className={`text-sm mt-1 font-mono ${theme.textSec}`}>{payData.nombre} • DNI: {payData.dni}</p>
                </div>
                <form onSubmit={registrarPago} className={`space-y-4 p-6 rounded-2xl border ${darkMode ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className={`text-[10px] uppercase font-bold ${theme.textSec}`}>Concepto (Mes)</label><input className={`w-full border rounded-lg p-3 text-sm ${theme.input}`} placeholder="Ej. Enero 2026" value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} required/></div>
                        <div className="space-y-1"><label className={`text-[10px] uppercase font-bold ${theme.textSec}`}>Monto (S/)</label><input type="number" step="0.01" className={`w-full border rounded-lg p-3 text-sm font-bold text-emerald-500 ${theme.input}`} placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} required/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className={`text-[10px] uppercase font-bold ${theme.textSec}`}>Medio de Pago</label>
                        <select className={`w-full border rounded-lg p-3 text-sm ${theme.input}`} value={nuevoPago.medio_pago} onChange={e=>setNuevoPago({...nuevoPago, medio_pago:e.target.value})}>
                            <option>Descuento por Planilla</option><option>Yape</option><option>Plin</option><option>BCP</option><option>Banco de la Nación</option><option>Interbank</option><option>BBVA</option><option>Efectivo</option><option>Otro</option>
                        </select></div>
                        <div className="space-y-1"><label className={`text-[10px] uppercase font-bold ${theme.textSec}`}>Fecha de Pago</label><input type="date" className={`w-full border rounded-lg p-3 text-sm ${theme.input}`} value={nuevoPago.fecha_pago} onChange={e=>setNuevoPago({...nuevoPago, fecha_pago:e.target.value})} required/></div>
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
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-8 relative z-10 ${theme.modalBg}`}>
                <button onClick={() => setModalUserOpen(false)} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${theme.btnGhost}`}><X size={20}/></button>
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><User className="text-amber-500"/> {userForm.id ? 'Editar Personal' : 'Nuevo Integrante'}</h3>
                <form onSubmit={guardarUsuario} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Nombres</label><input className={`w-full border p-3 rounded-xl ${theme.input}`} value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} required/></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Apellidos</label><input className={`w-full border p-3 rounded-xl ${theme.input}`} value={userForm.apellidos} onChange={e=>setUserForm({...userForm, apellidos:e.target.value})} required/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>DNI (Será la clave)</label><input className={`w-full border p-3 rounded-xl ${theme.input}`} value={userForm.dni} onChange={e=>setUserForm({...userForm, dni:e.target.value})} required/></div>
                        <div><label className={`text-xs ml-1 ${theme.textSec}`}>Celular</label><input className={`w-full border p-3 rounded-xl ${theme.input}`} value={userForm.celular} onChange={e=>setUserForm({...userForm, celular:e.target.value})} required/></div>
                    </div>
                    <div><label className={`text-xs ml-1 ${theme.textSec}`}>Correo Electrónico</label><input type="email" className={`w-full border p-3 rounded-xl ${theme.input}`} value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} required/></div>
                    
                    {/* SELECTOR DE ROLES */}
                    <div>
                        <label className={`text-xs ml-1 ${theme.textSec}`}>Rol de Acceso</label>
                        <select className={`w-full border p-3 rounded-xl outline-none ${theme.input}`} value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})}>
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