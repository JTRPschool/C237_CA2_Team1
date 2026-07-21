const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads (vehicle images)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Database connection
// For local development, uncomment the localhost block and comment out the Azure block
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evdb'
});

// For deployment, use Azure MySQL credentials below
// const connection = mysql.createConnection({
//     host: '<provided by lecturer>.mysql.database.azure.com',
//     user: '<provided by lecturer>',
//     password: '<provided by lecturer>',
//     database: '<team database name>',
//     ssl: { rejectUnauthorized: false }
// });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');
// Enable static files
app.use(express.static('public'));
// Enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, contact, role } = req.body;

    if (!username || !email || !password || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// ============================================================
// STUDENT A (Nasrin) - Registration, Login, Access Control
// ============================================================

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, contact, role) VALUES (?, ?, SHA1(?), ?, ?)';
    connection.query(sql, [username, email, password, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (req.session.user.role == 'user')
                res.redirect('/dashboard');
            else
                res.redirect('/adminDashboard');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ============================================================
// STUDENT C (Taufik) - Dashboards & Viewing
// ============================================================

// User dashboard: shows their own vehicles + upcoming charging sessions
app.get('/dashboard', checkAuthenticated, (req, res) => {
    const userId = req.session.user.userId;

    const vehiclesSql = 'SELECT * FROM vehicles WHERE userId = ?';
    connection.query(vehiclesSql, [userId], (error, vehicles) => {
        if (error) throw error;

        const sessionsSql = `SELECT chargingSessions.*, vehicles.model, chargingStations.stationName
                             FROM chargingSessions
                             JOIN vehicles ON chargingSessions.vehicleId = vehicles.vehicleId
                             JOIN chargingStations ON chargingSessions.stationId = chargingStations.stationId
                             WHERE chargingSessions.userId = ?`;
        connection.query(sessionsSql, [userId], (error, sessions) => {
            if (error) throw error;
            res.render('dashboard', { user: req.session.user, vehicles: vehicles, sessions: sessions });
        });
    });
});

// Admin dashboard: shows all vehicles, all stations, and simple fleet analytics
app.get('/adminDashboard', checkAuthenticated, checkAdmin, (req, res) => {
    const vehiclesSql = `SELECT vehicles.*, users.username
                         FROM vehicles
                         JOIN users ON vehicles.userId = users.userId`;
    connection.query(vehiclesSql, (error, vehicles) => {
        if (error) throw error;

        connection.query('SELECT * FROM chargingStations', (error, stations) => {
            if (error) throw error;

            // Simple analytics: total vehicles and average battery health
            const totalVehicles = vehicles.length;
            let avgHealth = 0;
            if (totalVehicles > 0) {
                let sum = 0;
                for (let i = 0; i < vehicles.length; i++) {
                    sum += vehicles[i].batteryHealth;
                }
                avgHealth = (sum / totalVehicles).toFixed(1);
            }

            res.render('adminDashboard', {
                user: req.session.user,
                vehicles: vehicles,
                stations: stations,
                totalVehicles: totalVehicles,
                avgHealth: avgHealth
            });
        });
    });
});

// Vehicle detail page with battery history
app.get('/vehicle/:id', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.id;

    connection.query('SELECT * FROM vehicles WHERE vehicleId = ?', [vehicleId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const vehicle = results[0];

            // Ownership check: user can only view their own vehicles, admins can view all
            if (req.session.user.role !== 'admin' && vehicle.userId !== req.session.user.userId) {
                req.flash('error', 'Access denied');
                return res.redirect('/dashboard');
            }

            const logsSql = 'SELECT * FROM batteryLogs WHERE vehicleId = ? ORDER BY logDate ASC';
            connection.query(logsSql, [vehicleId], (error, logs) => {
                if (error) throw error;
                res.render('vehicle', { user: req.session.user, vehicle: vehicle, logs: logs });
            });
        } else {
            res.status(404).send('Vehicle not found');
        }
    });
});

// ============================================================
// STUDENT B (Cayden) - Adding Information (INSERT)
// ============================================================

// Add vehicle (user)
app.get('/addVehicle', checkAuthenticated, (req, res) => {
    res.render('addVehicle', { user: req.session.user });
});

app.post('/addVehicle', checkAuthenticated, upload.single('image'), (req, res) => {
    const { model, plateNumber, batteryHealth, mileage } = req.body;
    const userId = req.session.user.userId;
    let image = req.file ? req.file.filename : null;

    const sql = 'INSERT INTO vehicles (userId, model, plateNumber, batteryHealth, mileage, image) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [userId, model, plateNumber, batteryHealth, mileage, image], (error, results) => {
        if (error) {
            console.error("Error adding vehicle:", error);
            res.status(500).send('Error adding vehicle');
        } else {
            res.redirect('/dashboard');
        }
    });
});

