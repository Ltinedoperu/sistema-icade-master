import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, FileText, User, RefreshCw, Plus, Trash2, Layers, Briefcase, MapPin, Edit, X, Save, MessageCircle, BarChart3, TrendingUp, Users, Shield, Power, Lock, Eye, Download, Share2, ExternalLink, DollarSign, Package, CheckCircle, Calendar, GraduationCap, Zap, PieChart, Filter, Check, XCircle, CreditCard, Building, Sun, Moon } from 'lucide-react';

// --- GRÁFICOS (Adaptado para recibir el tema) ---
const SimpleBarChart = ({ data, isDark }) => {
    // Protección para data vacía
    const safeData = data && Array.isArray(data) ? data : [];
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
  
  // --- ESTADO DEL TEMA ---
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
      
      // Recuperar preferencia de tema
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

  // --- CONFIGURACIÓN DE COLORES (Aquí evitamos la pantalla azul) ---
  const theme = {
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-slate-100', // Fondo gris suave en light
      text: darkMode ? 'text-slate-200' : 'text-slate-800',
      textSec: darkMode ? 'text-slate-400' : 'text-slate-500',
      // Tarjetas: Blancas en modo light para contraste
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-sm',
      input: darkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900',
      // Tablas
      tableHeader: darkMode ? 'bg-[#0f1623] text-amber-500' : 'bg-slate-200 text-slate-800 border-b border-slate-300',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-amber-50 border-slate-300',
      // Modales
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-white border-slate-300',
      // Botones
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
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const obtenerNombreAsesor = (email, nombreGuardado) => {
    if (nombreGuardado) return nombreGuardado;
    const usuarioEncontrado = usuarios.find(u => u.email === email);
    return usuarioEncontrado ? usuarioEncontrado.nombre : (email?.split('@')[0] || 'Desc.');
  };

  const calcularEstadisticas = (data) => {
    if(!data) return;
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
    setHistorialPagos([]); 
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
          
          {/* BOTÓN TEMA */}
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
                    <div className="flex gap-1"><input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className={`w-1/2 border rounded-xl p-1 text-[10px] text-center ${theme.input}`}/><input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.