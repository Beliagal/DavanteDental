/**
 * checkLogic.js
 * Lógica para la página de agenda (check.html) de visualización y gestión de citas.
 */

import { obtenerCitas, eliminarCita } from './storage.js';
// Importación de funciones del módulo utils
import { escapeHTML, formatearFecha, trapFocus, handleEscapeKey } from './utils.js'; 

// Las funciones auxiliares como createCitaCardHTML, ordenarCitas, y separarCitasPorEstado
// son específicas de esta lógica y pueden permanecer aquí como funciones privadas.

/**
 * Genera el HTML para una tarjeta de cita individual
 * @param {Object} cita - El objeto de la cita
 * @returns {string} HTML de la tarjeta
 */
function createCitaCardHTML(cita) {
    // Sanitizar todos los datos que provienen de LocalStorage (fuente externa).
    const idSaneado = escapeHTML(cita.id);
    const nombreSaneado = escapeHTML(cita.nombre);
    const apellidosSaneados = escapeHTML(cita.apellidos);
    const dniSaneado = escapeHTML(cita.dni);
    const telefonoSaneado = escapeHTML(cita.telefono);
    const observacionesSaneadas = cita.observaciones ? escapeHTML(cita.observaciones) : '';

    // Formatear fechas antes de usar
    const fechaFormateada = formatearFecha(cita.fecha_reserva);
    const fechaNacFormateada = formatearFecha(cita.fecha_nacimiento);
    const horaSaneada = escapeHTML(cita.hora_reserva);

    const obsHtml = observacionesSaneadas ?
        `<div class="cita-footer"><p>Obs: ${observacionesSaneadas}</p></div>` :
        '';

    return `
        <article class="cita-card" data-cita-id="${idSaneado}">
            <div class="cita-header">
                <div>
                    <span class="cita-fecha">${fechaFormateada}</span>
                    <span class="cita-hora">${horaSaneada}</span>
                </div>
                <span class="cita-id">ID: ${idSaneado}</span>
            </div>
            <div class="cita-body">
                <p><strong>Paciente:</strong> ${nombreSaneado} ${apellidosSaneados}</p>
                <p><strong>DNI:</strong> ${dniSaneado}</p>
                <p><strong>Teléfono:</strong> ${telefonoSaneado}</p>
                <p><strong>Fecha Nacimiento:</strong> ${fechaNacFormateada}</p>
            </div>
            ${obsHtml}
            <div class="cita-actions">
                <button class="cita-button cita-button--edit" data-id="${idSaneado}" aria-label="Editar cita de ${nombreSaneado}">
                    ✏️ Editar
                </button>
                <button class="cita-button cita-button--delete" data-id="${idSaneado}" aria-label="Borrar cita de ${nombreSaneado}">
                    🗑️ Borrar
                </button>
            </div>
        </article>`;
}

/**
 * Ordena citas por fecha y hora ascendente
 * @param {Array<Object>} citas - Array de citas
 * @returns {Array<Object>} Citas ordenadas
 */
function ordenarCitas(citas) {
    // Se utiliza el constructor de Date y el clon de array para pureza.
    return [...citas].sort((a, b) => {
        // Concatenar fecha y hora para asegurar una comparación correcta
        const dateA = new Date(`${a.fecha_reserva}T${a.hora_reserva}`);
        const dateB = new Date(`${b.fecha_reserva}T${b.hora_reserva}`);
        // Se añade una comprobación de seguridad para NaN, aunque no debería ocurrir.
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        
        return dateA.getTime() - dateB.getTime();
    });
}

/**
 * Filtra citas futuras vs. pasadas
 * @param {Array<Object>} citas - Array de citas
 * @returns {Object} {futuras, pasadas}
 */
function separarCitasPorEstado(citas) {
    const ahora = new Date();
    
    // Mejorar la lógica para comparar solo hasta el minuto (ignorar segundos/milisegundos)
    const horaActualMili = ahora.getTime() - (ahora.getSeconds() * 1000) - ahora.getMilliseconds();
    
    return citas.reduce((acc, cita) => {
        // Asegurar que la fecha sea válida.
        const fechaCita = new Date(`${cita.fecha_reserva}T${cita.hora_reserva}`);
        
        // Si la fecha es inválida, se considera pasada por seguridad.
        if (isNaN(fechaCita.getTime())) {
             acc.pasadas.push(cita);
             return acc;
        }

        if (fechaCita.getTime() >= horaActualMili) {
            acc.futuras.push(cita);
        } else {
            acc.pasadas.push(cita);
        }
        return acc;
    }, { futuras: [], pasadas: [] });
}

