import DataStore from './data.js';
import VFR from './vfr.js';
import Auth from './auth.js';
import Booking from './booking.js';
import Calendar from './calendar.js';
import Admin from './admin.js';

const App = {
    currentScreen: null,
    currentParams: null,

    init() {
        const appEl = document.getElementById('app');
        
        // Setup initial app shell container
        appEl.innerHTML = `
            <div id="app-shell" class="app">
                <div id="app-header-container"></div>
                <main id="app-content-container" class="app__content"></main>
                <div id="app-nav-container"></div>
            </div>
            <div id="toast-container" class="toast-container"></div>
            <div id="modal-container"></div>
        `;

        // Initialize modules
        Auth.init();
        if (typeof Booking.init === 'function') Booking.init();
        if (typeof Calendar !== 'undefined' && typeof Calendar.init === 'function') Calendar.init();
        if (typeof Admin !== 'undefined' && typeof Admin.init === 'function') Admin.init();

        // Listeners for authentication
        window.addEventListener('auth-changed', (e) => {
            if (e.detail.loggedIn) {
                this.navigateTo('dashboard');
            } else {
                this.navigateTo('login');
            }
        });

        // Global Event Listeners
        window.addEventListener('create-booking', (e) => {
            const { aircraftId, date, hour } = e.detail;
            this.showModal({
                title: 'Nová rezervácia',
                content: typeof Booking.renderBookingForm === 'function' ? Booking.renderBookingForm(aircraftId, date, hour) : 'Formulár nie je k dispozícii.',
                actions: [] // Action handled by the form inside modal
            });
        });

        window.addEventListener('reservation-created', () => {
            this.showToast('Rezervácia bola úspešne vytvorená', 'success');
            const modalContainer = document.getElementById('modal-container');
            if (modalContainer) modalContainer.innerHTML = ''; // Close modal
            
            if (this.currentScreen === 'calendar') {
                this.refreshCurrentScreen();
            } else {
                this.navigateTo('my-reservations');
            }
            this.updateBadges();
        });

        window.addEventListener('reservation-cancelled', () => {
            this.refreshCurrentScreen();
            this.updateBadges();
        });

        window.addEventListener('reservation-approved', () => {
            this.showToast('Rezervácia schválená', 'success');
            this.refreshCurrentScreen();
            this.updateBadges();
        });

        window.addEventListener('reservation-rejected', () => {
            this.showToast('Rezervácia zamietnutá', 'warning');
            this.refreshCurrentScreen();
            this.updateBadges();
        });

        window.addEventListener('user-updated', () => {
            this.refreshCurrentScreen();
            this.updateBadges();
        });

        window.addEventListener('fleet-updated', () => {
            this.refreshCurrentScreen();
        });

        window.addEventListener('admin-tab-changed', () => {
            if (this.currentScreen === 'admin') {
                this.refreshCurrentScreen();
            }
        });

        // Initial Route
        if (Auth.isLoggedIn()) {
            this.navigateTo('dashboard');
        } else {
            this.navigateTo('login');
        }
        
        this.setupNavigationListeners();
    },

    setupNavigationListeners() {
        document.body.addEventListener('click', (e) => {
            // Tab navigation
            const navItem = e.target.closest('.nav__item');
            if (navItem) {
                e.preventDefault();
                const targetScreen = navItem.dataset.screen;
                if (targetScreen) {
                    this.navigateTo(targetScreen);
                }
            }

            // Quick actions
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                if (action === 'logout') {
                    Auth.logout();
                    this.navigateTo('login');
                } else if (action === 'navigate') {
                    const screen = actionBtn.dataset.target;
                    this.navigateTo(screen);
                }
            }
            
            // Aircraft selection
            const aircraftCard = e.target.closest('.card--aircraft');
            if (aircraftCard && this.currentScreen === 'aircraft-list') {
                const id = aircraftCard.dataset.id;
                this.navigateTo('calendar', { aircraftId: id });
            }
        });
    },

    navigateTo(screen, params = null) {
        if (!Auth.isLoggedIn() && screen !== 'login') {
            screen = 'login';
        }

        const prevScreen = this.currentScreen;
        this.currentScreen = screen;
        this.currentParams = params;

        // Render Shell Parts
        this.renderHeader();
        this.renderNav();

        const contentContainer = document.getElementById('app-content-container');
        
        // Handle transitions
        const oldContent = contentContainer.querySelector('.screen--active');
        const newContent = document.createElement('div');
        newContent.className = 'screen screen--entering';
        newContent.id = `screen-${screen}`;

        // Get Screen HTML
        let screenHtml = '';
        switch (screen) {
            case 'login':
                screenHtml = Auth.renderLoginScreen();
                break;
            case 'dashboard':
                screenHtml = this.renderDashboard();
                break;
            case 'aircraft-list':
                screenHtml = this.renderAircraftList();
                break;
            case 'create-booking':
                const aircraftId = params ? params.aircraftId : null;
                screenHtml = typeof Booking.renderBookingForm === 'function' ? Booking.renderBookingForm(aircraftId) : '<p>Formulár nie je k dispozícii.</p>';
                break;
            case 'calendar':
                if (params && params.aircraftId) {
                    if (typeof Calendar !== 'undefined' && typeof Calendar.renderCalendarScreen === 'function') {
                        screenHtml = Calendar.renderCalendarScreen(params.aircraftId);
                    } else {
                        screenHtml = '<p>Kalendár sa pripravuje...</p>';
                    }
                } else {
                    this.navigateTo('aircraft-list');
                    return;
                }
                break;
            case 'my-reservations':
                screenHtml = `
                    <div class="screen-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0;">Moje rezervácie</h2>
                        <button class="btn btn-primary" data-action="navigate" data-target="create-booking" style="padding: 6px 12px; font-size: 0.875rem;">Nová rezervácia</button>
                    </div>
                    <div class="screen-body">
                        ${typeof Booking.renderReservationsList === 'function' ? Booking.renderReservationsList('mine') : ''}
                    </div>
                `;
                break;
            case 'admin':
                if (Auth.isAdmin()) {
                    if (typeof Admin !== 'undefined' && typeof Admin.renderAdminScreen === 'function') {
                        screenHtml = Admin.renderAdminScreen();
                    } else {
                        screenHtml = '<p>Admin modul sa pripravuje...</p>';
                    }
                } else {
                    screenHtml = '<p>Prístup odopretý.</p>';
                }
                break;
            default:
                screenHtml = '<h2>Obrazovka nenájdená</h2>';
        }

        newContent.innerHTML = screenHtml;
        contentContainer.appendChild(newContent);

        // Animation classes swapping
        requestAnimationFrame(() => {
            if (oldContent) {
                oldContent.classList.replace('screen--active', 'screen--leaving');
                setTimeout(() => {
                    if (oldContent.parentNode) {
                        oldContent.parentNode.removeChild(oldContent);
                    }
                }, 300); // Matches CSS transition duration
            }
            newContent.classList.replace('screen--entering', 'screen--active');
            
            // Post-render init
            if (screen === 'calendar' && typeof Calendar !== 'undefined' && typeof Calendar.setAircraftId === 'function') {
                 Calendar.setAircraftId(params.aircraftId);
                 if (params.date && typeof Calendar.setSelectedDate === 'function') {
                     Calendar.setSelectedDate(params.date);
                 }
            }
        });
        
        this.updateBadges();
    },

    refreshCurrentScreen() {
        if (this.currentScreen) {
            // Simple refresh for now (re-renders without animation)
            const contentContainer = document.getElementById('app-content-container');
            const activeScreen = contentContainer.querySelector('.screen--active');
            if (activeScreen) {
                // Re-navigate to trigger render logic again but immediately swap html
                const tempDiv = document.createElement('div');
                this.navigateTo(this.currentScreen, this.currentParams);
            }
        }
    },

    renderHeader() {
        const headerContainer = document.getElementById('app-header-container');
        if (this.currentScreen === 'login') {
            headerContainer.innerHTML = '';
            return;
        }

        const user = Auth.getCurrentUser();
        headerContainer.innerHTML = `
            <header class="header">
                <div class="header__content">
                    <span class="header__title">SD Planes</span>
                </div>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span class="header__subtitle">${user ? user.name : ''}</span>
                    <button class="header__action" data-action="logout" title="Odhlásiť sa">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </button>
                </div>
            </header>
        `;
    },

    renderNav() {
        const navContainer = document.getElementById('app-nav-container');
        if (this.currentScreen === 'login') {
            navContainer.innerHTML = '';
            return;
        }

        const isAdmin = Auth.isAdmin();
        
        const tabs = [
            { id: 'dashboard', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>', label: 'Dashboard' },
            { id: 'aircraft-list', icon: '<path d="M22 13.29V12a1 1 0 0 0-1-1h-6.2l-3.6-7h-1.6l1.8 7H5.2l-1.9-2.5H2l1 3.5-1 3.5h1.3l1.9-2.5h6.2l-1.8 7h1.6l3.6-7H21a1 1 0 0 0 1-1.29z"></path>', label: 'Lietadlá' },
            { id: 'calendar', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', label: 'Kalendár' },
            { id: 'my-reservations', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>', label: 'Rezervácie' }
        ];

        if (isAdmin) {
            tabs.push({
                id: 'admin',
                icon: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
                label: 'Admin',
                hasBadge: true
            });
        }

        const navHtml = tabs.map(tab => `
            <a href="#" class="nav__item ${this.currentScreen === tab.id ? 'nav__item--active' : ''}" data-screen="${tab.id}">
                <svg class="nav__icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">${tab.icon}</svg>
                <span class="nav__label">${tab.label}</span>
                ${tab.hasBadge ? `<span class="badge badge--danger" id="nav-badge-${tab.id}" style="display:none; position:absolute; top:2px; right:10px;"></span>` : ''}
            </a>
        `).join('');

        navContainer.innerHTML = `<nav class="nav">${navHtml}</nav>`;
    },

    updateBadges() {
        if (!Auth.isAdmin()) return;
        
        let pendingTotal = 0;
        if (typeof Admin !== 'undefined' && typeof Admin.getPendingCounts === 'function') {
            const counts = Admin.getPendingCounts();
            pendingTotal = (counts.reservations || 0) + (counts.users || 0);
        } else {
            // Fallback to DataStore
            const pendingRes = DataStore.getPendingReservations ? DataStore.getPendingReservations().length : 0;
            const pendingUsers = DataStore.getPendingUsers ? DataStore.getPendingUsers().length : 0;
            pendingTotal = pendingRes + pendingUsers;
        }

        const badge = document.getElementById('nav-badge-admin');
        if (badge) {
            if (pendingTotal > 0) {
                badge.textContent = pendingTotal;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    renderDashboard() {
        const user = Auth.getCurrentUser();
        const isAdmin = Auth.isAdmin();
        
        let pendingStats = '';
        if (isAdmin) {
            let pRes = 0;
            if (DataStore.getPendingReservations) pRes = DataStore.getPendingReservations().length;
            pendingStats = `
                <div class="stat-card" data-action="navigate" data-target="admin">
                    <div class="stat-value text-warning">${pRes}</div>
                    <div class="stat-label">Čakajúce schválenia</div>
                </div>
            `;
        }

        let myReservationsCount = 0;
        let nextReservation = null;
        
        if (DataStore.getReservationsByPilot) {
            const myRes = DataStore.getReservationsByPilot(user.id);
            const now = new Date().getTime();
            const upcoming = myRes.filter(r => new Date(r.dateFrom).getTime() > now && r.status !== 'rejected');
            
            upcoming.sort((a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime());
            
            myReservationsCount = upcoming.length;
            if (upcoming.length > 0) {
                nextReservation = upcoming[0];
            }
        }
        
        const fleetCount = DataStore.getFleet ? DataStore.getFleet().length : 0;

        let nextResHtml = '<p class="text-muted">Žiadne nadchádzajúce rezervácie.</p>';
        if (nextReservation) {
            const start = new Date(nextReservation.dateFrom);
            const ac = DataStore.getFleet ? DataStore.getFleet().find(a => a.id === nextReservation.aircraftId) : null;
            const acName = ac ? `${ac.type} ${ac.registration}` : 'Neznáme lietadlo';
            
            nextResHtml = `
                <div class="next-reservation-card">
                    <h4>${acName}</h4>
                    <p>${start.toLocaleDateString('sk-SK')} o ${start.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'})}</p>
                    <span class="badge badge-${nextReservation.status}">${nextReservation.status === 'approved' ? 'Schválená' : 'Čakajúca'}</span>
                </div>
            `;
        }

        // VFR Window for today
        let vfrHtml = '';
        if (typeof VFR !== 'undefined' && typeof VFR.getVfrWindow === 'function') {
            const today = new Date();
            const w = VFR.getVfrWindow(today);
            if (w && w.sunrise && w.sunset) {
                const sRise = w.sunrise.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'});
                const sSet = w.sunset.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'});
                vfrHtml = `
                    <div class="vfr-card">
                        <div class="vfr-info">
                            <span class="vfr-label">Východ slnka</span>
                            <span class="vfr-time">${sRise}</span>
                        </div>
                        <div class="vfr-info">
                            <span class="vfr-label">Západ slnka</span>
                            <span class="vfr-time">${sSet}</span>
                        </div>
                    </div>
                `;
            }
        }

        return `
            <div class="dashboard">
                <div class="dashboard-welcome">
                    <h2>Vitaj, ${user ? user.name : 'Pilot'}</h2>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card" data-action="navigate" data-target="aircraft-list">
                        <div class="stat-value">${fleetCount}</div>
                        <div class="stat-label">Lietadlá v hangári</div>
                    </div>
                    <div class="stat-card" data-action="navigate" data-target="my-reservations">
                        <div class="stat-value">${myReservationsCount}</div>
                        <div class="stat-label">Moje rezervácie</div>
                    </div>
                    ${pendingStats}
                </div>

                <div class="dashboard-section">
                    <h3>Najbližší let</h3>
                    ${nextResHtml}
                </div>

                <div class="dashboard-section">
                    <h3>VFR Informácie (Dnes)</h3>
                    ${vfrHtml}
                </div>
                
                <div class="dashboard-actions">
                    <button class="btn btn-primary btn-block" data-action="navigate" data-target="create-booking">Nová rezervácia</button>
                </div>
            </div>
        `;
    },

    renderAircraftList() {
        const fleet = DataStore.getFleet ? DataStore.getFleet() : [];
        
        const sd1 = fleet.filter(a => a.type === 'SD-1');
        const sd2 = fleet.filter(a => a.type === 'SD-2');
        
        const renderGroup = (title, aircraftList) => {
            if (aircraftList.length === 0) return '';
            return `
                <div class="aircraft-group">
                    <h3>${title}</h3>
                    <div class="aircraft-grid">
                        ${aircraftList.map(a => `
                            <div class="card card--aircraft" data-id="${a.id}">
                                <div class="aircraft__info">
                                    <div class="aircraft__header">
                                        <span class="aircraft__reg">${a.registration}</span>
                                        <span class="badge badge--${a.status === 'active' ? 'success' : 'warning'}">
                                            ${a.status === 'active' ? 'Aktívne' : 'Mimo prevádzky'}
                                        </span>
                                    </div>
                                    <h4 class="aircraft__type">${a.type} - ${a.name}</h4>
                                    <div class="aircraft__stats">
                                        <div class="aircraft__stat">💺 ${a.seats} ${a.seats === 1 ? 'miesto' : 'miesta'}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        return `
            <div class="screen-header">
                <h2>Lietadlá</h2>
                <p>Vyberte lietadlo pre rezerváciu</p>
            </div>
            <div class="screen-body">
                ${renderGroup('SD-1 Minisport', sd1)}
                ${renderGroup('SD-2 SportMaster', sd2)}
            </div>
        `;
    },

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    },

    showModal(options) {
        const container = document.getElementById('modal-container');
        if (!container) return;
        
        const { title, content, actions } = options;
        
        const actionHtml = (actions || []).map(a => `
            <button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" id="modal-btn-${a.id}">${a.label}</button>
        `).join('');
        
        container.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" aria-label="Zatvoriť">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actionHtml ? `<div class="modal-footer">${actionHtml}</div>` : ''}
            </div>
        `;
        
        const closeBtn = container.querySelector('.modal-close');
        const backdrop = container.querySelector('.modal-backdrop');
        
        const closeModal = () => { container.innerHTML = ''; };
        
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
        
        (actions || []).forEach(a => {
            const btn = document.getElementById(`modal-btn-${a.id}`);
            if (btn && a.handler) {
                btn.addEventListener('click', () => {
                    a.handler();
                    closeModal();
                });
            }
        });
    }
};

export default App;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
