// ============================================================
// [DESIGN & SETUP] - Dependencies & Express Application Init
// ============================================================
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// ============================================================
// [FUNCTIONAL LOGIC] - Multer Storage Configuration (Images)
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});
const upload = multer({ storage: storage });

// ============================================================
// [FUNCTIONAL LOGIC] - Database Connection (Azure MySQL)
// ============================================================
const connection = mysql.createConnection({
    host: 'c237-adib-mysql.mysql.database.azure.com',
    user: 'c237_019',
    password: 'c237019@2026!',
    database: 'c237_019_team1_evdb',
    ssl: { rejectUnauthorized: false }
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// ============================================================
// [DESIGN & FUNCTION] - View Engine & Middleware Setup
// ============================================================
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Authentication Middleware Check[cite: 1]
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Admin Role Middleware Check[cite: 1]
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// Registration Validation Middleware[cite: 1]
const validateRegistration = (req, res, next) => {
    const { username, email, password, contact, role } = req.body;
    if (!username || !email || !password || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 characters');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// ============================================================
// [FUNCTIONAL ROUTE] - STUDENT A (Nasrin): Auth & Control[cite: 1]
// ============================================================
app.get('/', (req, res) => res.render('index', { user: req.session.user }));

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, contact, role } = req.body;
    const sql = 'INSERT INTO users (username, email, password, contact, role) VALUES (?, ?, SHA1(?), ?, ?)';
    connection.query(sql, [username, email, password, contact, role], (err) => {
        if (err) throw err;
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
        if (err) throw err;
        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (req.session.user.role == 'user') res.redirect('/dashboard');
            else res.redirect('/adminDashboard');
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
// [FUNCTIONAL ROUTE] - STUDENT C (Taufik): Dashboards & View[cite: 1]
// ============================================================
app.get('/dashboard', checkAuthenticated, (req, res) => {
    const userId = req.session.user.userId;
    connection.query('SELECT * FROM vehicles WHERE userId = ?', [userId], (error, vehicles) => {
        if (error) throw error;
        const sessionsSql = `SELECT chargingSessions.*, vehicles.model, chargingStations.stationName
                             FROM chargingSessions JOIN vehicles ON chargingSessions.vehicleId = vehicles.vehicleId
                             JOIN chargingStations ON chargingSessions.stationId = chargingStations.stationId
                             WHERE chargingSessions.userId = ?`;
        connection.query(sessionsSql, [userId], (error, sessions) => {
            if (error) throw error;
            res.render('dashboard', { user: req.session.user, vehicles, sessions });
        });
    });
});

app.get('/adminDashboard', checkAuthenticated, checkAdmin, (req, res) => {
    const vehiclesSql = `SELECT vehicles.*, users.username FROM vehicles JOIN users ON vehicles.userId = users.userId`;
    connection.query(vehiclesSql, (error, vehicles) => {
        if (error) throw error;
        connection.query('SELECT * FROM chargingStations', (error, stations) => {
            if (error) throw error;
            const totalVehicles = vehicles.length;
            let avgHealth = 0;
            if (totalVehicles > 0) {
                let sum = 0;
                vehicles.forEach(v => sum += v.batteryHealth);
                avgHealth = (sum / totalVehicles).toFixed(1);
            }
            res.render('adminDashboard', { user: req.session.user, vehicles, stations, totalVehicles, avgHealth });
        });
    });
});

app.get('/vehicle/:id', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.id;
    connection.query('SELECT * FROM vehicles WHERE vehicleId = ?', [vehicleId], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            const vehicle = results[0];
            if (req.session.user.role !== 'admin' && vehicle.userId !== req.session.user.userId) {
                req.flash('error', 'Access denied');
                return res.redirect('/dashboard');
            }
            connection.query('SELECT * FROM batteryLogs WHERE vehicleId = ? ORDER BY logDate ASC', [vehicleId], (error, logs) => {
                if (error) throw error;
                res.render('vehicle', { user: req.session.user, vehicle, logs });
            });
        } else {
            res.status(404).send('Vehicle not found');
        }
    });
});

// ============================================================
// [FUNCTIONAL ROUTE] - STUDENT B (Cayden): Add Information[cite: 1]
// ============================================================

// 1. Static routes MUST come before any dynamic /:id parameters to prevent routing collision
app.get('/addVehicle', checkAuthenticated, (req, res) => res.render('addVehicle', { user: req.session.user }));

app.post('/addVehicle', checkAuthenticated, upload.single('image'), (req, res) => {
    const { model, plateNumber, batteryHealth, mileage } = req.body;
    const userId = req.session.user.userId;
    let image = req.file ? req.file.filename : null;
    const sql = 'INSERT INTO vehicles (userId, model, plateNumber, batteryHealth, mileage, image) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [userId, model, plateNumber, batteryHealth, mileage, image], (error) => {
        if (error) return res.status(500).send('Error adding vehicle');
        res.redirect('/dashboard');
    });
});

app.get('/addStation', checkAuthenticated, checkAdmin, (req, res) => res.render('addStation', { user: req.session.user }));

