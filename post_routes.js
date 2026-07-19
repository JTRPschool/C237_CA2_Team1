app.post('/charging/edit/:id', checkAuthenticated, (req, res) => {
    const sessionId = req.params.id;
    const { session_date, time_slot } = req.body;

    const hour = Number(time_slot.split(':')[0]);

    let isPeak = 0;
    let estimatedCost = 10;

    if (hour >= 18 && hour < 22) {
        isPeak = 1;
        estimatedCost = estimatedCost * 1.5;
    }

    const sql = `
        UPDATE charging_slots
        SET session_date = ?,
            time_slot = ?,
            is_peak = ?,
            estimated_cost = ?
        WHERE id = ? AND user_id = ?
    `;

    connection.query(
        sql,
        [
            session_date,
            time_slot,
            isPeak,
            estimatedCost,
            sessionId,
            req.session.userId
        ],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Unable to update booking');
            }

            res.redirect('/dashboard');
        }
    );
});
