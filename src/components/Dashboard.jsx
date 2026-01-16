import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// Importamos PieChart como PieChartIcon para evitar conflictos de nombre si usáramos una librería gráfica
import { LogOut, Search, User, Plus, Trash2, Edit, X, BarChart3, TrendingUp, Users, Shield, Power, Eye, DollarSign, Check, XCircle, PieChart as PieChartIcon, Filter, Sun, Moon, GraduationCap, Calendar, Phone, Mail, MapPin, Briefcase, CreditCard, FileText } from 'lucide-react';

// --- GRÁFICOS (Versión Blindada y Adaptable) ---
const SimpleBarChart = ({ data, isDark }) => {
    // 1. Protección: Asegurar que data sea un array
    const safeData = data && Array.isArray(data) ? data : [];
    
    // 2. Cálculos seguros
    const valores = safeData.map(d => d.value || 0);
    // Evitar que max sea 0 para no dividir por cero
    const max = valores.length > 0 ? Math.max(...valores) : 1;

    return (
        // El borde inferior cambia según el tema
        <div className={`flex items-end gap-2 h-40 pt-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            {safeData.map((d, i) => {
                // 3. Cálculo de porcentaje seguro
                let porcentaje = 0;
                if (max > 0) porcentaje = ((d.value || 0) / max) * 100;
                
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Barra animada con color esmeralda */}
                        <div 
                            className="w-full bg-emerald-500 rounded-t-md transition-all duration-500 relative group hover:bg-emerald-400" 
                            style={{ height: `${porcentaje}%`, opacity: 0.7 + (porcentaje/300) }}
                        >
                            {/* Tooltip flotante (Valor exacto) */}
                            <span className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 ${isDark ? 'text-white bg-slate-800' : 'text-gray-900 bg-white border'}`}>
                                {d.value} Ventas
                            </span>
                        </div>
                        {/* Etiqueta del eje X (Día) - Color adaptable */}
                        <span className={`text-[10px] font-medium truncate w-full text-center ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
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
  // Estado para capturar errores fatales si la BD falla
  const [errorFatal, setErrorFatal] = useState(null);

  const [view, setView] = useState('ventas');
  const [loading, setLoading] = useState(true);
  
  // TEMA (DARK / LIGHT) - Por defecto oscuro
  const [darkMode, setDarkMode] = useState(true);

  // Datos del Usuario y Rol
  const [currentUserRole, setCurrentUserRole] = useState('promotor');
  
  // Datos Principales
  const [ventas, setVentas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtros Avanzados
  const [filterPromoter, setFilterPromoter] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterUgel, setFilterUgel] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // --- ESTADOS DE LOS MODALES (Formularios Completos) ---
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null); // Se inicializa como null

  const [modalFichaOpen, setModalFichaOpen] = useState(false);
  const [fichaData, setFichaData] = useState(null);
  const [historialPagos, setHistorialPagos] = useState([]);

  const [modalPayOpen, setModalPayOpen] = useState(false);
  const [payData, setPayData] = useState(null);
  const [nuevoPago, setNuevoPago] = useState({ concepto: '', monto: '', fecha_pago: '', medio_pago: 'Descuento por Planilla', material_entregado: false });

  const [modalUserOpen, setModalUserOpen] = useState(false);
  // Formulario de usuario completo
  const [userForm, setUserForm] = useState({ id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true });

  const [nuevoCurso, setNuevoCurso] = useState({ nivel: 'Inicial', nombre: '', tipo: 'General' });
  const [stats, setStats] = useState({ hoy: 0, mes: 0, total: 0 });
  const [reportData, setReportData] = useState({ daily: [] });

  // --- INICIALIZACIÓN ---
  useEffect(() => { 
      // 1. Protección contra errores de inicio
      try {
          const role = localStorage.getItem('role') || 'promotor';
          setCurrentUserRole(role);
          
          // Recuperar tema preferido
          const savedTheme = localStorage.getItem('theme');
          if (savedTheme === 'light') {
              setDarkMode(false);
          }

          fetchData(); 
      } catch (err) {
          console.error("Error crítico al iniciar:", err);
          setErrorFatal("No se pudo conectar a la base de datos. Verifica tu conexión o las credenciales.");
      }
      
      // Cerrar modales con ESC
      const handleEsc = (event) => { if (event.key === 'Escape') { closeAllModals(); }};
      window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Función para cambiar el tema y guardarlo
  const toggleTheme = () => {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  // --- DEFINICIÓN DE COLORES DEL TEMA (EL CORAZÓN DEL DISEÑO) ---
  // Aquí es donde se arregla el problema del texto invisible.
  const theme = {
      // Fondos principales
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-gray-50', // Fondo general más claro en light mode
      
      // Textos Principales (El arreglo clave: texto oscuro en fondo claro)
      textMain: darkMode ? 'text-slate-200' : 'text-gray-900',
      textSec: darkMode ? 'text-slate-400' : 'text-gray-500',
      textAccent: 'text-amber-500', // Color de acento (siempre ámbar)
      
      // Tarjetas y Contenedores
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-gray-200 shadow-sm',
      nav: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-gray-200 shadow-sm',
      
      // Modales
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-white border-gray-200 shadow-2xl',
      modalHeader: darkMode ? 'bg-[#0f1623] border-slate-800' : 'bg-gray-50 border-gray-200',

      // Inputs y Elementos de Formulario (Crucial para que se vean bien)
      input: darkMode 
          ? 'bg-[#0B1120] border-slate-700 text-white placeholder-slate-500 focus:border-amber-500' 
          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
      inputLabel: darkMode ? 'text-slate-400' : 'text-gray-600',

      // Tablas
      tableHeader: darkMode ? 'bg-[#0f1623] text-amber-500' : 'bg-gray-100 text-gray-700 border-b border-gray-200',
      tableRow: darkMode ? 'hover:bg-[#1a253a] border-slate-800/50' : 'hover:bg-gray-50 border-gray-200',
      tableDivide: darkMode ? 'divide-slate-800' : 'divide-gray-200',
      
      // Botones
      btnGhost: darkMode ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900',
      btnAction: darkMode ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 border-gray-200 hover:bg-gray-200',
  };

  const closeAllModals = () => {
      setModalEditOpen(false); setModalFichaOpen(false); setModalPayOpen(false); setModalUserOpen(false);
  };

  // --- CARGA DE DATOS (Con manejo de errores) ---
  const fetchData = async () => {
    setLoading(true);
    try {
        // Cargar Usuarios (para relacionar asesores)
        const { data: u, error: uErr } = await supabase.from('usuarios').select('*').order('rol', { ascending: true });
        if (uErr) throw uErr;
        setUsuarios(u || []);
        
        // Cargar Ventas (Clientes)
        const { data: v, error: vErr } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
        if (vErr) throw vErr;
        setVentas(v || []); 
        calcularEstadisticas(v || []);
        
        // Cargar Cursos
        const { data: c, error: cErr } = await supabase.from('cursos').select('*').order('created_at', { ascending: false });
        if (cErr) throw cErr;
        setCursos(c || []);

    } catch (error) {
        console.error("Error cargando datos:", error.message);
        // No bloqueamos toda la app, pero avisamos en consola.
        // Si fuera crítico, usaríamos setErrorFatal.
    } finally {
        setLoading(false);
    }
  };

  // Función auxiliar para mostrar nombres de asesores
  const obtenerNombreAsesor = (email, nombreGuardado) => {
    if (nombreGuardado) return nombreGuardado;
    if (!email) return 'Sin Asignar';
    const usuarioEncontrado = usuarios.find(u => u.email === email);
    return usuarioEncontrado ? usuarioEncontrado.nombre : (email.split('@')[0] || 'Desc.');
  };

  // Cálculos para el Dashboard y Gráficos
  const calcularEstadisticas = (data) => {
    if (!data) return;
    const hoy = new Date().toLocaleDateString();
    const esteMes = new Date().getMonth();
    const esteAnio = new Date().getFullYear();

    const ventasHoy = data.filter(v => new Date(v.created_at).toLocaleDateString() === hoy);
    const ventasMes = data.filter(v => {
        const d = new Date(v.created_at);
        return d.getMonth() === esteMes && d.getFullYear() === esteAnio;
    });

    setStats({ hoy: ventasHoy.length, mes: ventasMes.length, total: data.length });
    
    // Preparar datos para el gráfico (Ventas por día del mes actual)
    const days = {};
    ventasMes.forEach(v => { 
        const d = new Date(v.created_at).getDate(); 
        days[d] = (days[d] || 0) + 1; 
    });
    
    // Llenar días vacíos para que el gráfico se vea continuo (opcional, pero mejor)
    const labels = [];
    const values = [];
    const daysInMonth = new Date(esteAnio, esteMes + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        labels.push(i.toString());
        values.push(days[i] || 0);
    }

    setReportData({ daily: labels.map((l, i) => ({ label: l, value: values[i] })) });
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  // --- LÓGICA DE FILTRADO AVANZADO (Restaurada) ---
  const filteredVentas = ventas.filter(v => {
      if (!v) return false; // Protección contra registros nulos
      const term = searchTerm.toLowerCase();
      // Búsqueda por Nombre o DNI
      const matchSearch = (v.nombre?.toLowerCase() || '').includes(term) || (v.dni || '').includes(term);
      
      // Filtros exactos
      const matchPromoter = filterPromoter ? v.promotor_email === filterPromoter : true;
      
      // Filtros parciales (contiene texto)
      const matchCity = filterCity ? (v.ciudad?.toLowerCase() || '').includes(filterCity.toLowerCase()) : true;
      const matchUgel = filterUgel ? (v.ugel?.toLowerCase() || '').includes(filterUgel.toLowerCase()) : true;
      
      // Filtro de Fechas
      let matchDate = true;
      if (filterDateStart && filterDateEnd) {
          const d = new Date(v.created_at);
          const startDate = new Date(filterDateStart);
          const endDate = new Date(filterDateEnd);
          endDate.setHours(23,59,59); // Incluir todo el día final
          matchDate = d >= startDate && d <= endDate;
      }
      
      return matchSearch && matchPromoter && matchCity && matchUgel && matchDate;
  });

  // --- FUNCIONES DE ACCIÓN (CRUD) ---

  // 1. Editar Cliente (Formulario Completo Restaurado)
  const abrirEditar = (venta) => { 
      // Aseguramos que el objeto no sea null y tenga valores por defecto para evitar errores en los inputs
      setEditForm(venta || {}); 
      setModalEditOpen(true); 
  };
  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!editForm.id) return; // Protección

    const { error } = await supabase.from('clientes').update({
        nombre: editForm.nombre, dni: editForm.dni, celular: editForm.celular, whatsapp: editForm.whatsapp,
        correo: editForm.correo, institucion: editForm.institucion, ugel: editForm.ugel, ciudad: editForm.ciudad,
        condicion_laboral: editForm.condicion_laboral, modalidad_pago: editForm.modalidad_pago, observaciones: editForm.observaciones,
        tipo_registro: editForm.tipo_registro, modalidad_estudio: editForm.modalidad_estudio, programa: editForm.programa,
        numero_ficha_fisica: editForm.numero_ficha_fisica
    }).eq('id', editForm.id);

    if (!error) { 
        alert("Registro actualizado correctamente."); 
        setModalEditOpen(false); 
        fetchData(); 
    } else { 
        alert("Error al actualizar: " + error.message); 
    }
  };

  // 2. Ver Ficha y Pagos
  const abrirFicha = async (venta) => {
    if (!venta) return;
    setFichaData(venta); setModalFichaOpen(true);
    const { data, error } = await supabase.from('historial_pagos').select('*').eq('cliente_id', venta.id).order('fecha_pago', { ascending: true });
    if (!error) setHistorialPagos(data || []);
  };

  // 3. Registrar Pago
  const abrirPagar = (venta) => {
      if (!venta) return;
      setPayData(venta);
      const hoy = new Date().toISOString().split('T')[0];
      // Reiniciamos el formulario de pago con valores por defecto
      setNuevoPago({ concepto: '', monto: '', fecha_pago: hoy, medio_pago: 'Descuento por Planilla', material_entregado: false });
      setModalPayOpen(true);
  };
  const registrarPago = async (e) => {
      e.preventDefault(); 
      if (!nuevoPago.concepto || !nuevoPago.monto || !payData.id) return alert("Por favor completa el concepto y el monto.");
      
      const { error } = await supabase.from('historial_pagos').insert([{ cliente_id: payData.id, ...nuevoPago }]);
      if (!error) { 
          alert("Pago registrado exitosamente. El correo se enviará automáticamente."); 
          setModalPayOpen(false); 
          // Si la ficha estaba abierta, actualizar su historial
          if(modalFichaOpen && fichaData?.id === payData.id) abrirFicha(payData); 
          // Recargar datos globales para actualizar stats
          fetchData();
      } else { alert("Error al registrar pago: " + error.message); }
  };

  // 4. Cambiar Estado de Ficha (Supervisor/Admin)
  const cambiarEstadoFicha = async (id, nuevoEstado) => {
      if(confirm(`¿Estás seguro de marcar esta ficha como '${nuevoEstado.toUpperCase()}'?`)) {
          const { error } = await supabase.from('clientes').update({ estado_ficha: nuevoEstado }).eq('id', id);
          if(!error) fetchData(); else alert("Error: " + error.message);
      }
  };

  // 5. Gestión de Usuarios (Equipo) - Formulario Completo Restaurado
  const abrirUsuario = (u=null) => { 
      // Si u es null, es nuevo usuario. Si no, es edición.
      if (u) {
          setUserForm(u); 
      } else {
          // Valores por defecto para nuevo usuario
          setUserForm({ id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true }); 
      }
      setModalUserOpen(true); 
  };
  
  const guardarUsuario = async (e) => { 
      e.preventDefault(); 
      if (!userForm.dni || !userForm.email) return alert("DNI y Email son obligatorios."); 
      
      // La contraseña inicial es el DNI
      const payload = { ...userForm, password: userForm.dni }; 
      
      if (!userForm.id) { 
          // Crear Nuevo
          const { id, ...dataToSend } = payload; // Quitamos el ID nulo
          const { error } = await supabase.from('usuarios').insert([dataToSend]); 
          if (!error) { alert("Usuario Creado Exitosamente. Su clave es su DNI."); setModalUserOpen(false); fetchData(); } 
          else alert("Error al crear: " + error.message); 
      } else { 
          // Actualizar Existente
          const { error } = await supabase.from('usuarios').update(payload).eq('id', userForm.id); 
          if (!error) { alert("Usuario Actualizado Correctamente."); setModalUserOpen(false); fetchData(); } 
          else alert("Error al actualizar: " + error.message);
      } 
  };
  
  // Activar/Desactivar Usuario
  const toggleUserStatus = async (u) => { 
      if(u.rol === 'admin') return alert("No puedes desactivar al administrador principal.");
      if(confirm(`¿${u.activo ? 'Desactivar' : 'Activar'} acceso a ${u.nombre}?`)) { 
          const { error } = await supabase.from('usuarios').update({activo:!u.activo}).eq('id', u.id); 
          if(!error) fetchData(); else alert("Error: " + error.message);
      }
  };

  // 6. Gestión de Cursos
  const handleAddCurso = async (e) => { 
      e.preventDefault(); 
      if(nuevoCurso.nombre) { 
          const { error } = await supabase.from('cursos').insert([nuevoCurso]); 
          if(!error) { setNuevoCurso({...nuevoCurso, nombre:''}); fetchData(); } else alert(error.message);
      }
  };
  const handleDelCurso = async (id) => { 
      if(confirm("¿Seguro de borrar este curso?")) { 
          const { error } = await supabase.from('cursos').delete().eq('id', id); 
          if(!error) fetchData(); else alert(error.message);
      }
  };

  // --- RENDERIZADO DE EMERGENCIA (Si la BD falla) ---
  if (errorFatal) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
              <div className="bg-red-900/50 border border-red-500 p-8 rounded-2xl max-w-md text-center">
                  <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold mb-2">Error de Conexión</h1>
                  <p className="mb-6 text-slate-300">{errorFatal}</p>
                  <button onClick={handleLogout} className="bg-white text-red-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                      Cerrar Sesión e Intentar de Nuevo
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDERIZADO PRINCIPAL ---
  return (
    // Aplicamos las clases de tema al contenedor principal para que todo el texto herede el color correcto
    <div className={`min-h-screen font-sans pb-20 relative transition-colors duration-300 ${theme.bg} ${theme.textMain}`}>
      
      {/* NAVBAR (Barra Superior) */}
      <nav className={`${theme.nav} px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 border-b transition-colors duration-300`}>
        <div className="flex items-center gap-3">
            {/* Logo Animado */}
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-[#0B1120] font-black text-xl shadow-lg shadow-amber-500/20 transform hover:scale-105 transition-transform">I</div>
            <div>
                <h1 className={`text-xl font-black tracking-tight ${theme.textMain}`}>ICADE <span className={theme.textAccent}>MANAGER</span></h1>
                <p className={`text-[10px] uppercase tracking-widest font-bold ${theme.textSec} flex items-center gap-1`}>
                    <Shield size={10} /> {currentUserRole}
                </p>
            </div>
        </div>
        
        {/* Botones de Navegación y Acciones */}
        <div className="flex gap-3 items-center flex-wrap justify-center">
          {/* Interruptor de Tema (Sol/Luna) */}
          <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all shadow-sm hover:shadow-md ${theme.btnGhost}`} title="Cambiar Tema">
              {darkMode ? <Sun size={20} className="text-amber-400 animate-spin-slow"/> : <Moon size={20} className="text-indigo-600 animate-pulse-slow"/>}
          </button>

          {/* Menú de Vistas */}
          <div className={`flex p-1.5 rounded-xl border ${darkMode ? 'bg-[#0f1623] border-slate-800' : 'bg-gray-100/80 border-gray-200'}`}>
             {[
                 { id: 'ventas', icon: Users, label: 'Ventas' },
                 { id: 'reportes', icon: PieChartIcon, label: 'Reportes' },
                 { id: 'equipo', icon: Shield, label: 'Equipo' },
                 { id: 'cursos', icon: GraduationCap, label: 'Cursos' }
             ].map((item) => (
                 <button 
                    key={item.id} 
                    onClick={() => setView(item.id)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === item.id ? 'bg-amber-500 text-[#0B1120] shadow-md' : `${theme.textSec} hover:${theme.textMain} hover:bg-gray-200/10`}`}
                 >
                     <item.icon size={16} />
                     <span className="hidden md:inline">{item.label}</span>
                 </button>
             ))}
          </div>
          
          {/* Botón Salir */}
          <button onClick={handleLogout} className={`p-2.5 rounded-xl text-rose-500 border transition-all shadow-sm hover:shadow-md hover:bg-rose-500 hover:text-white ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`} title="Cerrar Sesión">
              <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 animate-fadeIn">
        
        {/* Loading Spinner */}
        {loading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className={`${theme.card} p-8 rounded-2xl flex flex-col items-center shadow-2xl`}>
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className={`font-bold ${theme.textMain}`}>Cargando sistema...</p>
                </div>
            </div>
        )}

        {/* ================= VISTA: VENTAS (Principal) ================= */}
        {!loading && view === 'ventas' && (
            <div className="space-y-6">
            
            {/* TARJETAS DE ESTADÍSTICAS (Resumen Superior) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                {/* Card Hoy */}
                <div className={`${theme.card} p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow flex items-center gap-5 relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                    <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-sm relative z-10"><TrendingUp size={28} /></div>
                    <div className="relative z-10">
                        <p className={`text-sm font-medium uppercase tracking-wider ${theme.textSec}`}>Ventas Hoy</p>
                        <h3 className={`text-3xl font-black ${theme.textMain}`}>{stats.hoy}</h3>
                    </div>
                </div>
                {/* Card Mes */}
                <div className={`${theme.card} p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow flex items-center gap-5 relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 shadow-sm relative z-10"><Calendar size={28} /></div>
                    <div className="relative z-10">
                        <p className={`text-sm font-medium uppercase tracking-wider ${theme.textSec}`}>Este Mes</p>
                        <h3 className={`text-3xl font-black ${theme.textMain}`}>{stats.mes}</h3>
                    </div>
                </div>
                {/* Card Total */}
                <div className={`${theme.card} p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow flex items-center gap-5 relative overflow-hidden group`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20"></div>
                    <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 shadow-sm relative z-10"><Briefcase size={28} /></div>
                    <div className="relative z-10">
                        <p className={`text-sm font-medium uppercase tracking-wider ${theme.textSec}`}>Total Histórico</p>
                        <h3 className={`text-3xl font-black ${theme.textMain}`}>{stats.total}</h3>
                    </div>
                </div>
            </div>

            {/* BARRA DE FILTROS AVANZADOS (Restaurada Completa y con Tema Correcto) */}
            <div className={`${theme.card} p-5 rounded-2xl border shadow-sm mb-6 transition-colors`}>
                <div className={`flex items-center gap-2 mb-4 font-bold text-sm uppercase tracking-wider ${theme.textAccent}`}>
                    <Filter size={16}/> Filtros Avanzados
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Buscador Principal */}
                    <div className="relative lg:col-span-2 group">
                        <Search className={`absolute left-4 top-3.5 transition-colors ${theme.textSec} group-focus-within:${theme.textAccent}`} size={18}/>
                        <input 
                            type="text" 
                            placeholder="Buscar por Nombre, DNI o Apellido..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className={`w-full border rounded-xl py-3 px-4 pl-12 text-sm outline-none transition-all shadow-sm ${theme.input}`}
                        />
                    </div>
                    
                    {/* Select de Promotores */}
                    <div className="relative group">
                        <User className={`absolute left-4 top-3.5 transition-colors ${theme.textSec} group-focus-within:${theme.textAccent}`} size={18}/>
                        <select 
                            value={filterPromoter} 
                            onChange={(e) => setFilterPromoter(e.target.value)} 
                            className={`w-full border rounded-xl py-3 px-4 pl-12 text-sm outline-none transition-all shadow-sm appearance-none ${theme.input}`}
                        >
                            <option value="">Todos los Asesores</option>
                            {usuarios.filter(u => u.rol === 'promotor').map(u => (
                                <option key={u.id} value={u.email} className={darkMode ? 'bg-[#0B1120]' : 'bg-white'}>
                                    {u.nombre} {u.apellidos}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                    </div>

                    {/* Inputs de Ubicación */}
                    <div className="relative group">
                        <MapPin className={`absolute left-4 top-3.5 transition-colors ${theme.textSec} group-focus-within:${theme.textAccent}`} size={18}/>
                        <input type="text" placeholder="Ciudad..." value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className={`w-full border rounded-xl py-3 px-4 pl-12 text-sm outline-none transition-all shadow-sm ${theme.input}`}/>
                    </div>
                    <div className="relative group">
                        <Briefcase className={`absolute left-4 top-3.5 transition-colors ${theme.textSec} group-focus-within:${theme.textAccent}`} size={18}/>
                        <input type="text" placeholder="UGEL / Institución..." value={filterUgel} onChange={(e) => setFilterUgel(e.target.value)} className={`w-full border rounded-xl py-3 px-4 pl-12 text-sm outline-none transition-all shadow-sm ${theme.input}`}/>
                    </div>
                    
                    {/* Filtro de Fechas (Rango) */}
                    <div className="lg:col-span-5 flex flex-col md:flex-row gap-4 items-center bg-gray-500/5 p-3 rounded-xl border border-gray-500/10">
                        <span className={`text-xs font-bold uppercase ${theme.textSec} flex items-center gap-2`}><Calendar size={14}/> Rango de Fechas:</span>
                        <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className={`border rounded-xl py-2 px-4 text-xs text-center outline-none shadow-sm focus:border-amber-500 transition-all ${theme.input}`}/>
                        <span className={theme.textSec}>hasta</span>
                        <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className={`border rounded-xl py-2 px-4 text-xs text-center outline-none shadow-sm focus:border-amber-500 transition-all ${theme.input}`}/>
                        {(filterDateStart || filterDateEnd) && (
                            <button onClick={() => {setFilterDateStart(''); setFilterDateEnd('');}} className="text-xs text-rose-500 hover:underline ml-auto flex items-center gap-1">
                                <XCircle size={14}/> Limpiar Fechas
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLA DE RESULTADOS (Con Tema Correcto) */}
            <div className={`${theme.card} rounded-2xl border overflow-hidden shadow-lg transition-colors`}>
                <div className="overflow-x-auto">
                    <table className={`w-full text-sm text-left border-collapse ${theme.tableDivide}`}>
                        <thead className={`${theme.tableHeader} uppercase font-extrabold text-xs tracking-wider`}>
                            <tr>
                                <th className="px-6 py-5 text-center">Estado Ficha</th>
                                <th className="px-6 py-5">Fecha / Asesor</th>
                                <th className="px-6 py-5">Datos del Participante</th>
                                <th className="px-6 py-5">Info. Laboral y Ubicación</th>
                                <th className="px-6 py-5">Programa Académico</th>
                                <th className="px-6 py-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.tableDivide}`}>
                            {filteredVentas.length === 0 ? (
                                <tr><td colSpan="6" className={`px-6 py-12 text-center ${theme.textSec} text-lg`}>No se encontraron registros con esos filtros.</td></tr>
                            ) : (
                                filteredVentas.map((venta) => (
                                <tr key={venta.id} className={`${theme.tableRow} transition-all duration-200`}>
                                    {/* Columna Estado */}
                                    <td className="px-6 py-5 text-center align-middle">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-wider border shadow-sm
                                                ${venta.estado_ficha==='aprobado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                                                  venta.estado_ficha==='rechazado' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 
                                                  'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                                {venta.estado_ficha==='aprobado' ? <Check size={12} strokeWidth={3}/> : venta.estado_ficha==='rechazado' ? <XCircle size={12} strokeWidth={3}/> : <Shield size={12} strokeWidth={3}/>}
                                                {venta.estado_ficha || 'Pendiente'}
                                            </span>
                                            {currentUserRole !== 'supervisor' && (
                                                <div className={`flex gap-1 p-1 rounded-lg border shadow-inner ${darkMode ? 'bg-[#0B1120] border-slate-800' : 'bg-gray-100 border-gray-300'}`}>
                                                    <button onClick={()=>cambiarEstadoFicha(venta.id, 'aprobado')} className={`p-1.5 rounded-md transition-all ${venta.estado_ficha === 'aprobado' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'}`} title="Aprobar Ficha"><Check size={14}/></button>
                                                    <button onClick={()=>cambiarEstadoFicha(venta.id, 'rechazado')} className={`p-1.5 rounded-md transition-all ${venta.estado_ficha === 'rechazado' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'}`} title="Rechazar Ficha"><XCircle size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    
                                    {/* Columna Fecha/Asesor */}
                                    <td className="px-6 py-5 align-middle">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`font-mono text-xs flex items-center gap-1 ${theme.textSec}`}><Calendar size={12}/> {new Date(venta.created_at).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold border border-emerald-500/20">A</div>
                                                <span className="text-xs font-bold text-emerald-600 uppercase truncate max-w-[120px]" title={obtenerNombreAsesor(venta.promotor_email)}>{obtenerNombreAsesor(venta.promotor_email)}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Columna Participante */}
                                    <td className="px-6 py-5 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <div className={`font-bold text-base ${theme.textMain}`}>{venta.nombre} {venta.apellidos}</div>
                                            <div className={`text-xs flex items-center gap-1 ${theme.textSec}`} title="DNI"><CreditCard size={12}/> {venta.dni}</div>
                                            {venta.numero_ficha_fisica && <div className="text-[10px] text-amber-600 font-medium bg-amber-500/10 px-2 py-0.5 rounded w-fit border border-amber-500/20 mt-1">Ficha Nº {venta.numero_ficha_fisica}</div>}
                                        </div>
                                    </td>

                                    {/* Columna Laboral */}
                                    <td className="px-6 py-5 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <div className={`text-sm font-medium ${theme.textMain}`}>{venta.condicion_laboral}</div>
                                            {venta.institucion && <div className={`text-xs flex items-center gap-1 ${theme.textSec}`}><Briefcase size={12}/> {venta.institucion}</div>}
                                            {venta.ciudad && <div className={`text-[10px] flex items-center gap-1 ${theme.textSec} opacity-75`}><MapPin size={10}/> {venta.ciudad} {venta.ugel && `(${venta.ugel})`}</div>}
                                        </div>
                                    </td>

                                    {/* Columna Programa */}
                                    <td className="px-6 py-5 align-middle max-w-[200px]">
                                        <div className="flex flex-col gap-1.5">
                                            <div className={`text-xs font-black uppercase tracking-wider ${theme.textAccent}`}>{venta.tipo_registro}</div>
                                            <span className={`text-sm leading-tight line-clamp-2 font-medium ${theme.textMain}`} title={venta.programa}>{venta.programa}</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {venta.modalidad_estudio === 'Acelerada' && <span className="bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-500/20 whitespace-nowrap">⚡ Acelerada</span>}
                                                <span className="bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-500/20 whitespace-nowrap flex items-center gap-1"><DollarSign size={10}/> {venta.modalidad_pago}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Columna Acciones */}
                                    <td className="px-6 py-5 align-middle text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <button onClick={() => abrirFicha(venta)} className={`p-2 rounded-xl border transition-all shadow-sm hover:shadow-md group ${theme.btnAction}`} title="Ver Ficha Completa">
                                                <Eye size={18} className="text-blue-500 group-hover:scale-110 transition-transform"/>
                                            </button>
                                            {currentUserRole !== 'supervisor' && (
                                                <>
                                                    <button onClick={() => abrirEditar(venta)} className={`p-2 rounded-xl border transition-all shadow-sm hover:shadow-md group ${theme.btnAction}`} title="Editar Registro">
                                                        <Edit size={18} className="text-amber-500 group-hover:scale-110 transition-transform"/>
                                                    </button>
                                                    <button onClick={() => abrirPagar(venta)} className={`p-2 rounded-xl border transition-all shadow-sm hover:shadow-md group ${theme.btnAction}`} title="Registrar Pago">
                                                        <DollarSign size={18} className="text-emerald-500 group-hover:scale-110 transition-transform"/>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        )}

        {/* ================= VISTA: REPORTES ================= */}
        {view === 'reportes' && (
            <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className={`text-3xl font-black flex items-center gap-3 ${theme.textMain}`}>
                            <PieChartIcon className="text-amber-500" size={32}/> 
                            Reportes de Gestión
                        </h2>
                        <p className={theme.textSec}>Análisis del rendimiento de ventas.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gráfico Principal */}
                    <div className={`${theme.card} p-6 rounded-2xl border shadow-md lg:col-span-2`}>
                        <div className="flex justify-between items-center mb-6">
                             <h3 className={`text-xl font-bold ${theme.textMain}`}>Ventas Diarias (Mes Actual)</h3>
                             <span className={`text-sm px-3 py-1 rounded-full border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'} ${theme.textSec}`}>
                                Total Mes: <strong className={theme.textMain}>{stats.mes}</strong>
                             </span>
                        </div>
                        <SimpleBarChart data={reportData.daily} isDark={darkMode} />
                    </div>

                    {/* Resumen Lateral */}
                    <div className="space-y-6">
                        <div className={`${theme.card} p-6 rounded-2xl border shadow-md`}>
                            <h3 className={`text-lg font-bold mb-4 ${theme.textMain}`}>Resumen Global</h3>
                            <ul className="space-y-4">
                                <li className={`flex justify-between items-center p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className={`flex items-center gap-2 ${theme.textSec}`}><TrendingUp size={16} className="text-emerald-500"/> Ventas Hoy</span>
                                    <span className={`text-xl font-black ${theme.textMain}`}>{stats.hoy}</span>
                                </li>
                                <li className={`flex justify-between items-center p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className={`flex items-center gap-2 ${theme.textSec}`}><Calendar size={16} className="text-blue-500"/> Ventas Mes</span>
                                    <span className={`text-xl font-black ${theme.textMain}`}>{stats.mes}</span>
                                </li>
                                <li className={`flex justify-between items-center p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <span className={`flex items-center gap-2 ${theme.textSec}`}><Briefcase size={16} className="text-amber-500"/> Total Histórico</span>
                                    <span className={`text-xl font-black ${theme.textMain}`}>{stats.total}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ================= VISTA: EQUIPO (Gestión de Usuarios) ================= */}
        {view === 'equipo' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
                {/* Panel Lateral: Agregar/Info */}
                <div className={`${theme.card} p-6 rounded-2xl border shadow-md h-fit sticky top-24`}>
                    <Shield className="text-amber-500 mb-4" size={40} />
                    <h3 className={`text-2xl font-black mb-2 ${theme.textMain}`}>Gestión de Equipo</h3>
                    <p className={`mb-6 text-sm ${theme.textSec}`}>Administra los accesos y roles del personal de ICADE.</p>
                    
                    {currentUserRole !== 'supervisor' && (
                        <button onClick={() => abrirUsuario()} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0B1120] font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 mb-6 shadow-lg transition-transform hover:scale-[1.02]">
                            <Plus size={20} strokeWidth={3} /> Registrar Nuevo Personal
                        </button>
                    )}
                    
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed flex gap-3 items-start ${darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                        <p>La <strong>contraseña inicial</strong> para nuevos usuarios será su número de <strong>DNI</strong>. Se recomienda cambiarla tras el primer ingreso.</p>
                    </div>
                </div>

                {/* Lista de Usuarios */}
                <div className="lg:col-span-2 space-y-4">
                    {usuarios.map(u => (
                        <div key={u.id} className={`${theme.card} p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:shadow-md ${!u.activo ? 'opacity-60 grayscale' : ''}`}>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner border ${darkMode ? 'bg-slate-800 text-amber-500 border-slate-700' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                                    {u.nombre?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className={`text-lg font-bold ${theme.textMain}`}>{u.nombre} {u.apellidos}</h4>
                                    <div className="flex items-center gap-3 text-xs mt-1">
                                        <span className={`px-2 py-0.5 rounded-md uppercase font-bold tracking-wider border ${
                                            u.rol === 'admin' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            u.rol === 'supervisor' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                            'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }`}>{u.rol}</span>
                                        <span className={`flex items-center gap-1 ${theme.textSec}`}><CreditCard size={12}/> {u.dni}</span>
                                        <span className={`flex items-center gap-1 ${theme.textSec}`}><Mail size={12}/> {u.email}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Botones de Acción (Solo Admin) */}
                            {currentUserRole === 'admin' && (
                                <div className="flex gap-2 w-full md:w-auto justify-end">
                                    <button onClick={() => abrirUsuario(u)} className={`p-2.5 rounded-xl border transition-all hover:shadow-md group ${theme.btnAction}`} title="Editar Usuario">
                                        <Edit size={18} className="text-amber-500 group-hover:scale-110 transition-transform"/>
                                    </button>
                                    {u.rol !== 'admin' && (
                                        <button onClick={()=>toggleUserStatus(u)} className={`p-2.5 rounded-xl border transition-all hover:shadow-md group ${theme.btnAction}`} title={u.activo ? "Desactivar Cuenta" : "Activar Cuenta"}>
                                            <Power size={18} className={`${u.activo ? 'text-rose-500' : 'text-emerald-500'} group-hover:scale-110 transition-transform`}/>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ================= VISTA: CURSOS ================= */}
        {view === 'cursos' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
                {/* Panel Lateral: Agregar Curso */}
                <div className={`${theme.card} p-6 rounded-2xl border shadow-md h-fit sticky top-24`}>
                    <GraduationCap className="text-amber-500 mb-4" size={40}/>
                    <h3 className={`text-2xl font-black mb-6 ${theme.textMain}`}>Catálogo de Cursos</h3>
                    
                    {currentUserRole !== 'supervisor' && (
                        <form onSubmit={handleAddCurso} className="space-y-4 pb-4 border-b border-slate-700/50">
                            <div>
                                <label className={`text-xs font-bold uppercase ml-1 mb-1 block ${theme.textSec}`}>Nivel Académico</label>
                                <select 
                                    className={`w-full border rounded-xl p-3 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 ${theme.input}`} 
                                    value={nuevoCurso.nivel} 
                                    onChange={e=>setNuevoCurso({...nuevoCurso, nivel:e.target.value})}
                                >
                                    <option className={darkMode ? 'bg-[#0B1120]' : ''}>Inicial</option>
                                    <option className={darkMode ? 'bg-[#0B1120]' : ''}>Primaria</option>
                                    <option className={darkMode ? 'bg-[#0B1120]' : ''}>Secundaria</option>
                                    <option className={darkMode ? 'bg-[#0B1120]' : ''}>Superior</option>
                                </select>
                            </div>
                            <div>
                                 <label className={`text-xs font-bold uppercase ml-1 mb-1 block ${theme.textSec}`}>Nombre del Curso</label>
                                <input 
                                    className={`w-full border rounded-xl p-3 outline-none transition-all focus:ring-2 focus:ring-amber-500/50 ${theme.input}`} 
                                    placeholder="Ej: Estrategias Didácticas..." 
                                    value={nuevoCurso.nombre} 
                                    onChange={e=>setNuevoCurso({...nuevoCurso, nombre:e.target.value})}
                                    required
                                />
                            </div>
                            <button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0B1120] font-bold py-3.5 rounded-xl shadow-lg flex justify-center gap-2 transition-transform hover:scale-[1.02]">
                                <Plus size={18} strokeWidth={3}/> Agregar al Catálogo
                            </button>
                        </form>
                    )}
                     <p className={`mt-4 text-xs text-center ${theme.textSec}`}>Los cursos agregados aparecerán en los formularios de registro.</p>
                </div>
                
                {/* Lista de Cursos */}
                <div className="lg:col-span-2 grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {cursos.map(c=>(
                        <div key={c.id} className={`${theme.card} p-5 rounded-2xl border shadow-sm flex justify-between items-start gap-4 group hover:shadow-md transition-all`}>
                            <div>
                                <span className={`text-xs font-black uppercase tracking-wider mb-1 block ${theme.textAccent}`}>{c.nivel}</span>
                                <h4 className={`text-lg font-bold leading-tight ${theme.textMain}`}>{c.nombre}</h4>
                            </div>
                            {currentUserRole === 'admin' && (
                                <button onClick={()=>handleDelCurso(c.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0">
                                    <Trash2 size={18}/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
             </div>
        )}
      </main>

      {/* ================= MODALES (VENTANAS EMERGENTES) ================= */}
      {/* Se aplica el tema a todos los modales para corregir el fondo y texto */}

      {/* 1. MODAL EDITAR COMPLETO (Restaurado) */}
      {modalEditOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop borroso */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeAllModals}></div>
            
            {/* Contenedor del Modal */}
            <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl relative max-h-[92vh] overflow-hidden flex flex-col z-10 ${theme.modalBg}`}>
                {/* Cabecera */}
                <div className={`flex justify-between items-center p-5 border-b ${theme.modalHeader}`}>
                     <h3 className={`text-xl font-black flex items-center gap-2 ${theme.textMain}`}><Edit className={theme.textAccent}/> Editar Registro Oficial</h3>
                     <button onClick={closeAllModals} className={`p-2 rounded-full transition-colors ${theme.btnGhost}`}><X size={22}/></button>
                </div>

                {/* Formulario Scrollable */}
                <form onSubmit={guardarEdicion} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Sección 1: Datos Personales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2"><h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 mb-2 ${theme.textSec} border-slate-700/50`}>Información Personal</h4></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Nombre Completo</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.nombre} onChange={e=>setEditForm({...editForm, nombre:e.target.value})}/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>DNI / Cédula</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.dni} onChange={e=>setEditForm({...editForm, dni:e.target.value})}/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Celular</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.celular} onChange={e=>setEditForm({...editForm, celular:e.target.value})}/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>WhatsApp (Opcional)</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.whatsapp} onChange={e=>setEditForm({...editForm, whatsapp:e.target.value})}/></div>
                        <div className="md:col-span-2"><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Correo Electrónico</label><input type="email" className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.correo} onChange={e=>setEditForm({...editForm, correo:e.target.value})}/></div>
                    </div>

                     {/* Sección 2: Datos Laborales y Ubicación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                        <div className="md:col-span-2"><h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 mb-2 ${theme.textSec} border-slate-700/50`}>Datos Laborales y Ubicación</h4></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Institución Educativa</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.institucion} onChange={e=>setEditForm({...editForm, institucion:e.target.value})}/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>UGEL</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.ugel} onChange={e=>setEditForm({...editForm, ugel:e.target.value})}/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Ciudad / Región</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.ciudad} onChange={e=>setEditForm({...editForm, ciudad:e.target.value})}/></div>
                        <div>
                            <label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Condición Laboral</label>
                            <select className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none ${theme.input}`} value={editForm.condicion_laboral} onChange={e=>setEditForm({...editForm, condicion_laboral:e.target.value})}>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Nombrado</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Contratado</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Sin Vínculo Laboral</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Estudiante</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Otro</option>
                            </select>
                        </div>
                    </div>

                    {/* Sección 3: Información Académica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                        <div className="md:col-span-2"><h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 mb-2 ${theme.textSec} border-slate-700/50`}>Detalles del Programa</h4></div>
                        <div>
                            <label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Tipo de Registro</label>
                            <select className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none ${theme.input}`} value={editForm.tipo_registro} onChange={e=>setEditForm({...editForm, tipo_registro:e.target.value})}>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Diplomado</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Especialización</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Curso de Capacitación</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Curso de Actualización</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Taller</option>
                            </select>
                        </div>
                        <div>
                            <label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Modalidad de Estudio</label>
                            <select className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none ${theme.input}`} value={editForm.modalidad_estudio} onChange={e=>setEditForm({...editForm, modalidad_estudio:e.target.value})}>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Programa Completo (Regular)</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Acelerada</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Nombre del Programa / Curso</label>
                            <textarea className={`w-full border rounded-xl p-3 outline-none h-24 resize-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.programa || ''} onChange={e=>setEditForm({...editForm, programa:e.target.value})}/>
                        </div>
                    </div>

                    {/* Sección 4: Administrativo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2 items-end">
                         <div className="md:col-span-2"><h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 mb-2 ${theme.textSec} border-slate-700/50`}>Información Administrativa</h4></div>
                        <div>
                            <label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Modalidad de Pago</label>
                            <select className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none ${theme.input}`} value={editForm.modalidad_pago} onChange={e=>setEditForm({...editForm, modalidad_pago:e.target.value})}>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Pago a Cuenta</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Descuento por Planilla</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Pago al Contado</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Beca / Semi-beca</option>
                            </select>
                        </div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block text-amber-500`}>Número de Ficha Física</label><input className={`w-full border-2 border-amber-500/30 rounded-xl p-3 outline-none focus:border-amber-500 font-bold transition-all ${theme.input}`} value={editForm.numero_ficha_fisica || ''} onChange={e=>setEditForm({...editForm, numero_ficha_fisica:e.target.value})} placeholder="Ej: 001234"/></div>
                        <div className="md:col-span-2">
                            <label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Observaciones</label>
                            <textarea className={`w-full border rounded-xl p-3 outline-none h-20 resize-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={editForm.observaciones || ''} onChange={e=>setEditForm({...editForm, observaciones:e.target.value})} placeholder="Notas adicionales..."/>
                        </div>
                    </div>
                </form>

                {/* Footer con Botón de Guardar */}
                <div className={`p-5 border-t mt-auto ${theme.modalHeader}`}>
                    <button onClick={guardarEdicion} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0B1120] font-black py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-2">
                        <Check size={20} strokeWidth={3}/> Guardar Todos los Cambios
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MODAL FICHA COMPLETA (Solo Lectura, Restaurado) */}
      {modalFichaOpen && fichaData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={closeAllModals}></div>
            <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl relative my-8 overflow-hidden flex flex-col max-h-[95vh] z-10 ${theme.modalBg}`}>
                {/* Cabecera Ficha */}
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b gap-4 ${theme.modalHeader}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <GraduationCap className="text-amber-500" size={28}/>
                            <h2 className={`text-2xl font-black ${theme.textMain}`}>{fichaData.nombre} {fichaData.apellidos}</h2>
                        </div>
                        <div className={`flex flex-wrap gap-3 text-sm ${theme.textSec}`}>
                            <span className="flex items-center gap-1"><CreditCard size={14}/> {fichaData.dni}</span> • 
                            <span className={`font-bold uppercase ${theme.textAccent}`}>{fichaData.tipo_registro}</span> •
                            {fichaData.modalidad_estudio === 'Acelerada' && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold border border-purple-500/30">⚡ Acelerada</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-end md:self-auto">
                        <div className="text-right">
                             <p className={`text-xs font-bold uppercase ${theme.textSec}`}>Ficha Nº</p>
                             <p className="text-xl font-black text-amber-500">{fichaData.numero_ficha_fisica || 'S/N'}</p>
                        </div>
                        <button onClick={closeAllModals} className={`p-2 rounded-full ml-4 transition-colors ${theme.btnGhost}`}><X size={24}/></button>
                    </div>
                </div>
                
                {/* Cuerpo Ficha Scrollable */}
                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* 2.1. Resumen del Programa */}
                    <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-amber-50 border-amber-200'}`}>
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${theme.textAccent}`}><GraduationCap size={16}/> Programa Académico</h4>
                        <p className={`text-lg font-bold leading-tight ${theme.textMain}`}>{fichaData.programa}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className={`p-3 rounded-xl border ${theme.card}`}>
                                <span className={`text-xs block mb-1 ${theme.textSec}`}>Modalidad Pago</span>
                                <span className={`font-bold ${theme.textMain}`}>{fichaData.modalidad_pago}</span>
                            </div>
                            <div className={`p-3 rounded-xl border ${theme.card}`}>
                                <span className={`text-xs block mb-1 ${theme.textSec}`}>Condición</span>
                                <span className={`font-bold ${theme.textMain}`}>{fichaData.condicion_laboral}</span>
                            </div>
                            <div className={`p-3 rounded-xl border ${theme.card}`}>
                                <span className={`text-xs block mb-1 ${theme.textSec}`}>Asesor Responsable</span>
                                <span className={`font-bold text-emerald-500`}>{obtenerNombreAsesor(fichaData.promotor_email)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 2.2. Datos Personales y Contacto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 ${theme.textSec} border-slate-700/50`}>Información de Contacto</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <Phone size={18} className="text-slate-500 mt-0.5"/>
                                    <div><p className={`text-xs ${theme.textSec}`}>Celular / WhatsApp</p><p className={`font-medium ${theme.textMain}`}>{fichaData.celular} {fichaData.whatsapp && `/ ${fichaData.whatsapp}`}</p></div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Mail size={18} className="text-slate-500 mt-0.5"/>
                                    <div><p className={`text-xs ${theme.textSec}`}>Correo Electrónico</p><p className={`font-medium ${theme.textMain}`}>{fichaData.correo || 'No registrado'}</p></div>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 ${theme.textSec} border-slate-700/50`}>Ubicación y Trabajo</h4>
                            <ul className="space-y-3">
                                 <li className="flex items-start gap-3">
                                    <Briefcase size={18} className="text-slate-500 mt-0.5"/>
                                    <div><p className={`text-xs ${theme.textSec}`}>Institución / UGEL</p><p className={`font-medium ${theme.textMain}`}>{fichaData.institucion || '-'} / {fichaData.ugel || '-'}</p></div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <MapPin size={18} className="text-slate-500 mt-0.5"/>
                                    <div><p className={`text-xs ${theme.textSec}`}>Ciudad</p><p className={`font-medium ${theme.textMain}`}>{fichaData.ciudad || 'No registrada'}</p></div>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    {/* 2.3. Observaciones */}
                    {fichaData.observaciones && (
                        <div>
                            <h4 className={`text-xs font-black uppercase tracking-widest border-b pb-2 mb-2 ${theme.textSec} border-slate-700/50`}>Observaciones</h4>
                            <p className={`p-4 rounded-xl border text-sm italic ${theme.card} ${theme.textMain}`}>{fichaData.observaciones}</p>
                        </div>
                    )}

                    {/* 2.4. Historial de Pagos (Sección Final) */}
                    <div className={`pt-6 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-end mb-4">
                            <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textMain}`}><DollarSign className="text-emerald-500"/> Historial de Pagos</h3>
                            <div className={`text-right px-4 py-2 rounded-xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                                <p className={`text-xs ${theme.textSec}`}>Monto Total Pagado</p>
                                <p className="text-2xl font-black text-emerald-500">S/ {historialPagos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0).toFixed(2)}</p>
                            </div>
                        </div>
                        
                        {historialPagos.length === 0 ? (
                            <p className={`text-center py-6 border rounded-xl border-dashed opacity-70 ${theme.card} ${theme.textSec}`}>No hay pagos registrados para este cliente.</p>
                        ) : (
                            <div className={`rounded-xl border overflow-hidden shadow-sm ${theme.card}`}>
                                <table className={`w-full text-sm text-left ${theme.tableDivide}`}>
                                    <thead className={theme.tableHeader}><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Medio de Pago</th><th className="px-4 py-3 text-center">Recibo</th><th className="px-4 py-3 text-right">Monto</th></tr></thead>
                                    <tbody className={`divide-y ${theme.tableDivide}`}>
                                        {historialPagos.map((pago) => (
                                            <tr key={pago.id} className={theme.tableRow}>
                                                <td className={`px-4 py-3 font-mono text-xs ${theme.textSec}`}>{pago.fecha_pago}</td>
                                                <td className={`px-4 py-3 font-bold ${theme.textMain}`}>{pago.concepto}</td>
                                                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${darkMode?'bg-slate-800 text-slate-300 border border-slate-700':'bg-gray-100 text-gray-600 border border-gray-200'}`}>{pago.medio_pago}</span></td>
                                                <td className="px-4 py-3 text-center">{pago.material_entregado ? <span className="text-emerald-500" title="Enviado"><Check size={16}/></span> : <span className="text-slate-400 text-xs">-</span>}</td>
                                                <td className="px-4 py-3 text-right font-mono text-emerald-500 font-black">S/ {parseFloat(pago.monto).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 3. MODAL REGISTRAR PAGO (Restaurado) */}
      {modalPayOpen && payData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={closeAllModals}></div>
            <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 relative z-10 ${theme.modalBg}`}>
                <button onClick={closeAllModals} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${theme.btnGhost}`}><X size={20}/></button>
                <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-500/20">
                        <DollarSign className="text-emerald-500" size={32}/>
                    </div>
                    <h2 className={`text-2xl font-black ${theme.textMain}`}>Registrar Pago</h2>
                    <p className={`text-sm mt-2 font-medium ${theme.textSec}`}>Cliente: {payData.nombre}</p>
                </div>
                <form onSubmit={registrarPago} className="space-y-5">
                    <div>
                        <label className={`text-xs font-bold uppercase ml-1 mb-1 block ${theme.inputLabel}`}>Concepto del Pago</label>
                        <input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme.input}`} value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto:e.target.value})} placeholder="Ej: Cuota 1, Matrícula..." required/>
                    </div>
                     <div>
                        <label className={`text-xs font-bold uppercase ml-1 mb-1 block ${theme.textAccent}`}>Monto (S/)</label>
                        <input type="number" step="0.01" className={`w-full border-2 border-emerald-500/30 rounded-xl p-4 text-2xl font-black text-center outline-none focus:border-emerald-500 transition-all ${theme.input} text-emerald-500`} value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto:e.target.value})} placeholder="0.00" required/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`text-xs font-bold uppercase ml-1 mb-1 block ${theme.inputLabel}`}>Medio de Pago</label>
                            <select className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none ${theme.input}`} value={nuevoPago.medio_pago} onChange={e=>setNuevoPago({...nuevoPago, medio_pago:e.target.value})}>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Descuento por Planilla</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Efectivo</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Yape / Plin</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Depósito BCP</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Depósito BBVA</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Depósito Interbank</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Banco de la Nación</option>
                                <option className={darkMode ? 'bg-[#0B1120]' : ''}>Otro</option>
                            </select>
                        </div>
                         <div>
                            <label className={`text-xs font-bold uppercase ml-1 mb-1 block ${theme.inputLabel}`}>Fecha</label>
                            <input type="date" className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${theme.input} text-center`} value={nuevoPago.fecha_pago} onChange={e=>setNuevoPago({...nuevoPago, fecha_pago:e.target.value})} required/>
                        </div>
                    </div>
                    
                    <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 rounded-xl flex justify-center gap-2 mt-4 shadow-lg transition-transform hover:scale-[1.02]">
                        <DollarSign size={20} strokeWidth={3}/> Confirmar Pago
                    </button>
                    <p className={`text-xs text-center opacity-75 ${theme.textSec}`}>Se enviará un correo de confirmación al cliente.</p>
                </form>
            </div>
        </div>
      )}

      {/* 4. MODAL USUARIO (Equipo - Restaurado) */}
      {modalUserOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={closeAllModals}></div>
            <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-8 relative z-10 ${theme.modalBg}`}>
                <button onClick={closeAllModals} className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${theme.btnGhost}`}><X size={20}/></button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20"><User size={28}/></div>
                    <h3 className={`font-black text-2xl ${theme.textMain}`}>{userForm.id ? 'Editar Usuario' : 'Nuevo Personal'}</h3>
                </div>
                <form onSubmit={guardarUsuario} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Nombres</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})} required/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Apellidos</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={userForm.apellidos} onChange={e=>setUserForm({...userForm, apellidos:e.target.value})} required/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>DNI (Será la contraseña)</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={userForm.dni} onChange={e=>setUserForm({...userForm, dni:e.target.value})} required disabled={userForm.id} title={userForm.id ? "No se puede cambiar el DNI" : ""}/></div>
                        <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Celular</label><input className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={userForm.celular} onChange={e=>setUserForm({...userForm, celular:e.target.value})}/></div>
                    </div>
                    <div><label className={`text-xs font-bold ml-1 mb-1 block ${theme.inputLabel}`}>Correo Electrónico (Acceso)</label><input type="email" className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${theme.input}`} value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} required/></div>
                    <div>
                        <label className={`text-xs font-bold ml-1 mb-1 block ${theme.textAccent}`}>Rol en el Sistema</label>
                        <select className={`w-full border-2 border-amber-500/30 rounded-xl p-3 outline-none focus:border-amber-500 transition-all appearance-none font-bold ${theme.input}`} value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})}>
                            <option className={darkMode ? 'bg-[#0B1120]' : ''} value="promotor">Promotor (Ventas básicas)</option>
                            <option className={darkMode ? 'bg-[#0B1120]' : ''} value="supervisor">Supervisor (Solo lectura/aprobación)</option>
                            <option className={darkMode ? 'bg-[#0B1120]' : ''} value="admin">Administrador (Acceso total)</option>
                        </select>
                    </div>
                    <button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#0B1120] font-black py-4 rounded-xl mt-6 shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                        <Check size={20} strokeWidth={3}/> {userForm.id ? 'Actualizar Datos' : 'Crear Usuario'}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

// Estilos CSS adicionales para el scrollbar y animaciones
const customStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 10px; }
  .animate-fadeIn { animation: fadeIn 0.3s ease-in-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-spin-slow { animation: spin 3s linear infinite; }
  .animate-pulse-slow { animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
`;
// Inyectar estilos
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = customStyles;
    document.head.appendChild(styleSheet);
}

export default Dashboard;