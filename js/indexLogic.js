/**
 * js/indexLogic.js
 * Lógica para la página principal (index.html) de creación y edición de citas.
 */

import { guardarCita, obtenerCitas } from './storage.js';
// Se importa formatearFecha para mejorar el mensaje de error en conflicto
import { validarFechaCita, validarDNI, formatearFecha } from './utils.js'; 

function setupIndexPageLogic() {
    const modal = document.getElementById('reservationModal');
    const form = document.getElementById('modalBookingForm');
    const openBtn = document.getElementById('openModalButton');
    const closeBtn = document.getElementById('closeModalButton');
    const modalTitle = document.getElementById('modalTitle');
    const confirmModal = document.getElementById('confirmationMessage');
    const closeConfirmBtn = document.getElementById('closeConfirmButton');
    const closeConfirmSpan = document.getElementById('closeConfirmSpan');
    const obsArea = document.getElementById('modalObservaciones');
    const charCount = document.getElementById('modalCharCount');
    const errorMsg = form ? form.querySelector('.error-mensaje') : null;

    if (!form || !modal) return; 

    const MAX_CHAR_COUNT = 300; 

    // --- Funciones de Control de Modal ---
    const showModal = () => {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; 
        if (errorMsg) errorMsg.style.display = 'none';

        const firstFocusable = modal.querySelector('input, button, a, select, textarea');
        if (firstFocusable) firstFocusable.focus();
    };

    const hideModal = () => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = ''; 
        
        form.reset();
        delete form.dataset.editingId;
        modalTitle.textContent = "Formulario de Reserva";
        
        if (charCount) charCount.textContent = `0 / ${MAX_CHAR_COUNT} caracteres`;
        if (errorMsg) errorMsg.style.display = 'none';

        if (window.location.search.includes('edit=')) {
            // CORRECCIÓN: Usar replaceState para no saturar el historial
            window.history.replaceState({}, document.title, window.location.pathname); 
        }
        
        if (openBtn) openBtn.focus();
    };

    // --- Carga de Datos en Modo Edición ---
    const loadEditData = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        
        if (!editId || typeof editId !== 'string') return; 

        const citas = obtenerCitas();
        const cita = citas.find(c => c.id === editId);

        if (cita) {
            Object.keys(cita).forEach(key => {
                const element = form.elements[key]; 
                if (element) {
                    element.value = cita[key] ?? '';
                }
            });
            form.dataset.editingId = editId;
            modalTitle.textContent = `Editando Cita: ${editId}`;
            
            if (obsArea && charCount) {
                obsArea.textContent = cita.observaciones || '';
                charCount.textContent = `${obsArea.value.length} / ${MAX_CHAR_COUNT} caracteres`;
            }

            showModal();
        } else if (editId) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    // --- Manejo del Envío del Formulario ---
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const displayError = (message) => {
            if (errorMsg) { 
                errorMsg.textContent = message; 
                errorMsg.style.display = 'block'; 
                errorMsg.focus(); 
            }
        };
        
        // 1. Validación de campos vacíos
        if (!data.nombre?.trim() || !data.apellidos?.trim() || !data.dni?.trim() || 
            !data.telefono?.trim() || !data.fecha_reserva || !data.hora_reserva || !data.fecha_nacimiento) {
             displayError('Error: Todos los campos obligatorios deben estar completos.');
             return;
        }

        // 2. Validación de DNI
        if (!validarDNI(data.dni)) {
             displayError('Error: El formato del DNI/NIE es incorrecto (Ej: 12345678A o X1234567B).');
             return;
        }
        
        // 3. Validación de fecha futura
        if (!validarFechaCita(data.fecha_reserva)) {
            displayError('Error: La fecha de la cita no puede ser pasada.');
            return;
        }
        
        // 4. Validación de Hora si la cita es HOY (CRÍTICO)
        const hoy = new Date();
        const fechaSeleccionada = new Date(data.fecha_reserva + 'T00:00:00'); 
        hoy.setHours(0, 0, 0, 0);

        if (fechaSeleccionada.getTime() === hoy.getTime()) {
            const ahora = new Date();
            const [hora, minuto] = data.hora_reserva.split(':').map(Number);
            
            const horaSeleccionada = new Date();
            horaSeleccionada.setHours(hora, minuto, 0, 0);

            if (horaSeleccionada < ahora) {
                displayError('Error: La hora de la cita es pasada. Por favor, selecciona una hora futura o un día diferente.');
                return;
            }
        }
        
        // 5. Validación de Conflicto Horario
        const citasExistentes = obtenerCitas();
        const conflicto = citasExistentes.find(c =>
            c.fecha_reserva === data.fecha_reserva &&
            c.hora_reserva === data.hora_reserva &&
            c.id !== form.dataset.editingId 
        );

        if (conflicto) {
            const nombreConflicto = conflicto.nombre || 'Otro Paciente';
            displayError(`Error: El horario ${data.hora_reserva} el ${formatearFecha(data.fecha_reserva)} ya está reservado por ${nombreConflicto}.`);
            return;
        }

        // 6. Saneamiento y Guardado
        const cleanedData = {
            ...data,
            nombre: data.nombre.trim(),
            apellidos: data.apellidos.trim(),
            dni: data.dni.toUpperCase().trim(),
            telefono: data.telefono.trim(),
            observaciones: data.observaciones ? data.observaciones.trim() : ''
        };
        
        if (form.dataset.editingId) cleanedData.id = form.dataset.editingId;
        
        try {
            guardarCita(cleanedData);
            hideModal();
            if (confirmModal) confirmModal.style.display = 'flex';
        } catch (error) {
            displayError(`Error al guardar la cita: ${error.message}`);
        }
    };

    // --- Cierre de Confirmación ---
    const cerrarConfirmacion = () => {
        if (confirmModal) confirmModal.style.display = 'none';
        if (form.dataset.editingId || window.location.search.includes('edit=')) {
            window.location.href = 'check.html';
        }
        if (openBtn) openBtn.focus();
    };

    // --- Inicialización y Event Listeners ---
    if (openBtn) openBtn.addEventListener('click', showModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => { 
        if (e.target === modal) hideModal(); 
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal.style.display === 'flex') hideModal();
            else if (confirmModal?.style.display === 'flex') cerrarConfirmacion();
        }
    });

    if (obsArea && charCount) {
        obsArea.maxLength = MAX_CHAR_COUNT;
        obsArea.addEventListener('input', () => {
            charCount.textContent = `${obsArea.value.length} / ${MAX_CHAR_COUNT} caracteres`;
        });
    }

    form.addEventListener('submit', handleSubmit);
    if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', cerrarConfirmacion);
    if (closeConfirmSpan) closeConfirmSpan.addEventListener('click', cerrarConfirmacion);
    
    loadEditData();
}

document.addEventListener('DOMContentLoaded', setupIndexPageLogic);