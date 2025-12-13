/**
 * js/storage.js
 * Módulo para gestionar la persistencia de datos usando LocalStorage.
 */

const STORAGE_KEY = 'davanteDentalCitas';
const COUNTER_KEY = 'davanteDentalIdCounter';

/**
 * Genera el próximo ID de cita (Ej: "2025-00001").
 * @returns {string} ID único de la cita.
 */
function generarProximoId() {
    const anioActual = new Date().getFullYear();
    let contador = { anio: anioActual, seq: 0 };
    
    try {
        const stored = localStorage.getItem(COUNTER_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed.anio === 'number' && typeof parsed.seq === 'number') {
                contador = parsed;
            }
        }
    } catch (e) {
        console.warn("Contador de ID corrupto, se reinicia.");
        // Si hay error en parse, se usa el valor por defecto
    }
    
    if (contador.anio !== anioActual) {
        contador = { anio: anioActual, seq: 1 };
    } else {
        contador.seq++;
    }
    
    // Mejorar la robustez del guardado
    try {
        localStorage.setItem(COUNTER_KEY, JSON.stringify(contador));
    } catch (e) {
        console.error("No se pudo guardar el contador en LocalStorage.", e);
        // Si no se puede guardar, se usa un ID simple de fallback
        return `TEMP-${Date.now()}`;
    }

    return `${contador.anio}-${String(contador.seq).padStart(5, '0')}`;
}

/**
 * Obtiene todas las citas almacenadas.
 * @returns {Array<Object>} Lista de citas o array vacío.
 */
export function obtenerCitas() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return [];
        
        return JSON.parse(json);
    } catch (e) {
        // Manejo de datos corruptos: Notificar y limpiar para recuperar la estabilidad.
        console.error("⚠️ Error: Los datos de citas están corruptos y han sido eliminados.", e);
        // No usar alert() en funciones puras si es posible, es mejor que el controlador de la UI lo haga.
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
}

/**
 * Guarda o actualiza una cita. Si 'cita.id' existe, actualiza; si no, crea uno nuevo.
 * @param {Object} cita - El objeto de la cita.
 */
export function guardarCita(cita) {
    let citas = obtenerCitas();
    // Clona el objeto para evitar mutaciones inesperadas del argumento.
    const citaToSave = { ...cita }; 

    if (citaToSave.id) {
        // Modo Edición: Asegurar que el ID sea string (seguridad extra)
        const idToFind = String(citaToSave.id);
        const index = citas.findIndex(c => c.id === idToFind);
        if (index !== -1) {
             citas[index] = citaToSave;
        } else {
             // Si el ID existe en el objeto pero no en la lista, lo tratamos como nuevo
             citaToSave.id = generarProximoId();
             citas.push(citaToSave);
        }
    } else {
        // Modo Creación: Asignar ID
        citaToSave.id = generarProximoId();
        citas.push(citaToSave);
    }
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
    } catch (e) {
        console.error("No se pudo guardar la lista de citas en LocalStorage.", e);
        throw new Error("Fallo en la persistencia de datos (LocalStorage lleno o no disponible).");
    }
}

/**
 * Elimina una cita por su ID.
 * @param {string} id - El ID de la cita a eliminar.
 * @returns {boolean} True si se eliminó o false si no se encontró o falló.
 */
export function eliminarCita(id) {
    if (!id) return false;
    const citas = obtenerCitas();
    const citasOriginalLength = citas.length;
    
    // Filtrar citas, asegurando que el ID es un string
    const nuevas = citas.filter(c => c.id !== String(id));
    
    if (nuevas.length === citasOriginalLength) {
        return false; // No se encontró ninguna cita con ese ID
    }
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevas));
        return true;
    } catch (e) {
        console.error("Fallo al guardar la lista de citas después de la eliminación.", e);
        return false;
    }
}