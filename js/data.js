const PREFIX = 'aircraft-booking-';

const defaultUsers = [
    { id: 'u1', name: 'Igor Špaček', role: 'owner', pin: '0000', approved: true, status: 'active' },
    { id: 'u2', name: 'Martin Smejkal', role: 'deputy', pin: '9999', approved: true, status: 'active' },
    { id: 'u3', name: 'Martin Otáhal', role: 'pilot', pin: '1234', approved: true, status: 'active' },
    { id: 'u4', name: 'Peter Horváth', role: 'pilot', pin: '5678', approved: false, status: 'pending' }
];

const defaultFleet = [
    { id: 'a1', type: 'SD-1', name: 'Minisport', registration: 'OK-VUR', seats: 1, status: 'active' },
    { id: 'a2', type: 'SD-2', name: 'SportMaster', registration: 'OK-BUR37', seats: 2, status: 'active' },
    { id: 'a3', type: 'SD-2', name: 'SportMaster', registration: 'OK-UUR02', seats: 2, status: 'active' }
];

class DataStoreImpl {
    constructor() {
        this.init();
    }
    
    get(key, def) {
        try {
            const val = localStorage.getItem(PREFIX + key);
            return val ? JSON.parse(val) : def;
        } catch (e) {
            console.error('Error parsing local storage data for', key, e);
            return def;
        }
    }
    
    set(key, val) {
        localStorage.setItem(PREFIX + key, JSON.stringify(val));
    }
    
    init() {
        if (!localStorage.getItem(PREFIX + 'users')) {
            this.set('users', defaultUsers);
        } else {
            const users = this.get('users', []);
            let updated = false;
            users.forEach(u => {
                if (!u.status) {
                    u.status = u.approved ? 'active' : 'pending';
                    updated = true;
                }
                // Name migrations
                if (u.id === 'u2' && u.name === 'Mária Kováčová') { u.name = 'Martin Smejkal'; updated = true; }
                if (u.id === 'u3' && u.name === 'Ján Novák') { u.name = 'Martin Otáhal'; updated = true; }
            });
            if (updated) {
                this.set('users', users);
            }
        }
        if (!localStorage.getItem(PREFIX + 'fleet')) {
            this.set('fleet', defaultFleet);
        }
        if (!localStorage.getItem(PREFIX + 'reservations')) {
            this.set('reservations', []);
        }
    }

    // --- Fleet ---
    getFleet() { return this.get('fleet', []); }
    
    addAircraft(aircraft) {
        const fleet = this.getFleet();
        fleet.push(aircraft);
        this.set('fleet', fleet);
    }
    
    removeAircraft(id) {
        this.set('fleet', this.getFleet().filter(a => a.id !== id));
    }

    // --- Users ---
    getUsers() { return this.get('users', []); }
    
    addUser(user) {
        const users = this.getUsers();
        users.push(user);
        this.set('users', users);
    }
    
    updateUser(id, data) {
        const users = this.getUsers().map(u => u.id === id ? { ...u, ...data } : u);
        this.set('users', users);
    }

    removeUser(id) {
        const users = this.getUsers().filter(u => u.id !== id);
        this.set('users', users);
    }
    
    getUserByNameAndPin(name, pin) {
        return this.getUsers().find(u => u.name === name && u.pin === pin) || null;
    }
    
    getPendingUsers() {
        return this.getUsers().filter(u => !u.approved && u.status === 'pending');
    }

    // --- Reservations ---
    getReservations() { return this.get('reservations', []); }
    
    addReservation(res) {
        const r = this.getReservations();
        r.push(res);
        this.set('reservations', r);
    }
    
    updateReservation(id, data) {
        const r = this.getReservations().map(res => res.id === id ? { ...res, ...data } : res);
        this.set('reservations', r);
    }
    
    getReservationsByAircraft(aircraftId) {
        return this.getReservations().filter(r => r.aircraftId === aircraftId);
    }
    
    getReservationsByPilot(pilotId) {
        return this.getReservations().filter(r => r.pilotId === pilotId);
    }
    
    getPendingReservations() {
        return this.getReservations().filter(r => r.status === 'pending');
    }
    
    getReservationsForDateRange(aircraftId, start, end) {
        const sTime = new Date(start).getTime();
        const eTime = new Date(end).getTime();
        
        return this.getReservations().filter(r => {
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
            // Using sessionStorage to keep login for current tab/window only
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
