// ============================================================
// [CYRUS - SERVER-SIDE INPUT VALIDATION FUNCTIONS]
// ============================================================

function isValidBatteryHealth(value) {
    if (value === '' || value === null || value === undefined) {
        return false;
    }

    if (String(value).trim() === '') { // Added this to help deal with whitespaces bug
        return false;
    }

    const batteryHealth = Number(value);

    return Number.isInteger(batteryHealth) && batteryHealth >= 0 && batteryHealth <= 100;
}

function isValidMileage(value) {
    if (value === '' || value === null || value === undefined) {
        return false;
    }

    if (String(value).trim() === '') {  // Added this to help deal with whitespaces bug
        return false;
    }

    const mileage = Number(value);

    return Number.isInteger(mileage) && mileage >= 0;
}

function isFutureDate(value, currentDate = new Date()) {
    if (!value) {
        return false;
    }

    const selectedDate = new Date(value);

    return !Number.isNaN(selectedDate.getTime()) && selectedDate > currentDate;
}

function isValidEmail(value) {
    if (typeof value !== 'string') {
        return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(value.trim());
}

module.exports = {
    isValidBatteryHealth,
    isValidMileage,
    isFutureDate,
    isValidEmail
};