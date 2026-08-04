const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

const defaultUsers = [
    { id: 'u1', name: 'Igor Špaček', role: 'owner', pin: '0000', approved: true, status: 'active' },
    { id: 'u2', name: 'Martin Smejkal', role: 'deputy', pin: '9999', approved: true, status: 'active' },
    { id: 'u3', name: 'Martin Otáhal', role: 'pilot', pin: '1234', approved: true, status: 'active' }
];

const defaultFleet = [
    { id: 'a1', type: 'SD-1', name: 'Minisport', registration: 'OK-VUR', seats: 1, status: 'active' },
    { id: 'a2', type: 'SD-2', name: 'SportMaster', registration: 'OK-BUR37', seats: 2, status: 'active' },
    { id: 'a3', type: 'SD-2', name: 'SportMaster', registration: 'OK-UUR02', seats: 2, status: 'active' }
];

// Helper to determine if Vercel KV environment variables are present
const isKVEnabled = () => {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
};

// Vercel KV REST helper functions
async function getKV(key) {
    const url = `${process.env.KV_REST_API_URL}/get/${key}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to get KV key: ${key}`);
    }
    const data = await response.json();
    return data.result ? JSON.parse(data.result) : null;
}

async function setKV(key, val) {
    const url = `${process.env.KV_REST_API_URL}/set/${key}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        },
        body: JSON.stringify(val)
    });
    if (!response.ok) {
        throw new Error(`Failed to set KV key: ${key}`);
    }
}

// Local JSON File helper paths and functions
const getLocalDbPath = () => {
    return path.join(process.cwd(), 'db.json');
};

function readLocalDb() {
    const filePath = getLocalDbPath();
    if (!fs.existsSync(filePath)) {
        const initialData = {
            users: defaultUsers,
            fleet: defaultFleet,
            reservations: []
        };
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
        return initialData;
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error('Error reading local db', e);
        return { users: defaultUsers, fleet: defaultFleet, reservations: [] };
    }
}

function writeLocalDb(data) {
    const filePath = getLocalDbPath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// REST API routes
app.get('/api/data', async (req, res) => {
    try {
        if (isKVEnabled()) {
            let users = await getKV('users');
            let fleet = await getKV('fleet');
            let reservations = await getKV('reservations');

            // Initialize if missing in Redis
            if (!users) {
                await setKV('users', defaultUsers);
                users = defaultUsers;
            }
            if (!fleet) {
                await setKV('fleet', defaultFleet);
                fleet = defaultFleet;
            }
            if (!reservations) {
                await setKV('reservations', []);
                reservations = [];
            }

            return res.json({ users, fleet, reservations });
        } else {
            const db = readLocalDb();
            return res.json(db);
        }
    } catch (e) {
        console.error('API Error /api/data:', e);
        return res.status(500).json({ error: e.message });
    }
});

app.post('/api/save', async (req, res) => {
    const { type, data } = req.body;
    if (!['users', 'fleet', 'reservations'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type specified' });
    }
    if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array' });
    }

    try {
        if (isKVEnabled()) {
            await setKV(type, data);
            return res.json({ success: true, message: `Saved ${type} to KV` });
        } else {
            const db = readLocalDb();
            db[type] = data;
            writeLocalDb(db);
            return res.json({ success: true, message: `Saved ${type} to local file` });
        }
    } catch (e) {
        console.error('API Error /api/save:', e);
        return res.status(500).json({ error: e.message });
    }
});

// For local testing (when running node api/index.js directly)
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

module.exports = app;
