import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Search, FileText, User, Plus, Trash2, Edit, X, BarChart3, TrendingUp, Users, Shield, Power, Eye, Upload, Building, MapPin, Phone, CheckCircle, Save, Lock } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('ventas'); // Vistas: ventas, usuarios, reportes, configuracion
  const [darkMode, setDarkMode] = useState(true);

  // --- DATOS DE SESIÓN ---
  const [currentUser, setCurrentUser] = useState({ role: 'promotor', email: '', nombre: '' });
  
  // --- DATOS DEL SISTEMA ---
  const [usuarios, setUsuarios] = useState([]);
  const [ventas, setVentas] = useState([]); // Clientes registrados
  const [empresa, setEmpresa] = useState({ nombre_empresa: 'ICADE', logo_url: '' });

  // --- ESTADOS PARA FORMULARIO PROMOTOR (Registrar Participante) ---
  const [formPromotor, setFormPromotor] = useState({
      nombres: '', apPaterno: '', apMaterno: '', dni: '', celular: '', whatsapp: '', ciudad: '',
      condicionLaboral: 'Prof. Inicial',
      estaLaborando: true, // Checkbox
      centroLaboral: '', ugel: '', situacionLaboral: 'Contratado',
      tipoPrograma: 'Programa Completo',
      medioPago: 'Descuento por Planilla',
      numCuotas: 1, montoCuota: 0, totalPagar: 0,
      fotoDni: null, fotoContrato: null
  });
  const [uploading, setUploading] = useState(false);

  // --- ESTADOS PARA GESTIÓN DE USUARIOS (Admin) ---
  const [modalUserOpen, setModalUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true });

  // --- ESTADOS AUXILIARES (Admin/Supervisor) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPromoter, setFilterPromoter] = useState('');

  useEffect(() => {
      const role = localStorage.getItem('role') || 'promotor';
      const email = localStorage.getItem('user_email');
      const nombre = localStorage.getItem('user_name');
      setCurrentUser({ role, email, nombre });
      
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') setDarkMode(false);

      fetchData();
  }, []);

  // Recalcular total automáticamente cuando cambian cuotas o monto
  useEffect(() => {
      const total = (parseInt(formPromotor.numCuotas) || 0) * (parseFloat(formPromotor.montoCuota) || 0);
      setFormPromotor(prev => ({ ...prev, totalPagar: total }));
  }, [formPromotor.numCuotas, formPromotor.montoCuota]);

  const fetchData = async () => {
      setLoading(true);
      const { data: u } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
      const { data: v } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
      const { data: c } = await supabase.from('configuracion').select('*').single();
      
      setUsuarios(u || []);
      setVentas(v || []);
      if(c) setEmpresa(c);
      setLoading(false);
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };
  const toggleTheme = () => { setDarkMode(!darkMode); localStorage.setItem('theme', !darkMode ? 'dark' : 'light'); };

  // --- LÓGICA DEL PROMOTOR: REGISTRAR PARTICIPANTE ---
  const handleFileUpload = async (file, tipo) => {
      if (!file) return null;
      const fileName = `${tipo}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('documentos').upload(fileName, file);
      if (error) { alert(`Error subiendo ${tipo}`); return null; }
      const { data } = supabase.storage.from('documentos').getPublicUrl(fileName);
      return data.publicUrl;
  };

  const submitPromotorForm = async (e) => {
      e.preventDefault();
      setUploading(true);
      
      // 1. Subir fotos
      const urlDni = await handleFileUpload(formPromotor.fotoDni, 'dni');
      const urlContrato = await handleFileUpload(formPromotor.fotoContrato, 'contrato');

      // 2. Preparar datos
      const nuevoCliente = {
          nombre: formPromotor.nombres, // Guardamos nombre base para búsquedas simples
          ap_paterno: formPromotor.apPaterno,
          ap_materno: formPromotor.apMaterno,
          dni: formPromotor.dni,
          celular: formPromotor.celular,
          whatsapp: formPromotor.whatsapp,
          ciudad: formPromotor.ciudad,
          condicion_laboral: formPromotor.condicionLaboral,
          esta_laborando: formPromotor.estaLaborando,
          centro_laboral: formPromotor.estaLaborando ? formPromotor.centroLaboral : null,
          ugel_dre: formPromotor.estaLaborando ? formPromotor.ugel : null,
          situacion_laboral: formPromotor.estaLaborando ? formPromotor.situacionLaboral : null,
          tipo_programa: formPromotor.tipoPrograma,
          modalidad_pago: formPromotor.medioPago,
          num_cuotas: formPromotor.numCuotas,
          monto_cuota: formPromotor.montoCuota,
          total_pagar: formPromotor.totalPagar,
          foto_dni_url: urlDni,
          foto_contrato_url: urlContrato,
          promotor_email: currentUser.email,
          promotor_nombre: currentUser.nombre,
          estado_ficha: 'pendiente'
      };

      const { error } = await supabase.from('clientes').insert([nuevoCliente]);
      
      if (!error) {
          alert("¡Participante Registrado Exitosamente!");
          // Resetear formulario
          setFormPromotor({
              nombres: '', apPaterno: '', apMaterno: '', dni: '', celular: '', whatsapp: '', ciudad: '',
              condicionLaboral: 'Prof. Inicial', estaLaborando: true, centroLaboral: '', ugel: '', situacionLaboral: 'Contratado',
              tipoPrograma: 'Programa Completo', medioPago: 'Descuento por Planilla', numCuotas: 1, montoCuota: 0, totalPagar: 0,
              fotoDni: null, fotoContrato: null
          });
      } else {
          alert("Error al registrar: " + error.message);
      }
      setUploading(false);
  };

  // --- LÓGICA DE USUARIOS (ADMIN) ---
  const guardarUsuario = async (e) => {
      e.preventDefault();
      // Si es Supervisor, NO PUEDE GUARDAR (doble check de seguridad)
      if (currentUser.role === 'supervisor') return; 

      const payload = { ...userForm, password: userForm.dni }; 
      let error;
      
      if (userForm.id) {
          const { error: err } = await supabase.from('usuarios').update(payload).eq('id', userForm.id);
          error = err;
      } else {
          const { id, ...newPayload } = payload;
          const { error: err } = await supabase.from('usuarios').insert([newPayload]);
          error = err;
      }

      if (!error) {
          alert("Usuario guardado correctamente.");
          setModalUserOpen(false);
          fetchData();
      } else {
          alert("Error: " + error.message);
      }
  };

  const eliminarUsuario = async (id) => {
      if (currentUser.role === 'supervisor') return;
      if (confirm("¿Estás seguro de eliminar este usuario?")) {
          await supabase.from('usuarios').delete().eq('id', id);
          fetchData();
      }
  };

  // --- TEMA VISUAL ---
  const theme = {
      bg: darkMode ? 'bg-[#0B1120]' : 'bg-slate-200',
      text: darkMode ? 'text-slate-200' : 'text-slate-900',
      card: darkMode ? 'bg-[#151e32] border-slate-800' : 'bg-white border-slate-300 shadow-md',
      input: darkMode ? 'bg-[#0B1120] border-slate-700 text-white' : 'bg-slate-50 border-slate-400 text-slate-900',
      btnGhost: darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-700 border-slate-400 hover:bg-slate-100 shadow-sm',
      modalBg: darkMode ? 'bg-[#151e32] border-slate-700' : 'bg-slate-50 border-slate-300 shadow-2xl',
  };

  // ==========================================
  // VISTA 1: PROMOTOR - REGISTRAR PARTICIPANTE
  // ==========================================
  if (currentUser.role === 'promotor') {
      return (
        <div className={`min-h-screen p-4 md:p-8 flex justify-center ${theme.bg} ${theme.text}`}>
            <div className="w-full max-w-5xl">
                <header className={`flex justify-between items-center mb-6 p-4 rounded-2xl border shadow-lg ${theme.card}`}>
                    <div><h1 className="text-2xl font-bold">Registrar Participante</h1><p className="text-xs text-amber-500 font-bold uppercase">{currentUser.nombre}</p></div>
                    <button onClick={handleLogout} className="bg-rose-500/10 text-rose-500 p-3 rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"><LogOut size={20}/></button>
                </header>

                <form onSubmit={submitPromotorForm} className={`p-8 rounded-3xl border shadow-2xl ${theme.card}`}>
                    {/* SECCIÓN 1: DATOS PERSONALES */}
                    <h3 className="text-amber-500 font-bold mb-6 text-sm uppercase border-b border-slate-700 pb-2">1. Datos Personales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div><label className="text-xs opacity-70 ml-1">Ap. Paterno</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.apPaterno} onChange={e=>setFormPromotor({...formPromotor, apPaterno:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">Ap. Materno</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.apMaterno} onChange={e=>setFormPromotor({...formPromotor, apMaterno:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">Nombres</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.nombres} onChange={e=>setFormPromotor({...formPromotor, nombres:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">DNI</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.dni} onChange={e=>setFormPromotor({...formPromotor, dni:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">Celular</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.celular} onChange={e=>setFormPromotor({...formPromotor, celular:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">WhatsApp</label><input className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.whatsapp} onChange={e=>setFormPromotor({...formPromotor, whatsapp:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">Ciudad</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.ciudad} onChange={e=>setFormPromotor({...formPromotor, ciudad:e.target.value})}/></div>
                    </div>

                    {/* SECCIÓN 2: DATOS LABORALES */}
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-6">
                        <h3 className="text-amber-500 font-bold text-sm uppercase">2. Datos Laborales</h3>
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-700/30 px-3 py-1 rounded-lg border border-slate-600"><input type="checkbox" checked={!formPromotor.estaLaborando} onChange={e=>setFormPromotor({...formPromotor, estaLaborando: !e.target.checked})} className="accent-amber-500"/> <span className="text-xs font-bold">NO está laborando actualmente</span></label>
                    </div>
                    
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 ${!formPromotor.estaLaborando ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div><label className="text-xs opacity-70 ml-1">Condición</label><select className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.condicionLaboral} onChange={e=>setFormPromotor({...formPromotor, condicionLaboral:e.target.value})}><option>Prof. Inicial</option><option>Prof. Primaria</option><option>Prof. Secundaria</option><option>Auxiliar</option><option>Administrativo</option><option>Otros</option></select></div>
                        <div><label className="text-xs opacity-70 ml-1">Centro Laboral</label><input className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.centroLaboral} onChange={e=>setFormPromotor({...formPromotor, centroLaboral:e.target.value})}/></div>
                        <div className="flex gap-4">
                            <div className="w-2/3"><label className="text-xs opacity-70 ml-1">UGEL / DRE</label><input className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.ugel} onChange={e=>setFormPromotor({...formPromotor, ugel:e.target.value})}/></div>
                            <div className="w-1/3"><label className="text-xs opacity-70 ml-1">Situación</label><select className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.situacionLaboral} onChange={e=>setFormPromotor({...formPromotor, situacionLaboral:e.target.value})}><option>Contratado</option><option>Nombrado</option></select></div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: PROGRAMA Y PAGO */}
                    <h3 className="text-amber-500 font-bold mb-6 text-sm uppercase border-b border-slate-700 pb-2">3. Programa y Pagos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="md:col-span-2"><label className="text-xs opacity-70 ml-1">Tipo de Programa</label><select className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.tipoPrograma} onChange={e=>setFormPromotor({...formPromotor, tipoPrograma:e.target.value})}><option>Programa Completo</option><option>Acelerado</option></select></div>
                        <div className="md:col-span-2"><label className="text-xs opacity-70 ml-1">Modalidad Pago</label><select className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.medioPago} onChange={e=>setFormPromotor({...formPromotor, medioPago:e.target.value})}><option>Descuento por Planilla</option><option>Pago a Cuenta</option></select></div>
                        <div><label className="text-xs opacity-70 ml-1">N° Cuotas</label><input type="number" min="1" className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.numCuotas} onChange={e=>setFormPromotor({...formPromotor, numCuotas:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70 ml-1">Monto Cuota</label><input type="number" min="0" className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={formPromotor.montoCuota} onChange={e=>setFormPromotor({...formPromotor, montoCuota:e.target.value})}/></div>
                        <div className="md:col-span-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 flex flex-col justify-center items-center"><span className="text-xs text-emerald-500 font-bold uppercase">Total a Pagar</span><span className="text-2xl font-bold text-emerald-400">S/ {formPromotor.totalPagar.toFixed(2)}</span></div>
                    </div>

                    {/* SECCIÓN 4: DOCUMENTOS */}
                    <h3 className="text-amber-500 font-bold mb-6 text-sm uppercase border-b border-slate-700 pb-2">4. Documentación</h3>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 ${theme.input} hover:border-amber-500 transition-colors`}>
                            <Upload className="text-slate-400"/>
                            <span className="text-xs font-bold">Foto DNI</span>
                            <input type="file" className="text-xs" onChange={e=>setFormPromotor({...formPromotor, fotoDni: e.target.files[0]})}/>
                        </div>
                        <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 ${theme.input} hover:border-amber-500 transition-colors`}>
                            <Upload className="text-slate-400"/>
                            <span className="text-xs font-bold">Foto Contrato</span>
                            <input type="file" className="text-xs" onChange={e=>setFormPromotor({...formPromotor, fotoContrato: e.target.files[0]})}/>
                        </div>
                    </div>

                    <button disabled={uploading} className="w-full bg-amber-500 hover:bg-amber-600 text-[#0B1120] font-black py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.01] flex justify-center gap-2 items-center">
                        {uploading ? 'Subiendo datos...' : <><Save size={20}/> REGISTRAR PARTICIPANTE</>}
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // ==========================================
  // VISTA 2: ADMIN Y SUPERVISOR
  // ==========================================
  const isSupervisor = currentUser.role === 'supervisor';

  return (
    <div className={`min-h-screen font-sans pb-20 relative transition-colors duration-300 ${theme.bg} ${theme.text}`}>
      <nav className={`${theme.nav} px-6 py-4 flex justify-between items-center gap-4 sticky top-0 z-40 border-b`}>
        <div className="flex items-center gap-3">
            {empresa.logo_url ? <img src={empresa.logo_url} className="w-10 h-10 object-contain rounded bg-white p-1"/> : <div className="w-10 h-10 bg-amber-500 rounded flex items-center justify-center font-bold text-black">I</div>}
            <div><h1 className="text-xl font-bold uppercase">{empresa.nombre_empresa}</h1><p className="text-[10px] uppercase font-bold opacity-70">{currentUser.role} {isSupervisor && '(Solo Lectura)'}</p></div>
        </div>
        <div className="flex gap-3 items-center">
            <button onClick={toggleTheme} className={`p-2 rounded-lg border ${theme.btnGhost}`}>{darkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100 border border-slate-300'}`}>
                {/* MENU ADMIN/SUPERVISOR */}
                {['ventas', 'usuarios', 'configuracion'].map(v => (
                    <button key={v} onClick={()=>setView(v)} className={`px-4 py-1.5 rounded-md text-sm font-bold capitalize ${view===v ? 'bg-amber-500 text-black' : 'opacity-70 hover:opacity-100'}`}>
                        {v === 'usuarios' ? 'Gestión Usuarios' : v}
                    </button>
                ))}
            </div>
            <button onClick={handleLogout} className={`p-2 rounded-lg text-rose-500 border ${theme.btnGhost}`}><LogOut size={20}/></button>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto p-6">
        
        {/* VISTA: LISTA DE PARTICIPANTES (VENTAS) */}
        {view === 'ventas' && (
            <div className={`${theme.card} rounded-2xl border overflow-hidden shadow-xl`}>
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                    <h2 className="font-bold text-lg flex items-center gap-2"><Users className="text-emerald-500"/> Participantes Registrados</h2>
                    <div className="relative"><Search className="absolute left-3 top-2.5 opacity-50" size={16}/><input placeholder="Buscar participante..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={`w-64 border rounded-xl py-2 pl-9 text-xs outline-none ${theme.input}`}/></div>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className={`${darkMode?'bg-[#0f1623] text-amber-500':'bg-slate-100 text-slate-800'} font-bold text-xs uppercase border-b ${darkMode?'border-slate-800':'border-slate-300'}`}>
                        <tr><th className="p-4">Participante</th><th className="p-4">DNI / Celular</th><th className="p-4">Programa</th><th className="p-4">Promotor</th><th className="p-4">Pago</th></tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode?'divide-slate-800':'divide-slate-300'}`}>
                        {ventas.filter(v => (v.nombre||'').toLowerCase().includes(searchTerm.toLowerCase())).map(v => (
                            <tr key={v.id} className={darkMode?'hover:bg-[#1a253a]':'hover:bg-blue-50'}>
                                <td className="p-4 font-bold">{v.nombre} {v.ap_paterno}</td>
                                <td className="p-4"><div className="flex flex-col"><span className="font-mono">{v.dni}</span><span className="text-xs opacity-70">{v.celular}</span></div></td>
                                <td className="p-4"><span className="bg-blue-500/20 text-blue-500 px-2 py-1 rounded text-xs font-bold">{v.tipo_programa}</span></td>
                                <td className="p-4 text-xs font-bold text-amber-500 uppercase">{v.promotor_nombre}</td>
                                <td className="p-4 font-mono font-bold text-emerald-500">S/ {v.total_pagar}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* VISTA: GESTIÓN DE USUARIOS (CREAR/EDITAR/ELIMINAR) */}
        {view === 'usuarios' && (
            <div className="space-y-6">
                <div className={`p-6 rounded-2xl border flex justify-between items-center ${theme.card}`}>
                    <div><h2 className="text-2xl font-bold">Usuarios del Sistema</h2><p className="opacity-70 text-sm">Administra Promotores, Supervisores y Administradores.</p></div>
                    {/* Botón Crear: OCULTO PARA SUPERVISOR */}
                    {!isSupervisor && (
                        <button onClick={()=>{setUserForm({ id: null, nombre: '', apellidos: '', dni: '', celular: '', email: '', rol: 'promotor', activo: true }); setModalUserOpen(true)}} className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-transform hover:scale-105">
                            <Plus size={20}/> Nuevo Usuario
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {usuarios.map(u => (
                        <div key={u.id} className={`p-5 rounded-2xl border relative group transition-all hover:shadow-xl ${theme.card}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${u.rol==='admin'?'bg-rose-500 text-white':u.rol==='supervisor'?'bg-purple-500 text-white':'bg-emerald-500 text-white'}`}>{u.nombre?.charAt(0)}</div>
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">{u.nombre} {u.apellidos}</h4>
                                    <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded border mt-1 inline-block ${u.rol==='admin'?'border-rose-500/50 text-rose-500':u.rol==='supervisor'?'border-purple-500/50 text-purple-500':'border-emerald-500/50 text-emerald-500'}`}>{u.rol}</span>
                                </div>
                            </div>
                            <div className="mt-4 space-y-1 text-sm opacity-70">
                                <p className="flex items-center gap-2"><User size={14}/> {u.dni}</p>
                                <p className="flex items-center gap-2"><Phone size={14}/> {u.celular}</p>
                                <p className="flex items-center gap-2"><Shield size={14}/> {u.email}</p>
                            </div>
                            
                            {/* Acciones: OCULTAS PARA SUPERVISOR */}
                            {!isSupervisor && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={()=>{setUserForm(u); setModalUserOpen(true)}} className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white"><Edit size={16}/></button>
                                    <button onClick={()=>eliminarUsuario(u.id)} className="p-2 rounded-lg bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"><Trash2 size={16}/></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* VISTA: CONFIGURACIÓN (Solo lectura para Supervisor) */}
        {view === 'configuracion' && (
             <div className={`max-w-xl mx-auto p-8 rounded-2xl border shadow-lg ${theme.card}`}>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Building/> Configuración de Empresa</h2>
                {isSupervisor && <div className="mb-4 bg-amber-500/20 text-amber-500 p-3 rounded-lg text-xs font-bold flex items-center gap-2"><Lock size={16}/> Modo Supervisor: Solo Lectura</div>}
                
                <div className="space-y-4 opacity-100">
                    <div className="flex items-center gap-4 p-4 border rounded-xl border-slate-700">
                        {empresa.logo_url && <img src={empresa.logo_url} className="h-12 w-12 object-contain"/>}
                        <div><p className="text-xs opacity-50 uppercase">Nombre del Sistema</p><p className="font-bold text-lg">{empresa.nombre_empresa}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border rounded-xl border-slate-700"><p className="text-xs opacity-50">RUC</p><p className="font-mono">{empresa.ruc || '-'}</p></div>
                        <div className="p-3 border rounded-xl border-slate-700"><p className="text-xs opacity-50">Celular</p><p className="font-mono">{empresa.celular || '-'}</p></div>
                    </div>
                    <div className="p-3 border rounded-xl border-slate-700"><p className="text-xs opacity-50">Dirección</p><p>{empresa.direccion || '-'}</p></div>
                </div>
             </div>
        )}

      </main>

      {/* MODAL CREAR/EDITAR USUARIO (Solo renderiza si no es supervisor) */}
      {modalUserOpen && !isSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={()=>setModalUserOpen(false)}>
            <div className={`w-full max-w-lg rounded-3xl border p-8 relative ${theme.modalBg}`} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setModalUserOpen(false)} className="absolute top-4 right-4"><X/></button>
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><User className="text-amber-500"/> {userForm.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                <form onSubmit={guardarUsuario} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs opacity-70">Nombres</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={userForm.nombre} onChange={e=>setUserForm({...userForm, nombre:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70">Apellidos</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={userForm.apellidos} onChange={e=>setUserForm({...userForm, apellidos:e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs opacity-70">DNI (Será la clave)</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={userForm.dni} onChange={e=>setUserForm({...userForm, dni:e.target.value})}/></div>
                        <div><label className="text-xs opacity-70">Celular</label><input required className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={userForm.celular} onChange={e=>setUserForm({...userForm, celular:e.target.value})}/></div>
                    </div>
                    <div><label className="text-xs opacity-70">Correo (Usuario)</label><input required type="email" className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})}/></div>
                    
                    <div><label className="text-xs opacity-70">Rol de Acceso</label>
                    <select className={`w-full rounded-xl p-3 border outline-none ${theme.input}`} value={userForm.rol} onChange={e=>setUserForm({...userForm, rol:e.target.value})}>
                        <option value="promotor">Promotor (Ventas)</option>
                        <option value="supervisor">Supervisor (Solo Ver)</option>
                        <option value="admin">Administrador (Total)</option>
                    </select></div>

                    <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl mt-4">Guardar Usuario</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;