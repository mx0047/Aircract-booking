import DataStore from './data.js';
import VFR from './vfr.js';
import Auth from './auth.js';

const Booking = {
    renderBookingForm(aircraftId = null, selectedDate = new Date(), hour = null) {
        const aircraft = aircraftId ? this.getAircraft(aircraftId) : null;

        let dateObj = selectedDate;
        if (typeof selectedDate === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
                dateObj = new Date(selectedDate + 'T00:00:00');
            } else {
                dateObj = new Date(selectedDate);
            }
        }
        if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
            dateObj = new Date();
        }
        const dateStr = dateObj.toISOString().split('T')[0];
        
        let timeFromStr = '';
        let timeToStr = '';
        if (hour !== null && hour !== undefined) {
            const hStr = String(hour).padStart(2, '0');
            timeFromStr = `${hStr}:00`;
            const nextHStr = String((parseInt(hour) + 1) % 24).padStart(2, '0');
            timeToStr = `${nextHStr}:00`;
        }
        
        let aircraftSelectorHtml = '';
        if (aircraft) {
            aircraftSelectorHtml = `
                <div class="booking-aircraft-info" style="margin-bottom: 15px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                    <strong>Lietadlo:</strong> ${aircraft.type} (${aircraft.registration})
                </div>
            `;
        } else {
            const activeFleet = DataStore.getFleet().filter(a => a.status === 'active');
            aircraftSelectorHtml = `
                <div class="form-group">
                    <label for="booking-aircraft-id" class="form-label">Lietadlo</label>
                    <select id="booking-aircraft-id" name="aircraftId" required class="form-input">
                        ${activeFleet.map(a => `<option value="${a.id}">${a.type} (${a.registration})</option>`).join('')}
                    </select>
                </div>
            `;
        }
        
        const defFrom = `${dateStr}T${timeFromStr || '08:00'}`;
        const defTo = `${dateStr}T${timeToStr || '10:00'}`;

        return `
            <div class="booking-form-container card card--glass" style="padding: 20px; max-width: 480px; margin: 0 auto;">
                <h3 class="booking-title" style="margin-bottom: 20px; text-align: center;">Nová rezervácia</h3>
                
                <form id="booking-form" class="booking-form" data-aircraft-id="${aircraft ? aircraft.id : ''}">
                    ${aircraftSelectorHtml}
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
                        <div>
                            <label for="booking-datetime-from" class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Odlet (Vzlet)</label>
                            <input type="datetime-local" id="booking-datetime-from" name="dateFrom" required class="form-input" value="${defFrom}" style="padding: 8px 10px; font-size: 0.9rem; width: 100%;">
                        </div>
                        <div>
                            <label for="booking-datetime-to" class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Prílet (Pristátie)</label>
                            <input type="datetime-local" id="booking-datetime-to" name="dateTo" required class="form-input" value="${defTo}" style="padding: 8px 10px; font-size: 0.9rem; width: 100%;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div>
                            <label for="booking-purpose" class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Účel letu</label>
                            <input type="text" id="booking-purpose" name="purpose" required class="form-input" placeholder="napr. Výcvik" style="padding: 8px 10px; font-size: 0.9rem;">
                        </div>
                        <div>
                            <label for="booking-note" class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Poznámka (voliteľné)</label>
                            <input type="text" id="booking-note" name="note" class="form-input" placeholder="Poznámka..." style="padding: 8px 10px; font-size: 0.9rem;">
                        </div>
                    </div>
                    
                    <div id="vfr-info-display" class="vfr-info">
                        <!-- VFR info will be populated by JS -->
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">Odoslať žiadosť</button>
                </form>
            </div>
        `;
    },

    renderReservationsList(filter = 'mine') {
        let reservations = DataStore.getReservations();
        const currentUser = Auth.getCurrentUser();
        
        if (!currentUser) return '<p>Pre zobrazenie rezervácií sa musíte prihlásiť.</p>';

        if (filter === 'mine') {
            reservations = reservations.filter(r => r.pilotId === currentUser.id);
        } else if (filter === 'pending') {
            reservations = reservations.filter(r => r.status === 'pending');
        } // 'all' shows all

        // Sort by start date, descending
        reservations.sort((a, b) => new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime());

        if (reservations.length === 0) {
            return '<p class="empty-state">Žiadne rezervácie na zobrazenie.</p>';
        }

        return `
            <div class="reservations-list">
                ${reservations.map(r => this.renderReservationCard(r)).join('')}
            </div>
        `;
    },
    
    renderReservationCard(reservation) {
        const aircraft = this.getAircraft(reservation.aircraftId);
        const currentUser = Auth.getCurrentUser();
        const start = new Date(reservation.dateFrom);
        const end = new Date(reservation.dateTo);
        
        const isOwnPending = currentUser && currentUser.id === reservation.pilotId && reservation.status === 'pending';
        
        const statusMap = {
            'pending': 'Čakajúca',
            'approved': 'Schválená',
            'rejected': 'Zamietnutá'
        };
        
        return `
            <div class="reservation-card" data-id="${reservation.id}">
                <div class="reservation-header">
                    <span class="reservation-aircraft">${aircraft ? aircraft.type + ' ' + aircraft.registration : 'Neznáme'}</span>
                    <span class="badge badge--${reservation.status}">${statusMap[reservation.status]}</span>
                </div>
                <div class="reservation-body">
                    <p class="reservation-time">
                        ${start.toLocaleDateString('sk-SK')} ${start.toLocaleTimeString('sk-SK', {hour: '2-digit', minute:'2-digit', hour12: false})} - 
                        ${end.toLocaleDateString('sk-SK')} ${end.toLocaleTimeString('sk-SK', {hour: '2-digit', minute:'2-digit', hour12: false})}
                    </p>
                    <p class="reservation-pilot"><strong>Pilot:</strong> ${reservation.pilotName || 'Neznámy'}</p>
                    <p class="reservation-purpose"><strong>Účel:</strong> ${reservation.purpose}</p>
                    ${reservation.note ? `<p class="reservation-note"><strong>Poznámka:</strong> ${reservation.note}</p>` : ''}
                </div>
                ${isOwnPending ? `
                <div class="reservation-footer">
                    <button class="btn btn--danger btn--sm cancel-reservation-btn" data-id="${reservation.id}">Zrušiť</button>
                </div>
                ` : ''}
            </div>
        `;
    },

    renderReservationDetail(reservationId) {
        const reservations = DataStore.getReservations();
        const reservation = reservations.find(r => r.id === reservationId);
        
        if (!reservation) return '<p>Rezervácia sa nenašla.</p>';
        return this.renderReservationCard(reservation);
    },

    createReservation(data) {
        const validation = this.validateReservation(data);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        const currentUser = Auth.getCurrentUser();
        
        const newReservation = {
            id: 'r' + Date.now().toString(),
            pilotId: currentUser.id,
            pilotName: currentUser.name,
            aircraftId: data.aircraftId,
            dateFrom: data.dateFrom.toISOString(),
            dateTo: data.dateTo.toISOString(),
            purpose: data.purpose,
            note: data.note || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        DataStore.addReservation(newReservation);

        return { success: true, message: 'Rezervácia bola úspešne vytvorená a čaká na schválenie.' };
    },

    validateReservation(data) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            return { valid: false, message: 'Pre vytvorenie rezervácie musíte byť prihlásený.' };
        }
        if (!currentUser.approved && currentUser.role !== 'owner' && currentUser.role !== 'deputy') {
            return { valid: false, message: 'Váš účet nie je schválený.' };
        }

        const start = data.dateFrom;
        const end = data.dateTo;
        const now = new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return { valid: false, message: 'Neplatný dátum alebo čas.' };
        }

        if (start <= now) {
            return { valid: false, message: 'Začiatok rezervácie musí byť v budúcnosti.' };
        }

        if (start >= end) {
            return { valid: false, message: 'Koniec rezervácie musí byť po začiatku.' };
        }

        const durationMs = end - start;
        const durationMins = durationMs / (1000 * 60);
        if (durationMins < 20) {
            return { valid: false, message: 'Minimálne trvanie rezervácie je 20 minút.' };
        }
        
        // VFR Check
        if (typeof VFR !== 'undefined' && VFR.isTimeRangeInVfr) {
             const vfrCheck = VFR.isTimeRangeInVfr(start, end);
             if (!vfrCheck) {
                 return { valid: false, message: 'Celý čas rezervácie musí byť v rámci VFR dňa (od východu do západu slnka).' };
             }
        }

        const conflicts = this.getConflicts(data.aircraftId, start, end);
        if (conflicts.length > 0) {
            return { valid: false, message: 'Zvolený čas sa prekrýva s inou rezerváciou.' };
        }

        return { valid: true };
    },

    cancelReservation(id) {
        const reservations = DataStore.getReservations();
        const currentUser = Auth.getCurrentUser();
        const index = reservations.findIndex(r => r.id === id);
        
        if (index === -1) return { success: false, message: 'Rezervácia nenájdená.' };
        
        const reservation = reservations[index];
        if (reservation.pilotId !== currentUser.id) {
            return { success: false, message: 'Nemáte oprávnenie zrušiť túto rezerváciu.' };
        }
        
        if (reservation.status !== 'pending') {
            return { success: false, message: 'Je možné zrušiť iba čakajúce rezervácie.' };
        }

        reservations.splice(index, 1);
        DataStore.set('reservations', reservations);
        return { success: true, message: 'Rezervácia bola zrušená.' };
    },

    getConflicts(aircraftId, dateFrom, dateTo, excludeId = null) {
        const reservations = DataStore.getReservations();
        const start = new Date(dateFrom).getTime();
        const end = new Date(dateTo).getTime();

        return reservations.filter(r => {
            if (r.id === excludeId) return false;
            if (r.aircraftId !== aircraftId) return false;
            if (r.status === 'rejected') return false; // Rejected don't conflict

            const rStart = new Date(r.dateFrom).getTime();
            const rEnd = new Date(r.dateTo).getTime();

            // Conflict if start is before rEnd AND end is after rStart
            return start < rEnd && end > rStart;
        });
    },
    
    getAircraft(id) {
        const fleet = DataStore.getFleet();
        return fleet.find(a => a.id === id);
    },

    parseDateTime(dateStr, timeStr = null) {
        if (!dateStr) return new Date(NaN);
        let dateTimeStr = dateStr;
        if (timeStr) {
            dateTimeStr = `${dateStr}T${timeStr}`;
        }
        if (dateTimeStr.includes('T')) {
            const parts = dateTimeStr.split('T');
            const dateParts = parts[0].split('-');
            const timeParts = parts[1].split(':');
            if (dateParts.length === 3 && timeParts.length >= 2) {
                return new Date(
                    parseInt(dateParts[0], 10),
                    parseInt(dateParts[1], 10) - 1,
                    parseInt(dateParts[2], 10),
                    parseInt(timeParts[0], 10),
                    parseInt(timeParts[1], 10),
                    0
                );
            }
        }
        return new Date(dateTimeStr);
    },

    updateVfrInfo() {
        const dateInput = document.getElementById('booking-date-from') || document.getElementById('booking-datetime-from');
        const vfrDisplay = document.getElementById('vfr-info-display');
        
        if (dateInput && vfrDisplay && typeof VFR !== 'undefined' && VFR.getVfrWindow) {
            let val = dateInput.value;
            if (val.includes('T')) {
                val = val.split('T')[0];
            }
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                const w = VFR.getVfrWindow(date);
                if (w && w.sunrise && w.sunset) {
                    const sr = `${String(w.sunrise.getHours()).padStart(2, '0')}:${String(w.sunrise.getMinutes()).padStart(2, '0')}`;
                    const ss = `${String(w.sunset.getHours()).padStart(2, '0')}:${String(w.sunset.getMinutes()).padStart(2, '0')}`;
                    vfrDisplay.innerHTML = `<strong>VFR deň:</strong> Východ slnka: ${sr}, Západ slnka: ${ss}`;
                    vfrDisplay.style.display = 'block';
                }
            }
        }
    },

    init() {
        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'booking-form') {
                e.preventDefault();
                
                let aircraftId = e.target.getAttribute('data-aircraft-id');
                if (!aircraftId) {
                    const selectEl = document.getElementById('booking-aircraft-id');
                    if (selectEl) aircraftId = selectEl.value;
                }
                
                let start, end;
                const dtFromEl = document.getElementById('booking-datetime-from');
                const dtToEl = document.getElementById('booking-datetime-to');
                
                if (dtFromEl && dtToEl) {
                    start = Booking.parseDateTime(dtFromEl.value);
                    end = Booking.parseDateTime(dtToEl.value);
                } else {
                    const dateFrom = document.getElementById('booking-date-from').value;
                    const timeFrom = document.getElementById('booking-time-from').value;
                    const dateTo = document.getElementById('booking-date-to').value;
                    const timeTo = document.getElementById('booking-time-to').value;
                    
                    start = Booking.parseDateTime(dateFrom, timeFrom);
                    end = Booking.parseDateTime(dateTo, timeTo);
                }
                
                const data = {
                    aircraftId,
                    dateFrom: start,
                    dateTo: end,
                    purpose: document.getElementById('booking-purpose').value,
                    note: document.getElementById('booking-note').value
                };
                
                const result = Booking.createReservation(data);
                if (result.success) {
                    Auth.showToast(result.message, 'success');
                    window.dispatchEvent(new CustomEvent('reservation-created'));
                } else {
                    Auth.showToast(result.message, 'error');
                }
            }
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('cancel-reservation-btn')) {
                const id = e.target.getAttribute('data-id');
                if (confirm('Naozaj chcete zrušiť túto rezerváciu?')) {
                    const result = Booking.cancelReservation(id);
                    if (result.success) {
                        Auth.showToast(result.message, 'success');
                        window.dispatchEvent(new CustomEvent('reservation-cancelled'));
                    } else {
                        Auth.showToast(result.message, 'error');
                    }
                }
            }
        });
        
        document.body.addEventListener('change', (e) => {
            if (e.target.id === 'booking-date-from') {
                Booking.updateVfrInfo();
                // Optionally auto-set date-to
                const dateTo = document.getElementById('booking-date-to');
                if (dateTo && !dateTo.value) {
                    dateTo.value = e.target.value;
                }
            }
        });
    }
};

export default Booking;
