//get route

app.get('/charging/edit/:id', checkAuthenticated, (req, res) => {
    const sessionId = req.params.id;

    const sql = `
        SELECT *
        FROM charging_slots
        WHERE id = ? AND user_id = ?
    `;

    connection.query(
        sql,
        [sessionId, req.session.userId],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Database error');
            }

            if (results.length === 0) {
                return res.status(404).send('Charging session not found');
            }

            res.render('edit-session', {
                session: results[0]
            });
        }
    );
});
