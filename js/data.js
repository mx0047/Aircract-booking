const PREFIX = 'aircraft-booking-';

const defaultUsers = [
    { id: 'u1', name: 'Igor Spacek', role: 'owner', pin: '0000', approved: true, status: 'active' },
    { id: 'u2', name: 'Martin Smejkal', role: 'deputy', pin: '9999', approved: true, status: 'active' },
    { id: 'u3', name: 'Martin Otahal', role: 'pilot', pin: '1234', approved: true, status: 'active' },
    { id: 'u5', name: 'Miro Skuba', role: 'pilot', pin: '3195', approved: true, status: 'active' },
    { id: 'u6', name: 'Ivo Otahal', role: 'pilot', pin: '0000', approved: true, status: 'active' },
    { id: 'u7', name: 'Miro Stasak', role: 'pilot', pin: '0000', approved: true, status: 'active' },
    { id: 'u8', name: 'Erik Cermak', role: 'pilot', pin: '0000', approved: true, status: 'active' }
];

const defaultFleet = [
    { id: 'a1', type: 'SD-1', name: 'Minisport', registration: 'OK-VUR', seats: 1, status: 'active' },
    { id: 'a2', type: 'SD-2', name: 'SportMaster', registration: 'OK-BUR37', seats: 2, status: 'active' },
    { id: 'a3', type: 'SD-2', name: 'SportMaster', registration: 'OK-UUR02', seats: 2, status: 'active' }
];

class DataStoreImpl {
    constructor() {
        this.users = [];
        this.fleet = [];
        this.reservations = [];
        this.init();
    }
    
    get(key, def) {
        try {
            const val = localStorage.getItem(PREFIX + key);
            if (!val) return def;
            const parsed = JSON.parse(val);
            if (Array.isArray(def) && !Array.isArray(parsed)) {
                return def;
            }
            return parsed;
        } catch (e) {
            console.error('Error parsing local storage data for', key, e);
            return def;
        }
    }
    
    set(key, val) {
        localStorage.setItem(PREFIX + key, JSON.stringify(val));
    }
    
    isBackendEnabled() {
        if (window.location.hostname.includes('github.io')) return false;
        if (window.location.protocol === 'file:') return false;
        return true;
    }
    
    init() {
        // Load initially from localStorage as a fast sync cache
        this.users = this.get('users', defaultUsers);
        this.fleet = this.get('fleet', defaultFleet);
        this.reservations = this.get('reservations', []);

        // Run migrations on local cache if needed
        let updated = false;

        // Migration: filter out Peter Horváth
        const countBefore = this.users.length;
        this.users = this.users.filter(u => u.id !== 'u4' && u.name !== 'Peter Horváth');
        if (this.users.length !== countBefore) {
            updated = true;
        }

        // Migration: ensure Miro Skuba exists
        const hasMiro = this.users.some(u => u.name === 'Miro Skuba');
        if (!hasMiro) {
            this.users.push({ id: 'u5', name: 'Miro Skuba', role: 'pilot', pin: '3195', approved: true, status: 'active' });
            updated = true;
        }

        // Migration: ensure Ivo Otahal exists
        const hasIvo = this.users.some(u => u.name === 'Ivo Otahal' || u.name === 'Ivo Otáhal');
        if (!hasIvo) {
            this.users.push({ id: 'u6', name: 'Ivo Otahal', role: 'pilot', pin: '0000', approved: true, status: 'active' });
            updated = true;
        }
 
        // Migration: ensure Miro Stasak exists
        const hasMiroStasak = this.users.some(u => u.name === 'Miro Stasak' || u.name === 'Miro Stašák');
        if (!hasMiroStasak) {
            this.users.push({ id: 'u7', name: 'Miro Stasak', role: 'pilot', pin: '0000', approved: true, status: 'active' });
            updated = true;
        }
 
        // Migration: ensure Erik Cermak exists
        const hasErik = this.users.some(u => u.name === 'Erik Cermak' || u.name === 'Erik Čermák');
        if (!hasErik) {
            this.users.push({ id: 'u8', name: 'Erik Cermak', role: 'pilot', pin: '0000', approved: true, status: 'active' });
            updated = true;
        }
 
        const renameMap = {
            'Igor Špaček': 'Igor Spacek',
            'Martin Otáhal': 'Martin Otahal',
            'Ivo Otáhal': 'Ivo Otahal',
            'Miro Stašák': 'Miro Stasak',
            'Erik Čermák': 'Erik Cermak'
        };

        this.users.forEach(u => {
            if (renameMap[u.name]) {
                u.name = renameMap[u.name];
                updated = true;
            }
            if (!u.status) {
                u.status = u.approved ? 'active' : 'pending';
                updated = true;
            }
            if (u.id === 'u2' && u.name === 'Mária Kováčová') { u.name = 'Martin Smejkal'; updated = true; }
            if (u.id === 'u3' && u.name === 'Ján Novák') { u.name = 'Martin Otahal'; updated = true; }
        });

        // Migrate reservations
        this.reservations.forEach(r => {
            if (renameMap[r.pilotName]) {
                r.pilotName = renameMap[r.pilotName];
                updated = true;
            }
        });

        if (updated) {
            this.set('users', this.users);
            this.set('reservations', this.reservations);
        }
    }

