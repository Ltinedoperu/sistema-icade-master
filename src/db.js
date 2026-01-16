import { openDB } from 'idb';

const DB_NAME = 'ventas-offline';
const STORE_VENTAS = 'ventas';
const STORE_CURSOS = 'cursos'; // Nuevo almacén para cursos

const initDB = async () => {
  // Subimos la versión a 2 para agregar la nueva tabla
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_VENTAS)) {
        db.createObjectStore(STORE_VENTAS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CURSOS)) {
        db.createObjectStore(STORE_CURSOS, { keyPath: 'id' }); // Usamos el ID de supabase
      }
    },
  });
};

// --- VENTAS ---
export const guardarVentaLocal = async (venta) => {
  const db = await initDB();
  return db.add(STORE_VENTAS, venta);
};

export const obtenerVentasLocales = async () => {
  const db = await initDB();
  return db.getAll(STORE_VENTAS);
};

export const borrarVentaLocal = async (id) => {
  const db = await initDB();
  return db.delete(STORE_VENTAS, id);
};

export const contarVentasLocales = async () => {
  const db = await initDB();
  return db.count(STORE_VENTAS);
};

// --- CURSOS (NUEVO) ---
// Guardamos todos los cursos bajados de la nube en el celular
export const sincronizarCursosLocales = async (cursos) => {
  const db = await initDB();
  const tx = db.transaction(STORE_CURSOS, 'readwrite');
  // Borramos los viejos y ponemos los nuevos para tenerlo fresco
  await tx.store.clear();
  for (const curso of cursos) {
    await tx.store.put(curso);
  }
  await tx.done;
};

export const obtenerCursosOffline = async () => {
  const db = await initDB();
  return db.getAll(STORE_CURSOS);
};