function setupCheckPageLogic() {
    const container = document.getElementById('agenda-container');
    let idParaBorrar = null;
    let cleanupFunctions = []; // Almacena funciones para eliminar listeners

    const deleteModal = document.getElementById('deleteConfirmModal');
    const confirmDelBtn = document.getElementById('deleteConfirmButton');
    const cancelDelBtn = document.getElementById('deleteCancelButton');
    const closeDelSpan = document.getElementById('deleteCloseSpan');
    const searchBarContainer = document.querySelector('.main-container'); // Buscar donde insertar la barra

    if (!container || !deleteModal) return;

    // --- CONTROL DEL MODAL DE BORRADO ---
    const closeDelModal = () => {
        deleteModal.style.display = 'none';
        deleteModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; // Restaurar scroll
        idParaBorrar = null;
        
        // Ejecutar y limpiar funciones de trapFocus/handleEscapeKey
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];
    };

    const openDelModal = (id) => {
        idParaBorrar = id;
        deleteModal.style.display = 'flex';
        deleteModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
            
        // Accesibilidad: Activar el Focus Trap y la tecla Escape
        const cleanupTrap = trapFocus(deleteModal);
        // handleEscapeKey ya recibe el modal y el callback
        const cleanupEscape = handleEscapeKey(deleteModal, closeDelModal); 
        cleanupFunctions.push(cleanupTrap, cleanupEscape);
            
        // Enfocar el botón de acción principal
        confirmDelBtn?.focus(); 
    };

    // Añadir listeners del modal de borrado
    cancelDelBtn?.addEventListener('click', closeDelModal);
    closeDelSpan?.addEventListener('click', closeDelModal);
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDelModal();
    });

    confirmDelBtn?.addEventListener('click', () => {
        if (idParaBorrar) {
            // Se puede mejorar la UX con un mensaje de estado
            try {
                const isRemoved = eliminarCita(idParaBorrar);
                if (isRemoved) {
                    closeDelModal();
                    renderCitas();
                    // Opcional: Mostrar un mensaje temporal de éxito
                    // showStatusMessage(`Cita con ID ${idParaBorrar} eliminada correctamente.`);
                } else {
                    alert('Error: No se encontró la cita o falló la eliminación en el almacenamiento local.');
                    closeDelModal();
                }
            } catch (e) {
                alert(`Error: Fallo al intentar eliminar la cita. ${e.message}`);
                closeDelModal();
            }
        }
    });

    // --- RENDERIZADO Y LÓGICA DE FILTRADO ---
    const renderCitas = (filtro = '') => {
        const citas = obtenerCitas();

        if (citas.length === 0) {
            container.innerHTML = '<p class="status-message">No hay citas programadas.</p>';
            return;
        }

        const citasOrdenadas = ordenarCitas(citas);
        const { futuras, pasadas } = separarCitasPorEstado(citasOrdenadas);
        
        const query = filtro.toLowerCase().trim();

        let html = '';
        let futurasRendered = 0;
        let pasadasRendered = 0;
        
        const filterAndMapCitas = (citasArr) => {
            return citasArr.filter(cita => {
                const fullText = (cita.nombre + ' ' + cita.apellidos + ' ' + cita.dni + ' ' + cita.id).toLowerCase();
                return fullText.includes(query);
            }).map(createCitaCardHTML).join('');
        }

        // Renderizar citas futuras
        const futurasHtml = filterAndMapCitas(futuras);
        futurasRendered = futurasHtml.length > 0;
        if (futurasRendered) {
            html += '<h2 style="color: var(--color-primary); margin-top: 20px;">📅 Próximas Citas</h2>';
            html += futurasHtml;
        }

        // Renderizar citas pasadas (colapsadas por defecto)
        const pasadasHtml = filterAndMapCitas(pasadas);
        pasadasRendered = pasadasHtml.length > 0;
        if (pasadasRendered) {
            html += `
                <details style="margin-top: 30px;">
                    <summary style="cursor: pointer; color: var(--color-primary); font-weight: bold; padding: 10px; background: var(--color-grey-light); border-radius: 5px;">
                        📋 Citas Pasadas (${pasadas.length} total, ${pasadasHtml.length} visible)
                    </summary>
                    <div style="margin-top: 10px; opacity: 0.7;">
                        ${pasadasHtml}
                    </div>
                </details>
            `;
        }

        if (!futurasRendered && !pasadasRendered) {
             container.innerHTML = `<p class="status-message">No se encontraron citas para el criterio de búsqueda: **${escapeHTML(filtro)}**</p>`;
        } else {
             container.innerHTML = html;
        }
    };
    
    // --- BÚSQUEDA/FILTRADO ---
    const agregarBuscador = () => {
        // Usamos una etiqueta semántica y mejor ubicación para el buscador (antes de la lista)
        const searchInputId = 'searchCitas';
        const searchBarHtml = `
            <div style="width: 100%; max-width: 800px; margin-bottom: 20px;">
                <input 
                    type="search" 
                    id="${searchInputId}" 
                    placeholder="🔍 Buscar por nombre, DNI o ID..."
                    style="width: 100%; padding: 10px; border: 2px solid var(--color-primary); border-radius: 5px; font-size: 1em;"
                    aria-label="Buscar citas en la agenda"
                >
            </div>
        `;
        
        // Insertar el contenedor del buscador en un lugar apropiado (ej: después del logo)
        const logo = document.querySelector('.logo-image');
        if (logo) logo.insertAdjacentHTML('afterend', searchBarHtml);
        
        const searchInput = document.getElementById(searchInputId);
        searchInput?.addEventListener('input', (e) => {
            // El filtrado se hace ahora con el DOM, pero una mejor práctica es re-renderizar
            renderCitas(e.target.value); 
        });
    };
    
    // --- MANEJO DE EVENTOS DELEGADO ---
    container.addEventListener('click', (e) => {
        const target = e.target;
        // Uso de closest para encontrar el botón correcto
        const button = target.closest('.cita-button'); 
        
        if (!button) return;

        const id = button.dataset.id;
        if (!id) return; // Si no tiene data-id, salir

        if (button.classList.contains('cita-button--delete')) {
            // e.preventDefault() ya se hace por defecto en JS en este contexto, 
            // pero es buena práctica para botones no submit.
            e.preventDefault(); 
            openDelModal(id);
        }
        
        if (button.classList.contains('cita-button--edit')) {
            e.preventDefault();
            // Asegurar que el ID esté codificado para la URL
            window.location.href = `index.html?edit=${encodeURIComponent(id)}`; 
        }
    });

    // --- INICIALIZACIÓN ---
    agregarBuscador();
    renderCitas();
}

document.addEventListener('DOMContentLoaded', setupCheckPageLogic);