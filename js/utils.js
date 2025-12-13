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
    // Usamos el formato ISO 8601 'YYYY-MM-DDT00:00:00' para evitar problemas de zona horaria
    const fechaHoraCita = new Date(`${fechaString}T${horaString}`);

    if (isNaN(fechaHoraCita.getTime())) return false;

    const ahora = new Date();
    
    // Comparamos la fecha y hora de la cita con el momento actual
    return fechaHoraCita >= ahora;
}

/**
 * Valida un DNI/NIE con un formato simple.
 * @param {string} dni - El DNI/NIE a validar.
 * @returns {boolean} True si el formato es válido.
 */
export function validarDNI(dni) {
    // Formato simple: 8 dígitos seguidos de 1 letra (para DNI español)
    return /^\d{8}[A-Z]$/i.test(dni);
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
