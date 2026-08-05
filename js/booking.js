import DataStore from './data.js?v=1.0.1';
import VFR from './vfr.js?v=1.0.1';
import Auth from './auth.js?v=1.0.1';

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
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD for internal use
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        const dateDisplayStr = `${dd}/${mm}/${yyyy}`; // DD/MM/YYYY for display

        // Compute VFR window for this date to limit time selects
        let vfrStartH = 5;  // fallback: 05:00
        let vfrEndH   = 20; // fallback: 20:00
        if (typeof VFR !== 'undefined' && VFR.getVfrWindow) {
            const vfrWin = VFR.getVfrWindow(dateObj);
            if (vfrWin && vfrWin.sunrise && vfrWin.sunset) {
                const vs = vfrWin.vfrStart || vfrWin.sunrise;
                const ve = vfrWin.vfrEnd   || vfrWin.sunset;
                vfrStartH = vs.getHours() + vs.getMinutes() / 60;
                vfrEndH   = ve.getHours() + ve.getMinutes() / 60;
            }
        }

        let timeFromStr = '';
        let timeToStr = '';
        if (hour !== null && hour !== undefined) {
            const hStr = String(Math.max(Math.floor(vfrStartH), Math.min(hour, Math.ceil(vfrEndH)))).padStart(2, '0');
            timeFromStr = `${hStr}:00`;
            const nextH = Math.min(parseInt(hStr) + 1, Math.ceil(vfrEndH));
            timeToStr = `${String(nextH).padStart(2, '0')}:00`;
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

        // Get existing reservations for this day to show occupied slots
        let existingBookingsHtml = '';
        if (aircraftId) {
            const formattedDateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
            const dayReservations = DataStore.getReservations().filter(r => {
                const rDateStr = r.dateFrom.split('T')[0];
                return (aircraftId === 'all' || r.aircraftId === aircraftId) && rDateStr === formattedDateStr && r.status !== 'rejected';
            });
            
            if (dayReservations.length > 0) {
                // Sort by time
                dayReservations.sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
                const formatT = (isoStr) => {
                    const d = new Date(isoStr);
                    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                };
                
                existingBookingsHtml = `
                    <div class="existing-bookings-info" style="margin-bottom: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; font-size: 0.85rem;">
                        <strong style="color: var(--color-accent); display: block; margin-bottom: 5px;">📅 Rezervácie na tento deň:</strong>
                        <ul style="margin: 0; padding-left: 15px; color: var(--color-text-secondary); line-height: 1.4;">
                            ${dayReservations.map(r => {
                                const ac = DataStore.getFleet().find(a => a.id === r.aircraftId);
                                const acLabel = ac ? ` [${ac.registration}]` : '';
                                return `<li>${formatT(r.dateFrom)} - ${formatT(r.dateTo)}: ${r.pilotName}${acLabel}</li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            } else {
                existingBookingsHtml = `
                    <div class="existing-bookings-info" style="margin-bottom: 15px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px; font-size: 0.85rem; color: #10b981;">
                        <strong>✅ Celý deň je zatiaľ voľný.</strong>
                    </div>
                `;
            }
        }

        return `
            <div class="booking-form-container card card--glass" style="padding: 20px; max-width: 480px; margin: 0 auto;">
                <h3 class="booking-title" style="margin-bottom: 20px; text-align: center;">Nová rezervácia</h3>
                
                <form id="booking-form" class="booking-form" data-aircraft-id="${aircraft ? aircraft.id : ''}">
                    ${aircraftSelectorHtml}
                    ${existingBookingsHtml}
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
                        <div>
                            <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Odlet (Vzlet)</label>
                            <div style="display: grid; grid-template-columns: 1fr auto auto auto; gap: 6px; align-items: center;">
                                <input type="text" id="booking-date-from" name="dateFrom" required class="form-input" value="${dateDisplayStr}" placeholder="DD/MM/RRRR" maxlength="10" inputmode="numeric" style="padding: 8px 10px; font-size: 0.9rem; width: 130px;">
                                ${Booking.buildTimeSelectHtml('booking-time-from', timeFromStr || `${String(Math.floor(vfrStartH)).padStart(2,'0')}:00`, vfrStartH, vfrEndH)}
                            </div>
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Prílet (Pristátie)</label>
                            <div style="display: grid; grid-template-columns: 1fr auto auto auto; gap: 6px; align-items: center;">
                                <input type="text" id="booking-date-to" name="dateTo" required class="form-input" value="${dateDisplayStr}" placeholder="DD/MM/RRRR" maxlength="10" inputmode="numeric" style="padding: 8px 10px; font-size: 0.9rem; width: 130px;">
                                ${Booking.buildTimeSelectHtml('booking-time-to', timeToStr || `${String(Math.min(Math.floor(vfrStartH)+2, Math.ceil(vfrEndH))).padStart(2,'0')}:00`, vfrStartH, vfrEndH)}
                            </div>
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
        const isPast = end < new Date();
        
        const isAdmin = currentUser && (currentUser.role === 'owner' || currentUser.role === 'deputy');
        const isOwnCancellable = currentUser && currentUser.id === reservation.pilotId && reservation.status !== 'rejected' && !isPast;
        const canCancel = isOwnCancellable || (isAdmin && reservation.status !== 'rejected' && !isPast);
        
        const statusMap = {
            'pending': 'Čakajúca',
            'approved': 'Schválená',
            'rejected': 'Zamietnutá'
        };
        
        const pad = n => n.toString().padStart(2, '0');
        const formatDate = d => `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
        const formatTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        
        return `
            <div class="reservation-card ${isPast ? 'reservation-card--past' : ''}" data-id="${reservation.id}">
                <div class="reservation-header">
                    <span class="reservation-aircraft">${aircraft ? aircraft.type + ' ' + aircraft.registration : 'Neznáme'}</span>
                    <span class="badge badge--${reservation.status}">${statusMap[reservation.status]}</span>
                </div>
                <div class="reservation-body">
                    <p class="reservation-time">
                        ${formatDate(start)} ${formatTime(start)} - 
                        ${formatDate(end)} ${formatTime(end)}
                    </p>
                    <p class="reservation-pilot"><strong>Pilot:</strong> ${reservation.pilotName || 'Neznámy'}</p>
                    <p class="reservation-purpose"><strong>Účel:</strong> ${reservation.purpose}</p>
                    ${reservation.note ? `<p class="reservation-note"><strong>Poznámka:</strong> ${reservation.note}</p>` : ''}
                </div>
                ${canCancel ? `
                <div class="reservation-footer">
                    <button class="btn btn--danger btn--sm cancel-reservation-btn" data-id="${reservation.id}">Zrušiť rezerváciu</button>
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
        const isAdmin = currentUser && (currentUser.role === 'owner' || currentUser.role === 'deputy');
        const isOwner = currentUser && reservation.pilotId === currentUser.id;
        
        if (!isOwner && !isAdmin) {
            return { success: false, message: 'Nemáte oprávnenie zrušiť túto rezerváciu.' };
        }
        if (reservation.status === 'rejected') {
            return { success: false, message: 'Zamietnutá rezervácia sa nedá zrušiť.' };
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

    buildTimeSelectHtml(idPrefix, defaultTime, vfrStartH = 0, vfrEndH = 23) {
        const [defH, defM] = (defaultTime || '08:00').split(':');
        const mins = ['00','05','10','15','20','25','30','35','40','45','50','55'];
        // Only show hours within the VFR window
        const firstH = Math.max(0, Math.floor(vfrStartH));
        const lastH  = Math.min(23, Math.ceil(vfrEndH));
        const hourOpts = Array.from({length: lastH - firstH + 1}, (_, i) => {
            const v = String(firstH + i).padStart(2, '0');
            return `<option value="${v}"${v === defH ? ' selected' : ''}>${v}</option>`;
        }).join('');
        const minOpts = mins.map(m => `<option value="${m}"${m === (defM || '00') ? ' selected' : ''}>${m}</option>`).join('');
        return `
            <select id="${idPrefix}-h" class="form-input" style="width: 60px; padding: 8px 4px; font-size: 1rem; text-align: center;">${hourOpts}</select>
            <span style="font-weight:700;font-size:1.1rem;color:var(--color-text-primary);align-self:center;padding:0 2px;">:</span>
            <select id="${idPrefix}-m" class="form-input" style="width: 60px; padding: 8px 4px; font-size: 1rem; text-align: center;">${minOpts}</select>
        `;
    },

    // Convert DD/MM/YYYY string to a Date object (returns Invalid Date if malformed)
    parseDMY(str) {
        if (!str) return new Date(NaN);
        // Accept DD/MM/YYYY or DD.MM.YYYY
        const m = str.match(/^(\d{1,2})[/\.](\d{1,2})[/\.](\d{4})$/);
        if (m) {
            return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10));
        }
        // Fallback: try YYYY-MM-DD
        return new Date(str);
    },

    // Convert DD/MM/YYYY → YYYY-MM-DD (for internal date math)
    dmyToIso(str) {
        if (!str) return '';
        const m = str.match(/^(\d{1,2})[/\.](\d{1,2})[/\.](\d{4})$/);
        if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
        return str; // already ISO or fallback
    },

    // Convert YYYY-MM-DD or Date → DD/MM/YYYY display string
    isoToDmy(isoOrDate) {
        let d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate + 'T00:00:00');
        if (isNaN(d.getTime())) return isoOrDate;
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    },

    parseDateTime(dateStr, timeStr = null) {
        if (!dateStr) return new Date(NaN);
        // Convert DD/MM/YYYY → YYYY-MM-DD if needed
        const isoDate = Booking.dmyToIso(dateStr);
        let dateTimeStr = isoDate;
        if (timeStr) {
            dateTimeStr = `${isoDate}T${timeStr}`;
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

    updateVfrInfo(form = null) {
        const dateInput = form ? form.querySelector('#booking-date-from') : (document.getElementById('booking-date-from') || document.getElementById('booking-datetime-from'));
        const vfrDisplay = form ? form.querySelector('#vfr-info-display') : document.getElementById('vfr-info-display');
        
        if (dateInput && vfrDisplay && typeof VFR !== 'undefined' && VFR.getVfrWindow) {
            let val = dateInput.value;
            if (val.includes('T')) val = val.split('T')[0];
            // Parse DD/MM/YYYY or YYYY-MM-DD
            const date = Booking.parseDMY(val);
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
                if (!aircraftId || aircraftId === 'all') {
                    const selectEl = e.target.querySelector('#booking-aircraft-id');
                    if (selectEl) aircraftId = selectEl.value;
                }
                
                let start, end;
                const dtFromEl = e.target.querySelector('#booking-datetime-from');
                const dtToEl = e.target.querySelector('#booking-datetime-to');

                // Helper: read time from select dropdowns or fallback to time input
                const getTimeVal = (prefix) => {
                    const hEl = e.target.querySelector('#' + prefix + '-h');
                    const mEl = e.target.querySelector('#' + prefix + '-m');
                    if (hEl && mEl) return `${hEl.value}:${mEl.value}`;
                    const tEl = e.target.querySelector('#' + prefix);
                    return tEl ? tEl.value : '00:00';
                };
                
                if (dtFromEl && dtToEl) {
                    start = Booking.parseDateTime(dtFromEl.value);
                    end = Booking.parseDateTime(dtToEl.value);
                } else {
                    const dateFrom = e.target.querySelector('#booking-date-from').value;
                    const timeFrom = getTimeVal('booking-time-from');
                    const dateTo = e.target.querySelector('#booking-date-to').value;
                    const timeTo = getTimeVal('booking-time-to');
                    
                    start = Booking.parseDateTime(dateFrom, timeFrom);
                    end = Booking.parseDateTime(dateTo, timeTo);
                }
                
                const data = {
                    aircraftId,
                    dateFrom: start,
                    dateTo: end,
                    purpose: e.target.querySelector('#booking-purpose').value,
                    note: e.target.querySelector('#booking-note').value
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

        document.body.addEventListener('input', (e) => {
            // Auto-format date text inputs: insert '/' after day and month digits
            if (e.target.id === 'booking-date-from' || e.target.id === 'booking-date-to') {
                let v = e.target.value.replace(/[^\d]/g, ''); // digits only
                if (v.length > 8) v = v.slice(0, 8);
                if (v.length >= 5) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
                else if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
                e.target.value = v;
            }
        });

        document.body.addEventListener('change', (e) => {
            const form = e.target.form;

            // Auto-align date
            if (e.target.id === 'booking-date-from' && form) {
                Booking.updateVfrInfo(form);
                const dateTo = form.querySelector('#booking-date-to');
                if (dateTo) {
                    const fromDate = Booking.parseDMY(e.target.value);
                    const toDate = Booking.parseDMY(dateTo.value);
                    if (!dateTo.value || isNaN(toDate.getTime()) || toDate < fromDate) {
                        dateTo.value = e.target.value;
                    }
                }
            }

            // Auto-align time (departure hour + 2 hours default)
            if (e.target.id === 'booking-time-from-h' && form) {
                const depHour = parseInt(e.target.value, 10);
                const arrHour = (depHour + 2) % 24;
                const arrHourStr = String(arrHour).padStart(2, '0');
                const toHourEl = form.querySelector('#booking-time-to-h');
                if (toHourEl) {
                    toHourEl.value = arrHourStr;
                }

                // If it wraps to next day, increment arrival date
                if (depHour + 2 >= 24) {
                    const depDateEl = form.querySelector('#booking-date-from');
                    const toDateEl = form.querySelector('#booking-date-to');
                    if (depDateEl && toDateEl) {
                        const depDate = Booking.parseDMY(depDateEl.value);
                        if (!isNaN(depDate.getTime())) {
                            depDate.setDate(depDate.getDate() + 1);
                            toDateEl.value = Booking.isoToDmy(depDate);
                        }
                    }
                } else {
                    const depDateEl = form.querySelector('#booking-date-from');
                    const toDateEl = form.querySelector('#booking-date-to');
                    if (depDateEl && toDateEl) {
                        toDateEl.value = depDateEl.value;
                    }
                }
            }

            // Guard: don't let date-to be earlier than date-from
            if (e.target.id === 'booking-date-to' && form) {
                const depDateEl = form.querySelector('#booking-date-from');
                if (depDateEl) {
                    const fromDate = Booking.parseDMY(depDateEl.value);
                    const toDate = Booking.parseDMY(e.target.value);
                    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && toDate < fromDate) {
                        e.target.value = depDateEl.value;
                    }
                }
            }
        });
    }
};

export default Booking;

