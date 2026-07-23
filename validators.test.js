// ============================================================
// [SOFTWARE TESTING] STUDENT G (Cyrus) - Automated Unit Tests for Validation Functions
// ============================================================
const test = require('node:test');
const assert = require('node:assert');
const {
    isValidBatteryHealth,
    isValidMileage,
    isFutureDate
} = require('./validators');

// Battery health tests
test('accepts valid battery health', () => {
    assert.strictEqual(isValidBatteryHealth(80), true);
});

test('rejects battery health above 100', () => {
    assert.strictEqual(isValidBatteryHealth(101), false);
});

test('rejects negative battery health', () => {
    assert.strictEqual(isValidBatteryHealth(-1), false);
});

test('rejects decimal battery health', () => {
    assert.strictEqual(isValidBatteryHealth(97.6), false);
});

test('rejects empty battery health', () => {
    assert.strictEqual(isValidBatteryHealth(''), false);
});

test('accepts battery health at minimum boundary of 0', () => {
    assert.strictEqual(isValidBatteryHealth(0), true);
});

test('accepts battery health at maximum boundary of 100', () => {
    assert.strictEqual(isValidBatteryHealth(100), true);
});

test('accepts battery health received as a form string', () => {
    assert.strictEqual(isValidBatteryHealth('80'), true);
});

test('rejects battery health containing only spaces', () => {
    assert.strictEqual(isValidBatteryHealth('   '), false);
});

test('rejects null battery health', () => {
    assert.strictEqual(isValidBatteryHealth(null), false);
});

test('rejects undefined battery health', () => {
    assert.strictEqual(isValidBatteryHealth(undefined), false);
});

test('rejects non-numeric battery health', () => {
    assert.strictEqual(isValidBatteryHealth('abc'), false);
});

// Mileage tests
test('rejects non-numeric mileage', () => {
    assert.strictEqual(isValidMileage('ten thousand'), false);
});

test('accepts mileage received as a form string', () => {
    assert.strictEqual(isValidMileage('50000'), true);
});

test('rejects mileage containing only spaces', () => {
    assert.strictEqual(isValidMileage('   '), false);
});

test('accepts valid mileage', () => {
    assert.strictEqual(isValidMileage(50000), true);
});

test('accepts zero mileage', () => {
    assert.strictEqual(isValidMileage(0), true);
});

test('rejects negative mileage', () => {
    assert.strictEqual(isValidMileage(-1), false);
});

test('rejects decimal mileage', () => {
    assert.strictEqual(isValidMileage(100.5), false);
});

test('rejects empty mileage', () => {
    assert.strictEqual(isValidMileage(''), false);
});
test('rejects null mileage', () => {
    assert.strictEqual(isValidMileage(null), false);
});

test('rejects undefined mileage', () => {
    assert.strictEqual(isValidMileage(undefined), false);
});

// Charging-date tests
test('rejects null charging date', () => {
    assert.strictEqual(isFutureDate(null), false);
});

test('rejects undefined charging date', () => {
    assert.strictEqual(isFutureDate(undefined), false);
});

test('accepts a future charging date', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);

    assert.strictEqual(
        isFutureDate(futureDate.toISOString()),
        true
    );
});

test('rejects a past charging date', () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);

    assert.strictEqual(
        isFutureDate(pastDate.toISOString()),
        false
    );
});

test('rejects an invalid charging date', () => {
    assert.strictEqual(isFutureDate('invalid-date'), false);
});

test('rejects an empty charging date', () => {
    assert.strictEqual(isFutureDate(''), false);
});