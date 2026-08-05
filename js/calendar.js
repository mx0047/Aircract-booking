import DataStore from './data.js?v=1.0.1';
import VFR from './vfr.js?v=1.0.1';
import Booking from './booking.js?v=1.0.1';
import Auth from './auth.js?v=1.0.1';

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
            
            // Smoothly scroll the daily timeline into view so mobile users see it immediately
            setTimeout(() => {
                const timelineEl = document.querySelector('.timeline');
                if (timelineEl) {
                    timelineEl.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }

        // Slot selection for booking
        const slotEl = e.target.closest('.timeline__slot');
        if (slotEl && currentAircraftId) {
            // Check if user didn't click on a booking or marker itself
            if (!e.target.closest('.timeline__booking')) {
                const hour = parseInt(slotEl.dataset.hour, 10);
                const dateStr = this.formatDateStr(selectedDate);
                
                window.dispatchEvent(new CustomEvent('create-booking', {
                    detail: {
                        aircraftId: currentAircraftId,
                        date: dateStr,
                        hour: hour
                    }
                }));
            }
        }

        // Add button
        const addBtn = e.target.closest('.timeline__add-btn');
        if (addBtn) {
            const dateStr = this.formatDateStr(selectedDate);
            window.dispatchEvent(new CustomEvent('create-booking', {
                detail: {
                    aircraftId: currentAircraftId,
                    date: dateStr,
                    hour: null
                }
            }));
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
                return (aircraftId === 'all' || b.aircraftId === aircraftId) && this.formatDateStr(new Date(b.dateFrom)) === dateStr && b.status !== 'rejected';
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

        // Compute VFR-based start/end hours for the timeline
        const startHour = Math.max(0, Math.floor(vfrStart) - 1); // 1 hour before VFR
        const endHour   = Math.min(23, Math.ceil(vfrEnd));        // to the VFR end hour
        
        const bookings = DataStore.getReservations().filter(b => {
            const bDateStr = this.formatDateStr(new Date(b.dateFrom));
            return (aircraftId === 'all' || b.aircraftId === aircraftId) && bDateStr === dateStr && b.status !== 'rejected';
        });
        const currentUser = Auth.getCurrentUser();

        for (let hour = startHour; hour <= endHour; hour++) {
            const isNight = hour < Math.floor(vfrStart) || hour >= Math.ceil(vfrEnd);
            const slotClass = isNight ? 'timeline__night-zone' : 'timeline__vfr-zone';
            
            html += `
                <div class="timeline__hour">
                    <div class="timeline__time-label">${String(hour).padStart(2, '0')}:00</div>
                    <div class="timeline__slot ${slotClass}" data-hour="${hour}">
            `;

            // Sunrise/Sunset markers (stay inside slot)
            if (hour === Math.floor(sr)) {
                const fm = (Math.floor((sr % 1) * 60)).toString().padStart(2, '0');
                html += `<div class="timeline__sunrise-marker" style="top: ${(sr % 1) * 100}%"><span>☀️ Východ ${Math.floor(sr)}:${fm}</span></div>`;
            }
            if (hour === Math.floor(ss)) {
                const fm = (Math.floor((ss % 1) * 60)).toString().padStart(2, '0');
                html += `<div class="timeline__sunset-marker" style="top: ${(ss % 1) * 100}%"><span>🌙 Západ ${Math.floor(ss)}:${fm}</span></div>`;
            }

            html += `</div>`; // close slot

            // Render each booking as ONE continuous block — only in the start hour
            bookings.forEach(b => {
                const bStart = new Date(b.dateFrom);
                const bEnd   = new Date(b.dateTo);
                const bStartH = bStart.getHours() + bStart.getMinutes() / 60;
                const bEndH   = bEnd.getHours()   + bEnd.getMinutes()   / 60;

                if (Math.floor(bStartH) !== hour) return; // only render in the booking's start hour

                const formatT = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

                const topPct    = (bStartH % 1) * 100;          // offset within the start hour (0-100%)
                const heightPct = (bEndH - bStartH) * 100;       // spans N hours → N×100% of 60px

                const isOwn = currentUser && b.pilotId === currentUser.id;
                const statusClass = b.status === 'pending' ? 'timeline__booking--pending' : 'timeline__booking--approved';
                const ownClass    = isOwn ? 'timeline__booking--own' : '';
                const isPast      = bEnd < new Date();
                const pastClass   = isPast ? 'timeline__booking--past' : '';

                const ac = DataStore.getFleet().find(a => a.id === b.aircraftId);
                const acLabel = ac ? ` (${ac.registration})` : '';

                html += `
                    <div class="timeline__booking ${statusClass} ${ownClass} ${pastClass}"
                         style="top: ${topPct}%; height: ${heightPct}%; z-index: 5; min-height: 22px;">
                        <span class="timeline__booking-title">${b.pilotName || 'Pilot'}${acLabel}</span>
                        <span class="timeline__booking-time">${formatT(bStart)} - ${formatT(bEnd)}</span>
                    </div>
                `;
            });

            html += `</div>`; // close timeline__hour
        }

        html += `
                </div>
            </div>
        `;

        return html;
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

    renderCalendarScreen(aircraftId) {
        if (aircraftId) currentAircraftId = aircraftId;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateStr = this.formatDateStr(selectedDate);
        
        const isAll = currentAircraftId === 'all';
        const aircraft = !isAll ? DataStore.getFleet().find(a => a.id === currentAircraftId) : null;
        const reg = aircraft ? aircraft.registration : '';
        return `
            <div class="calendar-screen">
                ${this.renderMonthView(year, month, currentAircraftId)}
                
                <!-- Action bar between month and timeline -->
                <div class="calendar__actions" style="display: flex; justify-content: center; margin: 15px 0 5px 0;">
                    <button class="btn btn-primary timeline__add-btn" style="display: flex; align-items: center; gap: 8px; padding: 10px 20px; font-weight: 600; border-radius: 8px; box-shadow: var(--shadow-md); width: calc(100% - 30px); margin: 0 15px; justify-content: center;">
                        <span style="font-size: 1rem;">➕</span> Rezervácia letu
                    </button>
                </div>
                
                ${this.renderDayTimeline(selectedDate, currentAircraftId)}
            </div>
        `;
    }
};

export default Calendar;
