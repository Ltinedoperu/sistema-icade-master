import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { guardarVentaLocal, contarVentasLocales, sincronizarCursosLocales, obtenerCursosOffline } from '../db';
import { Wifi, WifiOff, Camera, User, CreditCard, LogOut, BookOpen, Search, X, Plus, Briefcase, FileText, CheckSquare, Square, Layers, List, ArrowLeft, MapPin, GraduationCap, Zap, Calculator, Database, Globe, Clock, FileDigit } from 'lucide-react';

const Formulario = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [view, setView] = useState('form');
  const [misVentas, setMisVentas] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState(null);
  
  const [listaCursos, setListaCursos] = useState([]); 
  const [nivelFiltro, setNivelFiltro] = useState('Inicial');
  const [temasSeleccionados, setTemasSeleccionados] = useState([]);
  const [busquedaTema, setBusquedaTema] = useState('');
  const [sugerencias, setSugerencias] = useState([]);

  const [noLabora, setNoLabora] = useState(false);
  const [fotoDni, setFotoDni] = useState(null);
  const [fotoContrato, setFotoContrato] = useState(null);
  
  // Reloj
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [formData, setFormData] = useState({
    apellido_paterno: '', apellido_materno: '', nombres: '', dni: '', celular: '', whatsapp: '', correo: '', direccion: '', 
    nivel: 'Primaria', ugel: '', ie: '', condicion_laboral: 'Contratado', modalidad_pago: 'Pago a Cuenta', observaciones: '',
    tipo_registro: 'Diplomado', modalidad_estudio: 'Programa Completo',
    monto_mensual: '', num_cuotas: '1', total_pagar: '',
    // AQUÍ ESTÁ EL CAMPO NUEVO (PUNTO 2)
    numero_ficha_fisica: '', 
    ciudad: ''
  });

  const promotorEmail = localStorage.getItem('userEmail') || 'anonimo';
  const promotorNombre = localStorage.getItem('userName') || 'Promotor';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);

    updatePendingCount();
    cargarCursos();
    return () => { 
        window.removeEventListener('online', handleOnline); 
        window.removeEventListener('offline', handleOffline);
        clearInterval(timer);
    };
  }, []);

  // Calculadora automática
  useEffect(() => {
      const mensual = parseFloat(formData.monto_mensual) || 0;
      const cuotas = parseInt(formData.num_cuotas) || 0;
      if (mensual > 0 && cuotas > 0) {
          setFormData(prev => ({ ...prev, total_pagar: (mensual * cuotas).toFixed(2) }));
      }
  }, [formData.monto_mensual, formData.num_cuotas]);

  useEffect(() => {
    if (busquedaTema.trim() === '') { setSugerencias([]); return; }
    const filtrados = listaCursos.filter(c => 
        c.nivel === nivelFiltro && 
        c.nombre.toLowerCase().includes(busquedaTema.toLowerCase()) &&
        !temasSeleccionados.includes(c.nombre)
    );
    setSugerencias(filtrados.slice(0, 5));
  }, [busquedaTema, listaCursos, nivelFiltro, temasSeleccionados]);

  useEffect(() => {
    if (noLabora) { setFormData(prev => ({ ...prev, ie: 'Ninguno', ugel: 'Ninguno', condicion_laboral: 'Sin Vínculo' })); }
    else { 
        if(formData.condicion_laboral === 'Sin Vínculo') { 
            setFormData(prev => ({ ...prev, ie: '', ugel: '', condicion_laboral: 'Contratado' })); 
        } 
    }
  }, [noLabora]);

  const cargarCursos = async () => {
    if (navigator.onLine) {
        const { data } = await supabase.from('cursos').select('*');
        if (data) { setListaCursos(data); sincronizarCursosLocales(data); }
    } else { const c = await obtenerCursosOffline(); setListaCursos(c); }
  };

  const updatePendingCount = async () => { const count = await contarVentasLocales(); setPendingCount(count); };

  const verReporte = async () => {
    setView('reporte');
    if (isOnline) {
        const { data } = await supabase.from('clientes').select('*').eq('promotor_email', promotorEmail).order('created_at', { ascending: false });
        setMisVentas(data || []);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };
  const handleMockSearch = (e) => { e.preventDefault(); alert("Consulta RENIEC/PADRÓN: Disponible próximamente."); };

  const uploadFile = async (file, folder) => {
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
    const { error } = await supabase.storage.from('evidencias').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('evidencias').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Validaciones
    if (formData.dni.length !== 8) { alert("El DNI debe tener 8 dígitos."); return; }
    if (formData.celular.length !== 9) { alert("El celular debe tener 9 dígitos."); return; }
    if (temasSeleccionados.length === 0) { alert("Selecciona al menos un tema."); return; }
    
    // Validación Punto 2: Si el promotor tiene ficha física, es ideal que la ponga, pero no bloqueante si es digital 100%
    // Si quieres que sea obligatorio descomenta esto:
    // if (!formData.numero_ficha_fisica) { alert("Ingrese el N° de Ficha Física."); return; }

    const nombreCompleto = `${formData.apellido_paterno} ${formData.apellido_materno}, ${formData.nombres}`;
    const programaFinal = temasSeleccionados.join(', ');

    const ventaData = {
      ...formData, nombre: nombreCompleto, institucion: formData.ie, programa: programaFinal, promotor_email: promotorEmail, promotor_nombre: promotorNombre,
      timestamp: Date.now(), foto_dni_blob: fotoDni, foto_contrato_blob: fotoContrato,
    };

    try {
      if (isOnline) {
        let dniUrl = '', contratoUrl = '';
        if (fotoDni) dniUrl = await uploadFile(fotoDni, 'dni');
        if (fotoContrato) contratoUrl = await uploadFile(fotoContrato, 'contratos');

        // AQUÍ SE ENVÍA A LA BASE DE DATOS
        const { error } = await supabase.from('clientes').insert([{
            ...formData, // Esto incluye 'numero_ficha_fisica'
            nombre: nombreCompleto, institucion: formData.ie, programa: programaFinal, promotor_email: promotorEmail, promotor_nombre: promotorNombre,
            foto_dni_url: dniUrl, foto_contrato_url: contratoUrl, estado_ficha: 'pendiente'
        }]);
        
        if (error) throw error;
        setMessage({ text: 'Registro guardado CORRECTAMENTE.', type: 'success' });
      } else {
        await guardarVentaLocal(ventaData);
        setMessage({ text: 'Guardado OFFLINE (Sincronizar luego).', type: 'success' });
        updatePendingCount();
      }
      
      // Limpiar
      setFormData({ 
          apellido_paterno: '', apellido_materno: '', nombres: '', dni: '', celular: '', whatsapp: '', correo: '', direccion: '', 
          nivel: 'Primaria', ugel: '', ie: '', condicion_laboral: 'Contratado', modalidad_pago: 'Pago a Cuenta', observaciones: '', 
          tipo_registro: 'Diplomado', modalidad_estudio: 'Programa Completo',
          monto_mensual: '', num_cuotas: '1', total_pagar: '',
          numero_ficha_fisica: '', ciudad: ''
      });
      setTemasSeleccionados([]); setNoLabora(false); setFotoDni(null); setFotoContrato(null);
      window.scrollTo(0, 0);
    } catch (error) { console.error(error); setMessage({ text: 'Error al guardar: ' + error.message, type: 'error' }); }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 pb-20 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 bg-[#151e32] p-4 rounded-2xl border border-slate-800 shadow-xl sticky top-2 z-50">
          <div><h2 className="text-xl font-bold text-white tracking-tight">{view === 'form' ? 'Registro de Participantes' : 'Mis Registros'}</h2><p className="text-xs text-amber-500 font-bold uppercase">{promotorNombre}</p></div>
          <div className="flex items-center gap-2">
             {view === 'form' ? (<button onClick={verReporte} className="p-2 bg-slate-800 rounded-lg text-emerald-400 border border-slate-700 flex items-center gap-2 text-xs font-bold px-3 hover:bg-slate-700 transition-colors"><List size={18} /> <span className="hidden sm:inline">Mis Ventas</span></button>) : (<button onClick={() => setView('form')} className="p-2 bg-amber-600 text-[#0B1120] rounded-lg border border-amber-500 flex items-center gap-2 text-xs font-bold px-3 hover:bg-amber-500 transition-colors"><ArrowLeft size={18} /> <span className="hidden sm:inline">Volver</span></button>)}
            <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-lg text-rose-400 border border-slate-700 hover:bg-rose-900/20"><LogOut size={20} /></button>
          </div>
        </div>

        {message && <div className={`mb-6 p-4 rounded-xl text-center text-sm font-bold animate-pulse ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{message.text}</div>}

        {view === 'form' && (
        <form onSubmit={handleSubmit} className="bg-[#151e32] rounded-3xl shadow-2xl border border-slate-800 p-6 space-y-8">
          
          {/* DATOS PERSONALES */}
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2"><User size={18} /> Datos del Docente</h3>
                <div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={12}/> {currentDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">DNI (8 dígitos)</label>
                    <div className="flex gap-2">
                        <input type="number" required maxLength={8} value={formData.dni} onChange={e => { if(e.target.value.length <= 8) setFormData({...formData, dni: e.target.value}) }} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" placeholder="Ingrese DNI"/>
                        <button type="button" onClick={handleMockSearch} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center min-w-[70px]"><Globe size={14}/> RENIEC</button>
                        <button type="button" onClick={handleMockSearch} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center min-w-[70px]"><Database size={14}/> PADRÓN</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Apellido Paterno</label><input type="text" required value={formData.apellido_paterno} onChange={e => setFormData({...formData, apellido_paterno: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Apellido Materno</label><input type="text" required value={formData.apellido_materno} onChange={e => setFormData({...formData, apellido_materno: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
            </div>
            <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Nombres</label><input type="text" required value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Celular (9 dígitos)</label><input type="tel" required maxLength={9} value={formData.celular} onChange={e => { if(e.target.value.length <= 9) setFormData({...formData, celular: e.target.value}) }} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">WhatsApp</label><input type="tel" maxLength={9} value={formData.whatsapp} onChange={e => { if(e.target.value.length <= 9) setFormData({...formData, whatsapp: e.target.value}) }} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
            </div>
             <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Correo Electrónico</label><input type="email" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1"><label className="text-xs text-slate-400 ml-1 flex items-center gap-1"><MapPin size={12}/> Dirección / Domicilio</label><input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" /></div>
                 <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Ciudad</label><input type="text" value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500" placeholder="Ej: Lima" /></div>
             </div>
          </div>

          {/* DATOS LABORALES */}
          <div className="space-y-5">
             <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-700 pb-2"><Briefcase size={18} /> Datos Laborales</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">Condición Laboral (Nivel)</label>
                    <div className="relative"><Layers className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <select value={formData.nivel} onChange={(e) => { setFormData({...formData, nivel: e.target.value}); setNivelFiltro(e.target.value); }} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-amber-500 appearance-none">
                        <option>Inicial</option><option>Primaria</option><option>Secundaria</option><option>Otros</option>
                    </select></div>
                </div>
                <div onClick={() => setNoLabora(!noLabora)} className={`flex items-center gap-3 p-3 h-[46px] rounded-xl border cursor-pointer transition-all ${noLabora ? 'bg-rose-500/10 border-rose-500' : 'bg-[#0B1120] border-slate-700 hover:border-slate-500'}`}>{noLabora ? <CheckSquare className="text-rose-500" /> : <Square className="text-slate-500" />}<span className={`text-sm select-none ${noLabora ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>No labora actualmente</span></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">Centro Laboral</label><input type="text" disabled={noLabora} value={formData.ie} onChange={e => setFormData({...formData, ie: e.target.value})} className={`w-full bg-[#0B1120] border rounded-xl p-3 text-white outline-none focus:border-amber-500 ${noLabora ? 'opacity-50 cursor-not-allowed border-slate-800' : 'border-slate-700'}`}/></div>
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">UGEL / DRE</label><input type="text" disabled={noLabora} value={formData.ugel} onChange={e => setFormData({...formData, ugel: e.target.value})} className={`w-full bg-[#0B1120] border rounded-xl p-3 text-white outline-none focus:border-amber-500 ${noLabora ? 'opacity-50 cursor-not-allowed border-slate-800' : 'border-slate-700'}`}/></div>
             </div>
             <div className="space-y-2"><label className="text-xs text-slate-400 ml-1">Situación Laboral</label><div className="flex flex-wrap gap-4 bg-[#0B1120] p-3 rounded-xl border border-slate-700">{['Nombrado', 'Contratado'].map(tipo => (<label key={tipo} className={`flex items-center gap-2 cursor-pointer ${noLabora ? 'opacity-30' : ''}`}><input type="radio" name="condicion" disabled={noLabora} checked={formData.condicion_laboral === tipo} onChange={() => setFormData({...formData, condicion_laboral: tipo})} className="accent-amber-500 w-4 h-4"/><span className="text-sm text-slate-300">{tipo}</span></label>))}{noLabora && <span className="text-sm text-rose-400 font-bold ml-auto">Sin Vínculo Laboral</span>}</div></div>
          </div>

          {/* DETALLES ACADÉMICOS (PUNTO 2 INCLUIDO) */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-700 pb-2"><GraduationCap size={18} /> Detalles Académicos</h3>
            
            {/* INPUT MANUAL DE FICHA FÍSICA (IMPLEMENTACIÓN PUNTO 2) */}
            <div className="space-y-1">
                <label className="text-xs text-amber-400 ml-1 font-bold flex items-center gap-1"><FileDigit size={12}/> N° Ficha Física (Manual)</label>
                <input type="text" value={formData.numero_ficha_fisica} onChange={e => setFormData({...formData, numero_ficha_fisica: e.target.value})} className="w-full bg-[#0B1120] border border-amber-500/50 rounded-xl p-3 text-white outline-none focus:border-amber-500" placeholder="Ej: 00458"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">Tipo de Certificación</label>
                    <select value={formData.tipo_registro} onChange={(e) => setFormData({...formData, tipo_registro: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 appearance-none">
                        <option>Diplomado</option><option>Especialización</option><option>Curso de Capacitación</option><option>Curso de Actualización</option><option>Nombramiento Docente</option><option>Ascenso Docente</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">Modalidad de Estudio</label>
                    <div className="flex gap-2">
                        <label className={`flex-1 border rounded-xl p-3 cursor-pointer text-center text-xs transition-all ${formData.modalidad_estudio === 'Programa Completo' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-[#0B1120] border-slate-700 text-slate-400'}`}>
                            <input type="radio" className="hidden" checked={formData.modalidad_estudio === 'Programa Completo'} onChange={() => setFormData({...formData, modalidad_estudio: 'Programa Completo'})} />Programa Completo
                        </label>
                        <label className={`flex-1 border rounded-xl p-3 cursor-pointer text-center text-xs transition-all ${formData.modalidad_estudio === 'Acelerada' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-[#0B1120] border-slate-700 text-slate-400'}`}>
                            <input type="radio" className="hidden" checked={formData.modalidad_estudio === 'Acelerada'} onChange={() => setFormData({...formData, modalidad_estudio: 'Acelerada'})} /><Zap size={14} className="inline mr-1"/> Acelerada
                        </label>
                    </div>
                </div>
            </div>
             <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-500" size={18} /><input type="text" placeholder={`Buscar tema de ${nivelFiltro}...`} value={busquedaTema} onChange={(e) => setBusquedaTema(e.target.value)} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-amber-500"/>
                {sugerencias.length > 0 && (<div className="absolute top-full left-0 right-0 mt-2 bg-[#1a253a] border border-slate-700 rounded-xl shadow-2xl z-10">{sugerencias.map(c => (<div key={c.id} onClick={() => {setTemasSeleccionados([...temasSeleccionados, c.nombre]); setBusquedaTema('');}} className="px-4 py-3 hover:bg-amber-600 hover:text-white cursor-pointer flex justify-between group"><span>{c.nombre} <span className="text-[10px] bg-slate-800 px-1 rounded ml-2 text-slate-400 group-hover:text-white">{c.tipo || 'Curso'}</span></span><Plus size={16} className="text-amber-500 group-hover:text-white"/></div>))}</div>)}
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px] bg-[#0B1120] p-2 rounded-xl border border-slate-700 border-dashed">{temasSeleccionados.length === 0 ? <span className="text-xs text-slate-500 p-2 italic">Selecciona los temas...</span> : temasSeleccionados.map(t => (<div key={t} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-bold animate-fadeIn">{t} <button type="button" onClick={() => setTemasSeleccionados(temasSeleccionados.filter(x=>x!==t))}><X size={14}/></button></div>))}</div>
          </div>

          {/* PAGO Y FINANCIAMIENTO */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-700 pb-2"><CreditCard size={18} /> Pago y Financiamiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 ml-1">Modalidad de Pago</label>
                    <div className="relative"><CreditCard className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    <select value={formData.modalidad_pago} onChange={(e) => setFormData({...formData, modalidad_pago: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-amber-500 appearance-none">
                        <option>Pago a Cuenta</option>
                        <option>Descuento por Planilla</option>
                    </select></div>
                </div>
                <div className="space-y-1"><label className="text-xs text-slate-400 ml-1">N° Cuotas / Meses</label><input type="number" min="1" value={formData.num_cuotas} onChange={e => setFormData({...formData, num_cuotas: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 text-center font-bold" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0f1623] p-4 rounded-xl border border-slate-700/50">
                <div className="space-y-1"><label className="text-xs text-emerald-400 ml-1 font-bold">{formData.modalidad_pago === 'Descuento por Planilla' ? 'Descuento Mensual (S/)' : 'Cuota Mensual (S/)'}</label><div className="relative"><span className="absolute left-3 top-3 text-slate-500">S/</span><input type="number" step="0.01" value={formData.monto_mensual} onChange={e => setFormData({...formData, monto_mensual: e.target.value})} className="w-full bg-[#0B1120] border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white outline-none focus:border-emerald-500 font-mono text-lg" placeholder="0.00"/></div></div>
                <div className="space-y-1"><label className="text-xs text-amber-400 ml-1 font-bold">{formData.modalidad_pago === 'Descuento por Planilla' ? 'Total a Descontar (S/)' : 'Total a Pagar (S/)'}</label><div className="relative"><span className="absolute left-3 top-3 text-slate-500">S/</span><input type="number" step="0.01" value={formData.total_pagar} onChange={e => setFormData({...formData, total_pagar: e.target.value})} className="w-full bg-[#0B1120] border border-amber-500/50 rounded-xl py-3 pl-8 pr-4 text-amber-400 outline-none focus:border-amber-500 font-mono text-lg font-bold" placeholder="0.00"/></div></div>
            </div>
            <textarea rows="3" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder="Observaciones adicionales..." className="w-full bg-[#0B1120] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
             <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${fotoDni ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500'}`}><Camera size={24} className={fotoDni ? 'text-emerald-500' : 'text-slate-500'} /><span className="text-xs mt-2 text-slate-400 text-center">{fotoDni ? 'DNI Listo' : 'Foto DNI'}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFotoDni(e.target.files[0])} /></label>
             <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${fotoContrato ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500'}`}><FileText size={24} className={fotoContrato ? 'text-emerald-500' : 'text-slate-500'} /><span className="text-xs mt-2 text-slate-400 text-center">{fotoContrato ? 'Contrato Listo' : 'Foto Contrato'}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setFotoContrato(e.target.files[0])} /></label>
          </div>
          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-[#0B1120] font-bold py-4 rounded-xl shadow-lg mt-4 active:scale-95 transition-all">{isOnline ? 'Registrar Participante' : 'Guardar en Celular'}</button>
        </form>
        )}

        {view === 'reporte' && (
            <div className="space-y-4">
                {misVentas.length === 0 ? <div className="text-center p-10 text-slate-500 bg-[#151e32] rounded-2xl border border-slate-800"><List size={40} className="mx-auto mb-2 opacity-50"/><p>No tienes registros sincronizados aún.</p></div> : 
                    misVentas.map(v => (
                        <div key={v.id} className="bg-[#151e32] p-4 rounded-2xl border border-slate-800 flex justify-between items-center hover:bg-[#1a253a] transition-colors">
                            <div>
                                <h4 className="font-bold text-white text-lg">{v.nombre}</h4>
                                <div className="flex gap-2 text-xs text-slate-400 mt-1"><span>📅 {new Date(v.created_at).toLocaleDateString()}</span><span className="text-amber-500 font-bold">{v.tipo_registro} ({v.modalidad_estudio})</span></div>
                                <div className="flex flex-wrap gap-1 mt-2">{v.programa?.split(', ').map((p,i) => (<span key={i} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">{p}</span>))}</div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${v.estado_ficha === 'aprobado' ? 'bg-emerald-500/20 text-emerald-400' : v.estado_ficha === 'rechazado' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>{v.estado_ficha || 'Pendiente'}</span>
                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1"><Wifi size={10}/> SYNC</span>
                            </div>
                        </div>
                    ))
                }
            </div>
        )}
      </div>
    </div>
  );
};

export default Formulario;