// Add battery log entry
app.get('/addBatteryLog/:vehicleId', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.vehicleId;
    connection.query('SELECT * FROM vehicles WHERE vehicleId = ?', [vehicleId], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            res.render('addBatteryLog', { user: req.session.user, vehicle: results[0] });
        } else {
            res.status(404).send('Vehicle not found');
        }
    });
});

app.post('/addBatteryLog/:vehicleId', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.vehicleId;
    const { batteryHealth, mileage, logDate } = req.body;

    const sql = 'INSERT INTO batteryLogs (vehicleId, batteryHealth, mileage, logDate) VALUES (?, ?, ?, ?)';
    connection.query(sql, [vehicleId, batteryHealth, mileage, logDate], (error, results) => {
        if (error) {
            console.error("Error adding battery log:", error);
            res.status(500).send('Error adding battery log');
        } else {
            // Also update current battery health on the vehicle record
            const updateSql = 'UPDATE vehicles SET batteryHealth = ?, mileage = ? WHERE vehicleId = ?';
            connection.query(updateSql, [batteryHealth, mileage, vehicleId], (error) => {
                if (error) throw error;
                res.redirect('/vehicle/' + vehicleId);
            });
        }
    });
});

// Add charging station (admin only)
app.get('/addStation', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addStation', { user: req.session.user });
});

app.post('/addStation', checkAuthenticated, checkAdmin, (req, res) => {
    const { stationName, location, available } = req.body;

    const sql = 'INSERT INTO chargingStations (stationName, location, available) VALUES (?, ?, ?)';
    connection.query(sql, [stationName, location, available], (error, results) => {
        if (error) {
            console.error("Error adding station:", error);
            res.status(500).send('Error adding station');
        } else {
            res.redirect('/adminDashboard');
        }
    });
});

// Book a charging session (user)
app.get('/bookCharging', checkAuthenticated, (req, res) => {
    const userId = req.session.user.userId;
    connection.query('SELECT * FROM vehicles WHERE userId = ?', [userId], (error, vehicles) => {
        if (error) throw error;
        connection.query('SELECT * FROM chargingStations WHERE available = ?', ['yes'], (error, stations) => {
            if (error) throw error;
            res.render('bookCharging', { user: req.session.user, vehicles: vehicles, stations: stations });
        });
    });
});

app.post('/bookCharging', checkAuthenticated, (req, res) => {
    const { vehicleId, stationId, scheduledDate } = req.body;
    const userId = req.session.user.userId;

    const sql = 'INSERT INTO chargingSessions (userId, vehicleId, stationId, scheduledDate, status) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [userId, vehicleId, stationId, scheduledDate, 'scheduled'], (error, results) => {
        if (error) {
            console.error("Error booking charging:", error);
            res.status(500).send('Error booking charging');
        } else {
            res.redirect('/dashboard');
        }
    });
});

// ============================================================
// STUDENT D (Ethan) - Update / Reschedule (UPDATE)
// ============================================================

app.get('/rescheduleCharging/:id', checkAuthenticated, (req, res) => {
    const sessionId = req.params.id;

    const sql = `SELECT chargingSessions.*, vehicles.model, chargingStations.stationName
                 FROM chargingSessions
                 JOIN vehicles ON chargingSessions.vehicleId = vehicles.vehicleId
                 JOIN chargingStations ON chargingSessions.stationId = chargingStations.stationId
                 WHERE chargingSessions.sessionId = ?`;
    connection.query(sql, [sessionId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const chargingSession = results[0];

            // Ownership check: user can only reschedule their own bookings
            if (req.session.user.role !== 'admin' && chargingSession.userId !== req.session.user.userId) {
                req.flash('error', 'Access denied');
                return res.redirect('/dashboard');
            }

            connection.query('SELECT * FROM chargingStations WHERE available = ?', ['yes'], (error, stations) => {
                if (error) throw error;
                res.render('rescheduleCharging', {
                    user: req.session.user,
                    chargingSession: chargingSession,
                    stations: stations
                });
            });
        } else {
            res.status(404).send('Charging session not found');
        }
    });
});

app.post('/rescheduleCharging/:id', checkAuthenticated, (req, res) => {
    const sessionId = req.params.id;
    const { stationId, scheduledDate, status } = req.body;

    const sql = 'UPDATE chargingSessions SET stationId = ?, scheduledDate = ?, status = ? WHERE sessionId = ?';
    connection.query(sql, [stationId, scheduledDate, status, sessionId], (error, results) => {
        if (error) {
            console.error("Error rescheduling charging:", error);
            res.status(500).send('Error rescheduling charging');
        } else {
            res.redirect('/dashboard');
        }
    });
});

