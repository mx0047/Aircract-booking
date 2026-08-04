import DataStore from './data.js';

const Admin = {
    currentTab: 'approvals', // approvals, users, fleet

    getPendingCounts() {
        const reservations = DataStore.getReservations().filter(r => r.status === 'pending').length;
        const users = DataStore.getUsers().filter(u => u.status === 'pending').length;
        return { reservations, users };
    },
    
    renderAdminScreen() {
        const counts = this.getPendingCounts();
        const totalPending = counts.reservations + counts.users;
        const totalPendingBadge = totalPending > 0 ? `<span class="badge badge--danger">${totalPending}</span>` : '';

        return `
            <div class="admin">
                <div class="admin__tabs">
                    <button class="admin__tab ${this.currentTab === 'approvals' ? 'admin__tab--active' : ''}" data-tab="approvals">
                        Schvaľovanie ${totalPendingBadge}
                    </button>
                    <button class="admin__tab ${this.currentTab === 'users' ? 'admin__tab--active' : ''}" data-tab="users">
                        Používatelia
                    </button>
                    <button class="admin__tab ${this.currentTab === 'fleet' ? 'admin__tab--active' : ''}" data-tab="fleet">
                        Flotila
                    </button>
                </div>
                <div class="admin__content">
                    ${this.currentTab === 'approvals' ? this.renderApprovalsSection() : ''}
                    ${this.currentTab === 'users' ? this.renderUserManagement() : ''}
                    ${this.currentTab === 'fleet' ? this.renderFleetManagement() : ''}
                </div>
            </div>
        `;
    },

    renderApprovalsSection() {
        return `
            <div class="admin__section">
                <h3 class="admin__section-title">
                    Čakajúce rezervácie 
                    ${this.getPendingCounts().reservations > 0 ? `<span class="badge badge--danger">${this.getPendingCounts().reservations}</span>` : ''}
                </h3>
                ${this.renderPendingReservations()}
            </div>
            <div class="admin__section">
                <h3 class="admin__section-title">
                    Čakajúci používatelia
                    ${this.getPendingCounts().users > 0 ? `<span class="badge badge--danger">${this.getPendingCounts().users}</span>` : ''}
                </h3>
                ${this.renderPendingUsers()}
            </div>
        `;
    },

    formatDateRange(startIso, endIso) {
        const s = new Date(startIso);
        const e = new Date(endIso);
        const pad = n => n.toString().padStart(2, '0');
        const sDate = `${pad(s.getDate())}.${pad(s.getMonth()+1)}.${s.getFullYear()}`;
        const sTime = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
        const eDate = `${pad(e.getDate())}.${pad(e.getMonth()+1)}.${e.getFullYear()}`;
        const eTime = `${pad(e.getHours())}:${pad(e.getMinutes())}`;

        if (sDate === eDate) {
            return `${sDate} ${sTime} - ${eTime}`;
        }
        return `${sDate} ${sTime} - ${eDate} ${eTime}`;
    },

    renderPendingReservations() {
        const pending = DataStore.getReservations().filter(r => r.status === 'pending');
        if (pending.length === 0) {
            return `
            <div class="admin__empty-state">
                <span class="icon">✈️</span>
                <p>Žiadne čakajúce žiadosti</p>
            </div>`;
        }

        return `
            <div class="admin__pending-list">
                ${pending.map(r => {
                    const aircraft = DataStore.getFleet().find(a => a.id === r.aircraftId);
                    
                    return `
                    <div class="admin__pending-card card" data-id="${r.id}">
                        <div class="card__header">
                            <h4 class="card__title">${r.pilotName || 'Neznámy pilot'}</h4>
                            <span class="card__subtitle">${aircraft ? aircraft.type + ' ' + aircraft.registration : 'Neznáme lietadlo'}</span>
                        </div>
                        <div class="card__body">
                            <p class="admin__detail"><strong>Čas:</strong> ${this.formatDateRange(r.dateFrom, r.dateTo)}</p>
                            <p class="admin__detail"><strong>Účel:</strong> ${r.purpose || '-'}</p>
                            ${r.note ? `<p class="admin__detail"><strong>Poznámka:</strong> ${r.note}</p>` : ''}
                        </div>
                        <div class="admin__reject-form admin__reject-form--hidden" id="reject-form-${r.id}" style="display: none; margin-top: 10px;">
                            <textarea class="input" placeholder="Údajte dôvod zamietnutia" id="reject-reason-${r.id}"></textarea>
                            <div class="admin__actions" style="margin-top: 8px;">
                                <button class="btn btn--danger admin__btn-confirm-reject" data-id="${r.id}">Potvrdiť zamietnutie</button>
                                <button class="btn btn--outline admin__btn-cancel-reject" data-id="${r.id}">Zrušiť</button>
                            </div>
                        </div>
                        <div class="admin__actions" id="actions-${r.id}">
                            <button class="btn btn--success admin__btn-approve-res" data-id="${r.id}">Schváliť</button>
                            <button class="btn btn--danger admin__btn-reject-res" data-id="${r.id}">Zamietnuť</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    },

    renderPendingUsers() {
        const pending = DataStore.getUsers().filter(u => u.status === 'pending');
        if (pending.length === 0) {
            return `
            <div class="admin__empty-state">
                <span class="icon">👤</span>
                <p>Žiadni noví používatelia</p>
            </div>`;
        }

        return `
            <div class="admin__pending-list">
                ${pending.map(u => {
                    const regDate = u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('sk-SK') : '-';
                    return `
                    <div class="admin__pending-card card" data-id="${u.id}">
                        <div class="card__header">
                            <h4 class="card__title">${u.name}</h4>
                            <span class="card__subtitle">Registrovaný: ${regDate}</span>
                        </div>
                        <div class="admin__actions">
                            <button class="btn btn--success admin__btn-approve-user" data-id="${u.id}">Schváliť</button>
                            <button class="btn btn--danger admin__btn-reject-user" data-id="${u.id}">Zamietnuť</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    },

    renderUserManagement() {
        const users = DataStore.getUsers().filter(u => u.status !== 'pending');
        const currentUser = DataStore.getCurrentUser();
        
        return `
            <div class="admin__section">
                <h3 class="admin__section-title">Zoznam používateľov</h3>
                <div class="admin__user-list">
                    ${users.map(u => `
                        <div class="admin__user-card card">
                            <div class="card__header">
                                <h4 class="card__title">${u.name}</h4>
                                <span class="badge ${u.status === 'active' ? 'badge--success' : 'badge--neutral'}">
                                    ${u.status === 'active' ? 'Aktívny' : 'Neaktívny'}
                                </span>
                            </div>
                            <div class="card__body">
                                <p><strong>Rola:</strong> ${u.role === 'owner' ? 'Majiteľ' : u.role === 'deputy' ? 'Zástupca' : 'Pilot'}</p>
                            </div>
                            <div class="admin__actions">
                                ${u.id !== currentUser.id ? `
                                    <button class="btn btn--outline admin__btn-toggle-user" data-id="${u.id}" data-status="${u.status}">
                                        ${u.status === 'active' ? 'Deaktivovať' : 'Aktivovať'}
                                    </button>
                                ` : '<span class="admin__note">Váš účet</span>'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderFleetManagement() {
        const fleet = DataStore.getFleet();
        
        return `
            <div class="admin__section">
                <h3 class="admin__section-title">Lietadlá vo flotile</h3>
                <div class="admin__fleet-list">
                    ${fleet.map(a => `
                        <div class="admin__fleet-card card">
                            <div class="card__header">
                                <h4 class="card__title">${a.type} ${a.registration}</h4>
                                <span class="badge ${a.status === 'active' ? 'badge--success' : 'badge--neutral'}">
                                    ${a.status === 'active' ? 'Aktívne' : 'Neaktívne'}
                                </span>
                            </div>
                            <div class="card__body">
                                <p><strong>Počet sedadiel:</strong> ${a.seats}</p>
                            </div>
                            <div class="admin__actions">
                                <button class="btn btn--danger admin__btn-remove-aircraft" data-id="${a.id}">Odstrániť</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="admin__section">
                <h3 class="admin__section-title">Pridať lietadlo</h3>
                <form class="admin__add-form card" id="add-aircraft-form">
                    <div class="form-group">
                        <label class="label">Typ lietadla</label>
                        <select class="input" id="aircraft-type" required>
                            <option value="SD-1">SD-1 (Minisport)</option>
                            <option value="SD-2">SD-2 (Sportmaster)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="label">Registrácia</label>
                        <input type="text" class="input" id="aircraft-reg" placeholder="Napr. OK-XXX" required>
                    </div>
                    <div class="form-group">
                        <label class="label">Počet sedadiel</label>
                        <input type="number" class="input" id="aircraft-seats" value="1" readonly>
                    </div>
                    <button type="submit" class="btn btn--primary btn--full">Pridať lietadlo</button>
                </form>
            </div>
        `;
    },

    approveReservation(id) {
        DataStore.updateReservation(id, { status: 'approved' });
        window.dispatchEvent(new CustomEvent('reservation-approved'));
    },

    rejectReservation(id, reason) {
        DataStore.updateReservation(id, { status: 'rejected', rejectReason: reason });
        window.dispatchEvent(new CustomEvent('reservation-rejected'));
    },

    approveUser(id) {
        DataStore.updateUser(id, { status: 'active', approved: true });
        window.dispatchEvent(new CustomEvent('user-updated'));
    },

    revokeUser(id) {
        DataStore.updateUser(id, { status: 'inactive', approved: false });
        window.dispatchEvent(new CustomEvent('user-updated'));
    },
    
    rejectUser(id) {
        DataStore.updateUser(id, { status: 'rejected' });
        window.dispatchEvent(new CustomEvent('user-updated'));
    },

    addAircraft(data) {
        DataStore.addAircraft(data);
        window.dispatchEvent(new CustomEvent('fleet-updated'));
    },

    removeAircraft(id) {
        DataStore.removeAircraft(id);
        window.dispatchEvent(new CustomEvent('fleet-updated'));
    },

    init() {
        const container = document.body;
        this.container = container;
        
        container.addEventListener('click', (e) => {
            // Tabs navigation
            if (e.target.closest('.admin__tab')) {
                this.currentTab = e.target.closest('.admin__tab').dataset.tab;
                window.dispatchEvent(new CustomEvent('admin-tab-changed'));
            }
            
            // Approve reservation
            if (e.target.closest('.admin__btn-approve-res')) {
                const id = e.target.closest('.admin__btn-approve-res').dataset.id;
                this.approveReservation(id);
            }
            
            // Show reject reason form
            if (e.target.closest('.admin__btn-reject-res')) {
                const id = e.target.closest('.admin__btn-reject-res').dataset.id;
                document.getElementById(`reject-form-${id}`).style.display = 'block';
                document.getElementById(`actions-${id}`).style.display = 'none';
            }
            
            // Cancel reject
            if (e.target.closest('.admin__btn-cancel-reject')) {
                const id = e.target.closest('.admin__btn-cancel-reject').dataset.id;
                document.getElementById(`reject-form-${id}`).style.display = 'none';
                document.getElementById(`actions-${id}`).style.display = 'flex';
                document.getElementById(`reject-reason-${id}`).value = '';
            }
            
            // Confirm reject
            if (e.target.closest('.admin__btn-confirm-reject')) {
                const id = e.target.closest('.admin__btn-confirm-reject').dataset.id;
                const reason = document.getElementById(`reject-reason-${id}`).value;
                if (reason.trim() === '') {
                    alert('Prosím, zadajte dôvod zamietnutia.');
                    return;
                }
                this.rejectReservation(id, reason);
            }
            
            // Approve user
            if (e.target.closest('.admin__btn-approve-user')) {
                const id = e.target.closest('.admin__btn-approve-user').dataset.id;
                this.approveUser(id);
            }
            
            // Reject user
            if (e.target.closest('.admin__btn-reject-user')) {
                const id = e.target.closest('.admin__btn-reject-user').dataset.id;
                if (confirm('Naozaj chcete zamietnuť tohto používateľa?')) {
                    this.rejectUser(id);
                }
            }
            
            // Toggle user status
            if (e.target.closest('.admin__btn-toggle-user')) {
                const btn = e.target.closest('.admin__btn-toggle-user');
                const id = btn.dataset.id;
                const status = btn.dataset.status;
                
                if (status === 'active') {
                    if (confirm('Naozaj chcete deaktivovať tohto používateľa?')) {
                        this.revokeUser(id);
                    }
                } else {
                    this.approveUser(id);
                }
            }
            
            // Remove aircraft
            if (e.target.closest('.admin__btn-remove-aircraft')) {
                const id = e.target.closest('.admin__btn-remove-aircraft').dataset.id;
                if (confirm('Naozaj chcete odstrániť toto lietadlo?')) {
                    this.removeAircraft(id);
                }
            }
        });
        
        // Aircraft add form
        container.addEventListener('submit', (e) => {
            if (e.target.id === 'add-aircraft-form') {
                e.preventDefault();
                const type = document.getElementById('aircraft-type').value;
                const registration = document.getElementById('aircraft-reg').value;
                const seats = parseInt(document.getElementById('aircraft-seats').value);
                
                this.addAircraft({
                    type,
                    registration,
                    seats,
                    status: 'active'
                });
                
                e.target.reset();
            }
        });
        
        // Aircraft type change logic for auto-seats
        container.addEventListener('change', (e) => {
            if (e.target.id === 'aircraft-type') {
                const seatsInput = document.getElementById('aircraft-seats');
                if (e.target.value === 'SD-1') {
                    seatsInput.value = '1';
                } else if (e.target.value === 'SD-2') {
                    seatsInput.value = '2';
                }
            }
        });
    }
};

export default Admin;