app.post('/addStation', checkAuthenticated, checkAdmin, (req, res) => {
    const { stationName, location, available } = req.body;
    connection.query('INSERT INTO chargingStations (stationName, location, available) VALUES (?, ?, ?)', [stationName, location, available], (error) => {
        if (error) return res.status(500).send('Error adding station');
        res.redirect('/adminDashboard');
    });
});

app.get('/bookCharging', checkAuthenticated, (req, res) => {
    const userId = req.session.user.userId;
    connection.query('SELECT * FROM vehicles WHERE userId = ?', [userId], (error, vehicles) => {
        if (error) throw error;
        connection.query('SELECT * FROM chargingStations WHERE available = "yes"', (error, stations) => {
            if (error) throw error;
            res.render('bookCharging', { user: req.session.user, vehicles, stations });
        });
    });
});

app.post('/bookCharging', checkAuthenticated, (req, res) => {
    const { vehicleId, stationId, scheduledDate } = req.body;
    const userId = req.session.user.userId;
    connection.query('INSERT INTO chargingSessions (userId, vehicleId, stationId, scheduledDate, status) VALUES (?, ?, ?, ?, "scheduled")', 
    [userId, vehicleId, stationId, scheduledDate], (error) => {
        if (error) return res.status(500).send('Error booking session');
        res.redirect('/dashboard');
    });
});

// 2. Dynamic parameter routes with colons must come AFTER static routes
app.get('/addBatteryLog/:vehicleId', checkAuthenticated, (req, res) => {
    connection.query('SELECT * FROM vehicles WHERE vehicleId = ?', [req.params.vehicleId], (error, results) => {
        if (error) throw error;
        if (results.length > 0) res.render('addBatteryLog', { user: req.session.user, vehicle: results[0] });
        else res.status(404).send('Vehicle not found');
    });
});

app.post('/addBatteryLog/:vehicleId', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.vehicleId;
    const { batteryHealth, mileage, logDate } = req.body;
    const sql = 'INSERT INTO batteryLogs (vehicleId, batteryHealth, mileage, logDate) VALUES (?, ?, ?, ?)';
    connection.query(sql, [vehicleId, batteryHealth, mileage, logDate], (error) => {
        if (error) return res.status(500).send('Error adding log');
        connection.query('UPDATE vehicles SET batteryHealth = ?, mileage = ? WHERE vehicleId = ?', [batteryHealth, mileage, vehicleId], (err) => {
            if (err) throw err;
            res.redirect('/vehicle/' + vehicleId);
        });
    });
});

// ============================================================
// [FUNCTIONAL ROUTE] - STUDENT D (Ethan): Update / Reschedule[cite: 1]
// ============================================================
app.get('/rescheduleCharging/:id', checkAuthenticated, (req, res) => {
    const sql = `SELECT chargingSessions.*, vehicles.model, chargingStations.stationName FROM chargingSessions
                 JOIN vehicles ON chargingSessions.vehicleId = vehicles.vehicleId
                 JOIN chargingStations ON chargingSessions.stationId = chargingStations.stationId
                 WHERE chargingSessions.sessionId = ?`;
    connection.query(sql, [req.params.id], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            if (req.session.user.role !== 'admin' && results[0].userId !== req.session.user.userId) return res.redirect('/dashboard');
            connection.query('SELECT * FROM chargingStations WHERE available = "yes"', (err, stations) => {
                if (err) throw err;
                res.render('rescheduleCharging', { user: req.session.user, chargingSession: results[0], stations });
            });
        } else res.status(404).send('Session not found');
    });
});

app.post('/rescheduleCharging/:id', checkAuthenticated, (req, res) => {
    const { stationId, scheduledDate, status } = req.body;
    connection.query('UPDATE chargingSessions SET stationId = ?, scheduledDate = ?, status = ? WHERE sessionId = ?', 
    [stationId, scheduledDate, status, req.params.id], (error) => {
        if (error) return res.status(500).send('Error rescheduling');
        res.redirect('/dashboard');
    });
});

// ============================================================
// [FUNCTIONAL ROUTE] - STUDENT E (Cayden): Deletion Logic[cite: 1]
// ============================================================
app.get('/deleteVehicle/:id', checkAuthenticated, (req, res) => {
    connection.query('SELECT * FROM vehicles WHERE vehicleId = ?', [req.params.id], (error, results) => {
        if (error) throw error;
        if (results.length === 0) return res.status(404).send('Vehicle not found');
        if (req.session.user.role !== 'admin' && results[0].userId !== req.session.user.userId) return res.redirect('/dashboard');
        res.render('deleteVehicle', { user: req.session.user, vehicle: results[0] });
    });
});