    async load() {
        if (!this.isBackendEnabled()) {
            // Force reload from local storage just in case it changed in another tab
            this.users = this.get('users', defaultUsers);
            this.fleet = this.get('fleet', defaultFleet);
            this.reservations = this.get('reservations', []);
            return true;
        }
        try {
            const response = await fetch('/api/data');
            if (response.ok) {
                const data = await response.json();
                this.users = data.users || [];
                this.fleet = data.fleet || [];
                this.reservations = data.reservations || [];
                
                // Migration: filter out Peter Horváth
                const countBefore = this.users.length;
                this.users = this.users.filter(u => u.id !== 'u4' && u.name !== 'Peter Horváth');
                let wasMigrated = this.users.length !== countBefore;

                // Migration: ensure Miro Skuba exists
                const hasMiro = this.users.some(u => u.name === 'Miro Skuba');
                if (!hasMiro) {
                    this.users.push({ id: 'u5', name: 'Miro Skuba', role: 'pilot', pin: '3195', approved: true, status: 'active' });
                    wasMigrated = true;
                }

                // Migration: ensure Ivo Otahal exists
                const hasIvo = this.users.some(u => u.name === 'Ivo Otahal' || u.name === 'Ivo Otáhal');
                if (!hasIvo) {
                    this.users.push({ id: 'u6', name: 'Ivo Otahal', role: 'pilot', pin: '0000', approved: true, status: 'active' });
                    wasMigrated = true;
                }
 
                // Migration: ensure Miro Stasak exists
                const hasMiroStasak = this.users.some(u => u.name === 'Miro Stasak' || u.name === 'Miro Stašák');
                if (!hasMiroStasak) {
                    this.users.push({ id: 'u7', name: 'Miro Stasak', role: 'pilot', pin: '0000', approved: true, status: 'active' });
                    wasMigrated = true;
                }
 
                // Migration: ensure Erik Cermak exists
                const hasErik = this.users.some(u => u.name === 'Erik Cermak' || u.name === 'Erik Čermák');
                if (!hasErik) {
                    this.users.push({ id: 'u8', name: 'Erik Cermak', role: 'pilot', pin: '0000', approved: true, status: 'active' });
                    wasMigrated = true;
                }

                // Rename mapping migration
                const renameMap = {
                    'Igor Špaček': 'Igor Spacek',
                    'Martin Otáhal': 'Martin Otahal',
                    'Ivo Otáhal': 'Ivo Otahal',
                    'Miro Stašák': 'Miro Stasak',
                    'Erik Čermák': 'Erik Cermak'
                };
                
                this.users.forEach(u => {
                    if (renameMap[u.name]) {
                        u.name = renameMap[u.name];
                        wasMigrated = true;
                    }
                });

                this.reservations.forEach(r => {
                    if (renameMap[r.pilotName]) {
                        r.pilotName = renameMap[r.pilotName];
                        wasMigrated = true;
                    }
                });
 
                // Cache back to localStorage
                this.set('users', this.users);
                this.set('fleet', this.fleet);
                this.set('reservations', this.reservations);
 
                if (wasMigrated) {
                    this.saveToServer('users', this.users);
                    this.saveToServer('reservations', this.reservations);
                }
                return true;
            }
        } catch (e) {
            console.error('Failed to load data from API server, using localStorage cache:', e);
        }
        return false;
    }

