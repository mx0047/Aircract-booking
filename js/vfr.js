const LAT = 48.8103;
const LON = 17.1338;
// zenith: 90.8333 standard, 96 civil twilight

// Math helpers
const toRad = deg => deg * Math.PI / 180;
const toDeg = rad => rad * 180 / Math.PI;

// Date helpers
function getDayOfYear(date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const diff = (date.getTime() - start.getTime());
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function calculateSolar(date, zenith, isSunrise) {
    const N = getDayOfYear(date);
    const lngHour = LON / 15;
    const t = isSunrise ? N + ((6 - lngHour) / 24) : N + ((18 - lngHour) / 24);

    const M = 0.9856 * t - 3.289;
    const M_rad = toRad(M);

    let L = M + 1.916 * Math.sin(M_rad) + 0.020 * Math.sin(2 * M_rad) + 282.634;
    L = (L + 360) % 360;
    const L_rad = toRad(L);

    let RA = toDeg(Math.atan(0.91764 * Math.tan(L_rad)));
    RA = (RA + 360) % 360;

    const Lquadrant = Math.floor(L / 90) * 90;
    const RAquadrant = Math.floor(RA / 90) * 90;
    RA = RA + (Lquadrant - RAquadrant);
    RA = RA / 15;

    const sinDec = 0.39782 * Math.sin(L_rad);
    const cosDec = Math.cos(Math.asin(sinDec));

    const lat_rad = toRad(LAT);
    const cosH = (Math.cos(toRad(zenith)) - (sinDec * Math.sin(lat_rad))) / (cosDec * Math.cos(lat_rad));

    if (cosH > 1 || cosH < -1) return null; // No sunrise/sunset

    let H = toDeg(Math.acos(cosH));
    if (isSunrise) {
        H = 360 - H;
    }
    H = H / 15;

    let T = H + RA - (0.06571 * t) - 6.622;
    let UT = T - lngHour;
    UT = (UT + 24) % 24;

    const hours = Math.floor(UT);
    const minutes = Math.floor((UT - hours) * 60);
    const seconds = Math.floor((((UT - hours) * 60) - minutes) * 60);
    
    // Convert UTC time back to a Date object for the same day
    const result = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds));
    return result;
}

const VFR = {
    getVfrWindow(date) {
        const sunrise = calculateSolar(date, 90.8333, true);
        const sunset = calculateSolar(date, 90.8333, false);
        const civilTwilightStart = calculateSolar(date, 96, true);
        const civilTwilightEnd = calculateSolar(date, 96, false);

        let vfrStart = null;
        let vfrEnd = null;

        if (sunrise) {
            vfrStart = new Date(sunrise.getTime() - 30 * 60000);
        }
        if (sunset) {
            vfrEnd = new Date(sunset.getTime() + 30 * 60000);
        }

        return {
            sunrise,
            sunset,
            vfrStart,
            vfrEnd,
            civilTwilightStart,
            civilTwilightEnd,
            date: new Date(date)
        };
    },
    
    isVfrTime(dateTime) {
        const window = this.getVfrWindow(dateTime);
        if (!window.vfrStart || !window.vfrEnd) return false;
        return dateTime >= window.vfrStart && dateTime <= window.vfrEnd;
    },

    isTimeRangeInVfr(startTime, endTime) {
        const wStart = this.getVfrWindow(startTime);
        const wEnd = this.getVfrWindow(endTime);
        if (!wStart.vfrStart || !wStart.vfrEnd || !wEnd.vfrStart || !wEnd.vfrEnd) return false;
        
        const startValid = startTime >= wStart.vfrStart && startTime <= wStart.vfrEnd;
        const endValid = endTime >= wEnd.vfrStart && endTime <= wEnd.vfrEnd;
        
        return startValid && endValid;
    },
    
    getVfrWindowsForDateRange(startDate, endDate) {
        const windows = [];
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        
        while (current <= end) {
            windows.push(this.getVfrWindow(new Date(current)));
            current.setDate(current.getDate() + 1);
        }
        return windows;
    }
};

export default VFR;
