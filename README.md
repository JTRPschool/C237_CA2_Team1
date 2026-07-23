# EV App - C237 CA2

An EV battery health and charging management web app.

## Team Feature Ownership

| Student | Feature | Routes | SQL |
|---|---|---|---|
| A - Nasrin | Registration, Login, Access Control | /register, /login, /logout | INSERT, SELECT |
| B - Cayden | Add vehicle / battery log / station / booking | /addVehicle, /addBatteryLog, /addStation, /bookCharging | INSERT |
| C - Taufik | Dashboards + vehicle detail with battery history | /dashboard, /adminDashboard, /vehicle/:id | SELECT, JOIN |
| D - Ethan | Reschedule charging sessions | /rescheduleCharging/:id | UPDATE |
| E - Cayden | Delete vehicle / log / session | /deleteVehicle/:id, /deleteLog/:id, /deleteSession/:id | DELETE |
| F - Jasper | Search / filter / sort vehicles | /searchVehicles | SELECT with WHERE, LIKE, ORDER BY |
| G - Cyrus | Server-Side Validation & Automated Unit Testing | Validation middleware for vehicle, battery log, booking and rescheduling routes | Input validation, boundary testing, Node.js test runner |
## Setup (Local)

1. Install dependencies:
   ```
   npm install
   ```

2. Import the database into MySQL Workbench (localhost):
   - Open MySQL Workbench
   - Run the `evdb.sql` file

3. Start the server:
   ```
   npx nodemon app.js
   ```

4. Open http://localhost:3000

## Test Accounts (seeded)

All passwords: `password123`

- Admin: admin@ev.com
- User: john@ev.com
- User: sarah@ev.com

## Deployment (per L20 slides)

1. Push code to GitHub (add lecturer as collaborator)
2. Deploy database to Azure MySQL:
   - Import `evdb.sql` (remove the `CREATE DATABASE` and `USE` lines first)
3. Update the database connection block in `app.js`:
   - Comment out the localhost block
   - Uncomment the Azure block and fill in your credentials
4. Deploy to Render:
   - Create a new Web Service
   - Connect to your GitHub repo
5. Commit and push updated `app.js` to GitHub

## Folder Structure

```
EVApp/
├── app.js               (main server file — everyone contributes)
├── package.json
├── evdb.sql             (database schema + seed data)
├── README.md
├── validators.js         (Cyrus — reusable validation functions)
├── validators.test.js    (Cyrus — automated unit tests)
├── TESTING.md            (Cyrus — test cases and results)
├── public/
│   └── images/          (uploaded vehicle images)
└── views/
    ├── index.ejs
    ├── register.ejs
    ├── login.ejs
    ├── dashboard.ejs         (user)
    ├── adminDashboard.ejs    (admin)
    ├── vehicle.ejs           (detail + battery history)
    ├── addVehicle.ejs
    ├── addBatteryLog.ejs
    ├── addStation.ejs        (admin)
    ├── bookCharging.ejs
    ├── rescheduleCharging.ejs
    └── searchVehicles.ejs
```