app.post('/deleteVehicle/:id', checkAuthenticated, (req, res) => {
    const vehicleId = req.params.id;
    connection.query('DELETE FROM batteryLogs WHERE vehicleId = ?', [vehicleId], (err) => {
        if (err) throw err;
        connection.query('DELETE FROM chargingSessions WHERE vehicleId = ?', [vehicleId], (err) => {
            if (err) throw err;
            connection.query('DELETE FROM vehicles WHERE vehicleId = ?', [vehicleId], (err) => {
                if (err) return res.status(500).send('Error deleting vehicle');
                if (req.session.user && req.session.user.role === 'admin') {
                    res.redirect('/adminDashboard');
                } else {
                    res.redirect('/dashboard');
                }
            });
        });
    });
});

app.get('/deleteLog/:id', checkAuthenticated, (req, res) => {
    connection.query('SELECT * FROM batteryLogs WHERE logId = ?', [req.params.id], (error, results) => {
        if (error) throw error;
        if (results.length === 0) return res.status(404).send('Log not found');
        res.render('deleteLog', { user: req.session.user, log: results[0] });
    });
});

app.post('/deleteLog/:id', checkAuthenticated, (req, res) => {
    const logId = req.params.id;
    connection.query('SELECT vehicleId FROM batteryLogs WHERE logId = ?', [logId], (err, results) => {
        if (err || results.length === 0) return res.redirect('/dashboard');
        const vehicleId = results[0].vehicleId;
        connection.query('DELETE FROM batteryLogs WHERE logId = ?', [logId], (error) => {
            if (error) return res.status(500).send('Error deleting log');
            res.redirect('/vehicle/' + vehicleId);
        });
    });
});

app.get('/deleteSession/:id', checkAuthenticated, (req, res) => {
    connection.query('SELECT * FROM chargingSessions WHERE sessionId = ?', [req.params.id], (error, results) => {
        if (error) throw error;
        if (results.length === 0) return res.status(404).send('Session not found');
        if (req.session.user.role !== 'admin' && results[0].userId !== req.session.user.userId) return res.redirect('/dashboard');
        res.render('deleteSession', { user: req.session.user, session: results[0] });
    });
});

app.post('/deleteSession/:id', checkAuthenticated, (req, res) => {
    connection.query('DELETE FROM chargingSessions WHERE sessionId = ?', [req.params.id], (error) => {
        if (error) return res.status(500).send('Error deleting session');
        if (req.session.user && req.session.user.role === 'admin') {
            res.redirect('/adminDashboard');
        } else {
            res.redirect('/dashboard');
        }
    });
});

// ============================================================
// [FUNCTIONAL ROUTE] - STUDENT F (Jasper): Search, Filter, Sort[cite: 1]
// ============================================================
app.get('/searchVehicles', checkAuthenticated, (req, res) => {
    // Get the search inputs from the URL. If empty, use default values.
    // Get the search inputs from the URL
    let search = req.query.search;
    let batteryFilter = req.query.batteryFilter;
    let sort = req.query.sort;

    // If the user did not type or select anything, set them to empty
    if (search == undefined) {
        search = '';
    }
    if (batteryFilter == undefined) {
        batteryFilter = '';
    }
    if (sort == undefined) {
        sort = '';
    }

    // Start building the SQL query
    let sql = 'SELECT vehicles.*, users.username FROM vehicles JOIN users ON vehicles.userId = users.userId';
    let params = [];

    // Normal users can only see their own vehicles. Admins can see all.
    if (req.session.user.role === 'admin') {
        sql = sql + ' WHERE (vehicles.model LIKE ? OR vehicles.plateNumber LIKE ?)';
        params.push('%' + search + '%');
        params.push('%' + search + '%');
    } else {
        sql = sql + ' WHERE (vehicles.model LIKE ? OR vehicles.plateNumber LIKE ?) AND vehicles.userId = ?';
        params.push('%' + search + '%');
        params.push('%' + search + '%');
        params.push(req.session.user.userId);
    }

    // Filter by battery health if the user selected one
    if (batteryFilter === 'high') {
        sql = sql + ' AND vehicles.batteryHealth >= 90';
    }
    if (batteryFilter === 'medium') {
        sql = sql + ' AND vehicles.batteryHealth >= 80 AND vehicles.batteryHealth < 90';
    }
    if (batteryFilter === 'low') {
        sql = sql + ' AND vehicles.batteryHealth < 80';
    }

    // Sort the results based on what the user selected
    if (sort === 'healthDesc') {
        sql = sql + ' ORDER BY vehicles.batteryHealth DESC';
    } else if (sort === 'healthAsc') {
        sql = sql + ' ORDER BY vehicles.batteryHealth ASC';
    } else if (sort === 'mileageDesc') {
        sql = sql + ' ORDER BY vehicles.mileage DESC';
    } else if (sort === 'mileageAsc') {
        sql = sql + ' ORDER BY vehicles.mileage ASC';
    } else {
        sql = sql + ' ORDER BY vehicles.model ASC';
    }

    // Run the query and show the results page
    connection.query(sql, params, (error, results) => {
        if (error) throw error;
        res.render('searchVehicles', {
            user: req.session.user,
            vehicles: results,
            search: search,
            batteryFilter: batteryFilter,
            sort: sort
        });
    });
});

// ============================================================
// [DESIGN & SETUP] - Server Listener
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));