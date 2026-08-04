import DataStore from './data.js';
import VFR from './vfr.js';
import Booking from './booking.js';

let currentDate = new Date();
let selectedDate = new Date();
let currentAircraftId = null;

const MONTH_NAMES = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 
    'Júl', 'August', 'September', 'Október', 'November', 'December'
];
const DAY_NAMES = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

const Calendar = {
    init() {
        document.addEventListener('click', this.handleClicks.bind(this));
    },

    handleClicks(e) {
        // Month navigation
        if (e.target.closest('.calendar__nav-btn--prev')) {
            currentDate.setMonth(currentDate.getMonth() - 1);
            this.updateCalendarScreen();
        } else if (e.target.closest('.calendar__nav-btn--next')) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            this.updateCalendarScreen();
        }
        
        // Day selection
        const dayEl = e.target.closest('.calendar__day:not(.calendar__day--other-month)');
        if (dayEl) {
            const day = parseInt(dayEl.dataset.day, 10);
            selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            this.updateCalendarScreen();
        }

        // Slot selection for booking
        const slotEl = e.target.closest('.timeline__slot');
        if (slotEl && currentAircraftId) {
            // Check if user didn't click on a booking or marker itself
            if (!e.target.closest('.timeline__booking')) {
                const hour = parseInt(slotEl.dataset.hour, 10);
                const dateStr = this.formatDateStr(selectedDate);
                
                const dateFromInput = document.getElementById('booking-date-from');
                const timeFromInput = document.getElementById('booking-time-from');
                const dateToInput = document.getElementById('booking-date-to');
                const timeToInput = document.getElementById('booking-time-to');
                
                if (dateFromInput && dateToInput) {
                    dateFromInput.value = dateStr;
                    dateToInput.value = dateStr;
                    
                    const hStr = String(hour).padStart(2, '0');
                    const nextHStr = String((hour + 1) % 24).padStart(2, '0');

                    // Support both select-based and input-based time pickers
                    const hFromSel = document.getElementById('booking-time-from-h');
                    const mFromSel = document.getElementById('booking-time-from-m');
                    const hToSel = document.getElementById('booking-time-to-h');
                    const mToSel = document.getElementById('booking-time-to-m');
                    if (hFromSel) { hFromSel.value = hStr; mFromSel.value = '00'; }
                    if (hToSel) { hToSel.value = nextHStr; mToSel.value = '00'; }
                    
                    if (typeof Booking !== 'undefined' && Booking.updateVfrInfo) {
                        Booking.updateVfrInfo();
                    }
                    
                    const formContainer = document.querySelector('.quick-booking');
                    if (formContainer) {
                        formContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        }

        // Add button
        const addBtn = e.target.closest('.timeline__add-btn');
        if (addBtn) {
            const formContainer = document.querySelector('.quick-booking');
            if (formContainer) {
                formContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    },

    updateCalendarScreen() {
        const container = document.querySelector('#screen-calendar');
        if (container && currentAircraftId) {
            container.innerHTML = this.renderCalendarScreen(currentAircraftId);
            if (typeof Booking !== 'undefined' && Booking.updateVfrInfo) {
                Booking.updateVfrInfo();
            }
        }
    },

    formatDateStr(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    setSelectedDate(date) {
        selectedDate = new Date(date);
        currentDate = new Date(date);
    },

    getSelectedDate() {
        return selectedDate;
    },

    setAircraftId(id) {
        currentAircraftId = id;
    },

    renderMonthView(year, month, aircraftId) {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Adjust for Monday start (0 = Monday, 6 = Sunday)
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        let html = `
            <div class="calendar">
                <div class="calendar__header">
                    <button class="calendar__nav-btn calendar__nav-btn--prev">&lt;</button>
                    <div class="calendar__month-label">${MONTH_NAMES[month]} ${year}</div>
                    <button class="calendar__nav-btn calendar__nav-btn--next">&gt;</button>
                </div>
                <div class="calendar__grid">
        `;

        DAY_NAMES.forEach(day => {
            html += `<div class="calendar__day-header">${day}</div>`;
        });

        const today = new Date();

        // Previous month days
        for (let i = 0; i < startDay; i++) {
            html += `<div class="calendar__day calendar__day--other-month"></div>`;
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.formatDateStr(new Date(year, month, day));
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
            
            const hasBooking = DataStore.getReservations().some(b => {
                return b.aircraftId === aircraftId && this.formatDateStr(new Date(b.dateFrom)) === dateStr && b.status !== 'rejected';
            });

            let classes = 'calendar__day';
            if (isToday) classes += ' calendar__day--today';
            if (isSelected) classes += ' calendar__day--selected';
            if (hasBooking) classes += ' calendar__day--has-booking';

            html += `<div class="${classes}" data-day="${day}">${day}</div>`;
        }

        html += `
                </div>
            </div>
        `;
        return html;
    },

    renderDayTimeline(date, aircraftId) {
        const dateStr = this.formatDateStr(date);
        const window = VFR.getVfrWindow(date);
        
        let vfrStartStr = "00:00";
        let vfrEndStr = "23:59";
        let sr = 6;
        let ss = 18;
        let vfrStart = 5.5;
        let vfrEnd = 18.5;

        if (window && window.sunrise && window.sunset) {
            sr = window.sunrise.getHours() + window.sunrise.getMinutes() / 60;
            ss = window.sunset.getHours() + window.sunset.getMinutes() / 60;
            const vs = window.vfrStart || window.sunrise;
            const ve = window.vfrEnd || window.sunset;
            vfrStart = vs.getHours() + vs.getMinutes() / 60;
            vfrEnd = ve.getHours() + ve.getMinutes() / 60;
            
            const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            vfrStartStr = formatTime(vs);
            vfrEndStr = formatTime(ve);
        }

        let html = `
            <div class="timeline">
                <div class="timeline__header">
                    <div class="timeline__vfr-info">
                        ☀️ VFR okno: ${vfrStartStr} - ${vfrEndStr}
                    </div>
                </div>
                <div class="timeline__grid">
        `;

        const startHour = 4;
        const endHour = 22;
        
        const bookings = DataStore.getReservations().filter(b => {
            const bDateStr = this.formatDateStr(new Date(b.dateFrom));
            return b.aircraftId === aircraftId && bDateStr === dateStr && b.status !== 'rejected';
        });
        const currentUser = DataStore.getCurrentUser();

        for (let hour = startHour; hour <= endHour; hour++) {
            const isNight = hour < Math.floor(vfrStart) || hour >= Math.ceil(vfrEnd);
            const slotClass = isNight ? 'timeline__night-zone' : 'timeline__vfr-zone';
            
            html += `
                <div class="timeline__hour">
                    <div class="timeline__hour-label">${String(hour).padStart(2, '0')}:00</div>
                    <div class="timeline__slot ${slotClass}" data-hour="${hour}">
            `;

            // Sunrise/Sunset markers
            if (hour === Math.floor(sr)) {
                const fm = (Math.floor((sr % 1) * 60)).toString().padStart(2, '0');
                html += `<div class="timeline__sunrise-marker" style="top: ${(sr % 1) * 100}%"><span>☀️ Východ ${Math.floor(sr)}:${fm}</span></div>`;
            }
            if (hour === Math.floor(ss)) {
                const fm = (Math.floor((ss % 1) * 60)).toString().padStart(2, '0');
                html += `<div class="timeline__sunset-marker" style="top: ${(ss % 1) * 100}%"><span>🌙 Západ ${Math.floor(ss)}:${fm}</span></div>`;
            }

            // Render bookings overlay
            bookings.forEach(b => {
                const bStart = new Date(b.dateFrom);
                const bEnd = new Date(b.dateTo);
                const bStartHours = bStart.getHours() + bStart.getMinutes()/60;
                const bEndHours = bEnd.getHours() + bEnd.getMinutes()/60;
                
                const formatT = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                const bStartTime = formatT(bStart);
                const bEndTime = formatT(bEnd);
                
                if ((hour === Math.floor(bStartHours)) || (hour > bStartHours && hour < bEndHours)) {
                    let top = 0;
                    let height = 100;
                    let renderContent = false;
                    
                    if (hour === Math.floor(bStartHours)) {
                        top = (bStartHours % 1) * 100;
                        height = 100 - top;
                        renderContent = true;
                        
                        if (Math.floor(bEndHours) === hour) {
                            height = (bEndHours - bStartHours) * 100;
                        }
                    } else if (hour === Math.floor(bEndHours)) {
                        height = (bEndHours % 1) * 100;
                    }

                    const isOwn = currentUser && b.pilotId === currentUser.id;
                    const statusClass = b.status === 'pending' ? 'timeline__booking--pending' : 'timeline__booking--approved';
                    const ownClass = isOwn ? 'timeline__booking--own' : '';

                    if (renderContent) {
                        html += `
                            <div class="timeline__booking ${statusClass} ${ownClass}" style="top: ${top}%; height: ${height}%">
                                <span class="timeline__booking-title">${b.pilotName || 'Pilot'}</span>
                                <span class="timeline__booking-time">${bStartTime} - ${bEndTime}</span>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="timeline__booking ${statusClass} ${ownClass}" style="top: ${top}%; height: ${height}%; border-top: none;">
                            </div>
                        `;
                    }
                }
            });

            html += `
                    </div>
                </div>
            `;
        }

        html += `
                </div>
                <button class="timeline__add-btn">+</button>
            </div>
        `;

        return html;
    },

    buildTimeSelectHtml(idPrefix, defaultTime) {
        const [defH, defM] = (defaultTime || '08:00').split(':');
        const mins = ['00','05','10','15','20','25','30','35','40','45','50','55'];
        const hourOpts = Array.from({length: 24}, (_, i) => {
            const v = String(i).padStart(2, '0');
            return `<option value="${v}"${v === defH ? ' selected' : ''}>${v}</option>`;
        }).join('');
        const minOpts = mins.map(m => `<option value="${m}"${m === (defM || '00') ? ' selected' : ''}>${m}</option>`).join('');
        return `
            <select id="${idPrefix}-h" class="form-input" style="width: 60px; padding: 8px 4px; font-size: 1rem; text-align: center;">${hourOpts}</select>
            <span style="font-weight:700;font-size:1.1rem;color:var(--color-text-primary);align-self:center;padding:0 2px;">:</span>
            <select id="${idPrefix}-m" class="form-input" style="width: 60px; padding: 8px 4px; font-size: 1rem; text-align: center;">${minOpts}</select>
        `;
    },

    renderCalendarScreen(aircraftId) {
        if (aircraftId) currentAircraftId = aircraftId;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateStr = this.formatDateStr(selectedDate);
        
        const aircraft = DataStore.getFleet().find(a => a.id === currentAircraftId);
        const reg = aircraft ? aircraft.registration : '';
        const type = aircraft ? aircraft.type : '';

        // Default times
        const timeFrom = "08:00";
        const timeTo = "10:00";

        return `
            <div class="calendar-screen">
                ${this.renderMonthView(year, month, currentAircraftId)}
                
                <!-- Quick Booking Form Box -->
                <div class="quick-booking card card--glass" style="margin: 15px; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        ✈️ Rýchla rezervácia (${type} ${reg})
                    </h3>
                    <form id="booking-form" class="booking-form" data-aircraft-id="${currentAircraftId}">
                        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
                            <div>
                                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Odlet (Vzlet)</label>
                                <div style="display: grid; grid-template-columns: 1fr auto auto auto; gap: 6px; align-items: center;">
                                    <input type="date" id="booking-date-from" required class="form-input" value="${dateStr}" style="padding: 8px 10px; font-size: 0.9rem;">
                                    ${this.buildTimeSelectHtml('booking-time-from', '08:00')}
                                </div>
                            </div>
                            <div>
                                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Prílet (Pristátie)</label>
                                <div style="display: grid; grid-template-columns: 1fr auto auto auto; gap: 6px; align-items: center;">
                                    <input type="date" id="booking-date-to" required class="form-input" value="${dateStr}" style="padding: 8px 10px; font-size: 0.9rem;">
                                    ${this.buildTimeSelectHtml('booking-time-to', '10:00')}
                                </div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                            <div>
                                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Účel letu</label>
                                <input type="text" id="booking-purpose" required class="form-input" placeholder="napr. Výcvik, Výlet" style="padding: 8px 10px; font-size: 0.9rem;">
                            </div>
                            <div>
                                <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px; display:block;">Poznámka (nepovinné)</label>
                                <input type="text" id="booking-note" class="form-input" placeholder="Poznámka..." style="padding: 8px 10px; font-size: 0.9rem;">
                            </div>
                        </div>
                        
                        <div id="vfr-info-display" style="font-size: 0.8rem; color: var(--color-accent); margin-bottom: 10px; display: none;"></div>
                        
                        <button type="submit" class="btn btn-primary btn-block" style="padding: 10px;">Odoslať žiadosť</button>
                    </form>
                </div>
                
                ${this.renderDayTimeline(selectedDate, currentAircraftId)}
            </div>
        `;
    }
};

export default Calendar;