// ============================================================
// STUDENT E (Cayden) - Deleting (DELETE)
// ============================================================

app.get('/deleteVehicle/:id', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.id;

    // Ownership check before deletion
    connection.query('SELECT * FROM vehicles WHERE vehicleId = ?', [vehicleId], (error, results) => {
        if (error) throw error;
        if (results.length === 0) {
            return res.status(404).send('Vehicle not found');
        }

        if (req.session.user.role !== 'admin' && results[0].userId !== req.session.user.userId) {
            req.flash('error', 'Access denied');
            return res.redirect('/dashboard');
        }

        // Delete related records first (battery logs, charging sessions) then vehicle
        connection.query('DELETE FROM batteryLogs WHERE vehicleId = ?', [vehicleId], (error) => {
            if (error) throw error;
            connection.query('DELETE FROM chargingSessions WHERE vehicleId = ?', [vehicleId], (error) => {
                if (error) throw error;
                connection.query('DELETE FROM vehicles WHERE vehicleId = ?', [vehicleId], (error) => {
                    if (error) {
                        console.error("Error deleting vehicle:", error);
                        res.status(500).send('Error deleting vehicle');
                    } else {
                        res.redirect('/dashboard');
                    }
                });
            });
        });
    });
});

app.get('/deleteLog/:id', checkAuthenticated, (req, res) => {
    const logId = req.params.id;

    connection.query('SELECT * FROM batteryLogs WHERE logId = ?', [logId], (error, results) => {
        if (error) throw error;
        if (results.length === 0) return res.status(404).send('Log not found');

        const vehicleId = results[0].vehicleId;

        connection.query('DELETE FROM batteryLogs WHERE logId = ?', [logId], (error) => {
            if (error) {
                console.error("Error deleting log:", error);
                res.status(500).send('Error deleting log');
            } else {
                res.redirect('/vehicle/' + vehicleId);
            }
        });
    });
});

app.get('/deleteSession/:id', checkAuthenticated, (req, res) => {
    const sessionId = req.params.id;

    connection.query('SELECT * FROM chargingSessions WHERE sessionId = ?', [sessionId], (error, results) => {
        if (error) throw error;
        if (results.length === 0) return res.status(404).send('Session not found');

        if (req.session.user.role !== 'admin' && results[0].userId !== req.session.user.userId) {
            req.flash('error', 'Access denied');
            return res.redirect('/dashboard');
        }

        connection.query('DELETE FROM chargingSessions WHERE sessionId = ?', [sessionId], (error) => {
            if (error) {
                console.error("Error deleting session:", error);
                res.status(500).send('Error deleting session');
            } else {
                res.redirect('/dashboard');
            }
        });
    });
});

// ============================================================
// STUDENT F (Jasper) - Search / Filter / Sort
// ============================================================

app.get('/searchVehicles', checkAuthenticated, (req, res) => {
    const { search, batteryFilter, sort } = req.query;

    // Build dynamic SQL based on which filters are provided
    let sql = `SELECT vehicles.*, users.username
               FROM vehicles
               JOIN users ON vehicles.userId = users.userId
               WHERE 1=1`;
    const params = [];

    // Regular users only see their own vehicles; admins see all
    if (req.session.user.role !== 'admin') {
        sql += ' AND vehicles.userId = ?';
        params.push(req.session.user.userId);
    }

    // Keyword search on model or plate
    if (search && search.trim() !== '') {
        sql += ' AND (vehicles.model LIKE ? OR vehicles.plateNumber LIKE ?)';
        params.push('%' + search + '%');
        params.push('%' + search + '%');
    }

    // Battery health filter
    if (batteryFilter === 'high') {
        sql += ' AND vehicles.batteryHealth >= 90';
    } else if (batteryFilter === 'medium') {
        sql += ' AND vehicles.batteryHealth >= 80 AND vehicles.batteryHealth < 90';
    } else if (batteryFilter === 'low') {
        sql += ' AND vehicles.batteryHealth < 80';
    }

    // Sorting
    if (sort === 'healthDesc') {
        sql += ' ORDER BY vehicles.batteryHealth DESC';
    } else if (sort === 'healthAsc') {
        sql += ' ORDER BY vehicles.batteryHealth ASC';
    } else if (sort === 'mileageDesc') {
        sql += ' ORDER BY vehicles.mileage DESC';
    } else if (sort === 'mileageAsc') {
        sql += ' ORDER BY vehicles.mileage ASC';
    } else {
        sql += ' ORDER BY vehicles.model ASC';
    }

    connection.query(sql, params, (error, results) => {
        if (error) throw error;
        res.render('searchVehicles', {
            user: req.session.user,
            vehicles: results,
            search: search || '',
            batteryFilter: batteryFilter || '',
            sort: sort || ''
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));