    async saveToServer(type, data) {
        if (!this.isBackendEnabled()) return;
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, data })
            });
            if (!response.ok) {
                console.error(`Failed to save ${type} to server:`, response.statusText);
            }
        } catch (e) {
            console.error(`Network error saving ${type} to server:`, e);
        }
    }

    // --- Fleet ---
    getFleet() { return this.fleet; }
    
    addAircraft(aircraft) {
        this.fleet.push(aircraft);
        this.set('fleet', this.fleet);
        this.saveToServer('fleet', this.fleet);
    }
    
    removeAircraft(id) {
        this.fleet = this.fleet.filter(a => a.id !== id);
        this.set('fleet', this.fleet);
        this.saveToServer('fleet', this.fleet);
    }

    updateAircraft(id, data) {
        this.fleet = this.fleet.map(a => a.id === id ? { ...a, ...data } : a);
        this.set('fleet', this.fleet);
        this.saveToServer('fleet', this.fleet);
    }

    // --- Users ---
    getUsers() { return this.users; }
    
    addUser(user) {
        this.users.push(user);
        this.set('users', this.users);
        this.saveToServer('users', this.users);
    }
    
    updateUser(id, data) {
        this.users = this.users.map(u => u.id === id ? { ...u, ...data } : u);
        this.set('users', this.users);
        this.saveToServer('users', this.users);
    }

    removeUser(id) {
        this.users = this.users.filter(u => u.id !== id);
        this.set('users', this.users);
        this.saveToServer('users', this.users);
    }
    
    getUserByNameAndPin(name, pin) {
        return this.users.find(u => u.name === name && u.pin === pin) || null;
    }
    
    getPendingUsers() {
        return this.users.filter(u => !u.approved && u.status === 'pending');
    }

    // --- Reservations ---
    getReservations() { return this.reservations; }
    
    addReservation(res) {
        this.reservations.push(res);
        this.set('reservations', this.reservations);
        this.saveToServer('reservations', this.reservations);
    }
    
    updateReservation(id, data) {
        this.reservations = this.reservations.map(res => res.id === id ? { ...res, ...data } : res);
        this.set('reservations', this.reservations);
        this.saveToServer('reservations', this.reservations);
    }
    
    getReservationsByAircraft(aircraftId) {
        return this.reservations.filter(r => r.aircraftId === aircraftId);
    }
    
    getReservationsByPilot(pilotId) {
        return this.reservations.filter(r => r.pilotId === pilotId);
    }
    
    getPendingReservations() {
        return this.reservations.filter(r => r.status === 'pending');
    }
    
    getReservationsForDateRange(aircraftId, start, end) {
        const sTime = new Date(start).getTime();
        const eTime = new Date(end).getTime();
        
        return this.reservations.filter(r => {
            if (r.aircraftId !== aircraftId) return false;
            
            const rStart = new Date(r.dateFrom).getTime();
            const rEnd = new Date(r.dateTo).getTime();
            
            // Check for overlap
            return (rStart < eTime && rEnd > sTime);
        });
    }

    // --- Session ---
    setCurrentUser(user) {
        if (user) {
            sessionStorage.setItem(PREFIX + 'session', JSON.stringify(user));
        } else {
            sessionStorage.removeItem(PREFIX + 'session');
        }
    }
    
    getCurrentUser() {
        const val = sessionStorage.getItem(PREFIX + 'session');
        return val ? JSON.parse(val) : null;
    }
    
    logout() {
        this.setCurrentUser(null);
    }
}

const DataStore = new DataStoreImpl();
export default DataStore;
