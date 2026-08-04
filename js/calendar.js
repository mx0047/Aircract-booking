import DataStore from './data.js';
import VFR from './vfr.js';

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
                document.dispatchEvent(new CustomEvent('create-booking', {
                    detail: { aircraftId: currentAircraftId, date: dateStr, hour }
                }));
            }
        }

        // Add button
        const addBtn = e.target.closest('.timeline__add-btn');
        if (addBtn && currentAircraftId) {
            const dateStr = this.formatDateStr(selectedDate);
            document.dispatchEvent(new CustomEvent('create-booking', {
                detail: { aircraftId: currentAircraftId, date: dateStr }
            }));
        }
    },

    updateCalendarScreen() {
        const container = document.querySelector('#screen-calendar');
        if (container && currentAircraftId) {
            container.innerHTML = this.renderCalendarScreen(currentAircraftId);
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

    renderCalendarScreen(aircraftId) {
        if (aircraftId) currentAircraftId = aircraftId;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        return `
            <div class="calendar-screen">
                ${this.renderMonthView(year, month, currentAircraftId)}
                ${this.renderDayTimeline(selectedDate, currentAircraftId)}
            </div>
        `;
    }
};

export default Calendar;
