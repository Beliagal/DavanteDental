/**
 * js/utils.js
 * Módulo de funciones de utilidad, seguridad y validación.
 */

/**
 * Escapa caracteres HTML para prevenir ataques de Cross-Site Scripting (XSS).
 * @param {string} str - La cadena a sanear.
 * @returns {string} La cadena saneada.
 */
export function escapeHTML(str) {
    if (typeof str !== 'string' || !str) return '';
    return str.replace(/[&<>"']/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

/**
 * Valida que la fecha y hora de la cita no sean pasadas.
 * @param {string} fechaString - Fecha en formato 'YYYY-MM-DD'.
 * @param {string} horaString - Hora en formato 'HH:MM'.
 * @returns {boolean} True si la fecha y hora son válidas (futuras o el momento actual).
 */
export function validarFechaHoraCita(fechaString, horaString) {
    if (!fechaString || !horaString) return false;

    // Crear un objeto Date completo (fecha y hora)
    const fechaHoraCita = new Date(`${fechaString}T${horaString}`);

    if (isNaN(fechaHoraCita.getTime())) return false;

    const ahora = new Date();
    
    // Comparamos la fecha y hora de la cita con el momento actual
    return fechaHoraCita >= ahora;
}

/**
 * Valida que una fecha de nacimiento no sea futura.
 * @param {string} fechaString - Fecha en formato 'YYYY-MM-DD'.
 * @returns {boolean} True si la fecha es hoy o pasada.
 */
export function validarFechaNoFutura(fechaString) {
    if (!fechaString) return false;
    
    const fecha = new Date(fechaString + 'T00:00:00');
    const hoy = new Date();
    
    // Establecer la hora de hoy a medianoche para comparar solo la fecha
    hoy.setHours(0, 0, 0, 0);

    if (isNaN(fecha.getTime())) return false;

    // La fecha de nacimiento debe ser menor o igual a hoy
    return fecha <= hoy;
}

/**
 * Valida un DNI/NIE con formato y letra de control.
 * @param {string} dni - El DNI/NIE a validar.
 * @returns {boolean} True si el formato y la letra de control son válidos.
 */
export function validarDNI(dni) {
    if (!dni) return false;
    
    const dniUpper = dni.toUpperCase();
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    
    // 1. Validación de formato DNI (8 dígitos + 1 letra)
    const dniRegex = /^(\d{8})([A-Z])$/;
    
    // 2. Validación de formato NIE (X, Y, Z + 7 dígitos + 1 letra)
    const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
    
    let numero;
    let letra;
    
    if (dniRegex.test(dniUpper)) {
        // Es un DNI
        numero = dniUpper.substring(0, 8);
        letra = dniUpper.charAt(8);
    } else if (nieRegex.test(dniUpper)) {
        // Es un NIE
        // Reemplazar la letra inicial por su equivalente numérico
        const niePrefix = dniUpper.charAt(0);
        let nieNum = dniUpper.substring(1, 8);
        
        if (niePrefix === 'X') nieNum = '0' + nieNum;
        else if (niePrefix === 'Y') nieNum = '1' + nieNum;
        else if (niePrefix === 'Z') nieNum = '2' + nieNum;
        
        numero = nieNum;
        letra = dniUpper.charAt(8);
    } else {
        return false; // Formato incorrecto
    }
    
    // 3. Validación de la letra de control
    const indice = parseInt(numero, 10) % 23;
    const letraCalculada = letras.charAt(indice);
    
    return letra === letraCalculada;
}

/**
 * Formatea una fecha de 'YYYY-MM-DD' a 'DD/MM/YYYY'.
 * @param {string} dateString - Fecha en formato 'YYYY-MM-DD'.
 * @returns {string} Fecha formateada.
 */
export function formatearFecha(dateString) {
    if (!dateString || typeof dateString !== 'string') return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        // Asumiendo formato YYYY-MM-DD
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
}

// --- Funciones de Accesibilidad ---

/**
 * Captura el foco dentro de un contenedor para accesibilidad (Modal).
 * @param {HTMLElement} element - El elemento contenedor.
 * @returns {Function} Función de limpieza para remover listeners.
 */
export function trapFocus(element) {
    const focusableEls = element.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])');
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    if (!firstFocusableEl) return () => {}; // Retorno seguro si no hay elementos enfocables

    const handleKeyDown = (e) => {
        const isTab = (e.key === 'Tab');
        if (!isTab) return;

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstFocusableEl) {
                lastFocusableEl.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastFocusableEl) {
                firstFocusableEl.focus();
                e.preventDefault();
            }
        }
    };

    element.addEventListener('keydown', handleKeyDown);
    return () => {
        element.removeEventListener('keydown', handleKeyDown);
    };
}

/**
 * Maneja la tecla Escape para cerrar un elemento.
 * @param {HTMLElement} element - El elemento que debe estar visible (e.g., el modal).
 * @param {Function} closeCallback - La función a llamar para cerrar.
 * @returns {Function} Función de limpieza para remover listeners.
 */
export function handleEscapeKey(element, closeCallback) {
    const handleKeyDown = (e) => {
        // Usamos element.style.display para determinar si el modal está abierto
        if (e.key === 'Escape' && element.style.display === 'flex') {
            closeCallback();
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
}
