require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const app = express();
const db = require('./db');
const port = process.env.PORT

app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'dons',
    resave: false,
    saveUninitialized: true
}));


function isAuthenticated(req, res, next) {
    if(req.session.clientRole) {
        next();
    } else {
        res.redirect("/login");
    }
}


app.get("/", (req, res) => {
    // Test for log out feature
    // console.log(req.session.clientRole);
    // console.log(req.session.userID);
    
    if (req.session.clientRole === 'user') {
        return res.redirect("/schedule");
    } else if (req.session.clientRole === 'nurse') {
        return res.redirect("/dashboard");
    }
    const initAccountsQuery = 'SELECT * FROM accounts';

    db.query(initAccountsQuery, (initAccountsError, initAccountsResults) => {
        if (initAccountsError) {
            console.error("error getting session info", initAccountsError);
            return res.render(path.join(__dirname, "index"), { accountsData: [] });
        }
        const accountsData = initAccountsResults.rows;

        if (req.session) {
            req.session.accountsData = accountsData;
        }

        res.render(path.join(__dirname, "index"), { accountsData });
    });
});
app.get("/home", (req, res) => {
    res.redirect("/");
});


app.get("/login", (req, res) => {
    if (req.session.clientRole === "user") {
        return res.redirect("/schedule");
    } else if (req.session.clientRole === "nurse") {
        return res.redirect("/nurse-home");
    }
    res.render(path.join(__dirname, 'login'), {});
});
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const userCommand = 'SELECT id, username, password, email, role FROM accounts WHERE username = $1 AND password = $2';
    const userParams = [username, password];

    db.query(userCommand, userParams, (userError, userResults) => {
        if (userError) {
            console.error("error executing query", userError);
            return res.redirect("/login");
        }
        
        if (userResults.rowCount > 0) {
            const user = userResults.rows[0];
            req.session.clientRole = user.role;
            req.session.userID = user.id;
            req.session.userName = user.username; 
            if (user.role === 'user') {
                return res.redirect("/patient-home");
            } else if (user.role === 'nurse') {
                return res.redirect("/nurse-home");
            }
        } else {
            console.log("Invalid login information");
            return res.redirect("/login");
        }
    });
});



app.get("/signup", (req, res) => {
    res.redirect("/login");
});
app.post("/signup", (req, res) => {
    const { username, password, email, role } = req.body;

    const command = 'INSERT INTO accounts (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id';
    db.query(command, [username, password, email, role], (error, results) => {
        if (error) {
            console.error("error inserting data", error);
            return res.redirect("/signup");
        } else {
            console.log("Data inserted successfully.");
            if (results.rows.length > 0) {
                const newUserId = results.rows[0].id; 
                req.session.clientRole = role;
                req.session.userID = newUserId;

                if (role === 'user') {
                    res.redirect("/patient-home"); 
                } else if (role === 'nurse') {
                    res.redirect("/nurse-home");
                }
            } else {
                console.error("Unexpected error: No user id returned after insert.");
                res.redirect("/signup");
            }
        }
    });
});




// app.get("/schedule", (req, res) => {
//     res.render(path.join(__dirname, "/schedule"), {});
// });

app.get("/schedule", isAuthenticated, async (req, res) => {
    if (req.session.clientRole === "nurse") {
        return res.redirect("/nurse-home");
    }

    const userID = req.session.userID;
    const initAppointmentsQuery = 'SELECT * FROM appointments WHERE userID = $1';
    db.query(initAppointmentsQuery, [userID], (initAppointmentsError, initAppointmentsResults) => {
        if (initAppointmentsError) {
            console.error("error retrieving appointments", initAppointmentsError);
        }

        const appointmentsData = initAppointmentsResults.rows;
        req.session.appointmentsData = appointmentsData;
        console.log("Appointments:", appointmentsData);
        res.render(path.join(__dirname, "/schedule"), { appointmentsData });
    });
    console.log("Logged in as patient");
    // Testing for log out feature
    // console.log("%s\n%s\n", req.session.clientRole, req.session.userID);
    // console.log(accountsData);
});
app.post("/schedule", (req, res) => {
    
    const userID = req.session.userID;
    console.log(userID);

    const { name, pharmacy_address, personal_address, email, phone, date, time } = req.body;
    const appointmentCommand = 'INSERT INTO appointments (name, pharmacy_address, personal_address, email, phone, date, time, userID) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
    const appointmentParams = [name, pharmacy_address, personal_address, email, phone, date, time, userID];
    db.query(appointmentCommand, appointmentParams, (appointmentError, appointmentResults) => {
        if (appointmentError) {
            console.error("Error inserting appointment", appointmentError);
            return res.redirect("/schedule");
        }
        

        console.log("data inserted successfully");
        const initAppointmentsQuery = 'SELECT * FROM appointments WHERE userID = $1';
        db.query(initAppointmentsQuery, [userID], (initAppointmentsError, initAppointmentsResults) => {
            if (initAppointmentsError) {
                console.error("error retrieving appointments", initAppointmentsError);
            }

            const appointmentsData = initAppointmentsResults.rows;
            req.session.appointmentsData = appointmentsData;
            console.log("Appointments:", appointmentsData);
            res.render(path.join(__dirname, "/schedule"), { appointmentsData });
        });
        
    });
});

app.get("/patient-home", (req, res) => {
    if(req.session.userName) { 
        res.render(path.join(__dirname, "patient-home"), { userName: req.session.userName });
    } else {
        res.redirect("/login");  
    }
});



app.get("/dashboard", isAuthenticated, async (req, res) => {
    // if (req.session.clientRole === "user") {
    //     res.redirect("/schedule");
    // }

    // const accountsData = req.session.accountsData;
    // res.render(path.join(__dirname, 'dashboard'), {accountsData});

    res.redirect("/nurse-home");
    
});

app.get("/nurse-home", isAuthenticated, (req, res) => {
    if (req.session.clientRole === "user") {
        res.redirect("/schedule");
    }
    
    const initAppointmentsQuery = 'SELECT * FROM appointments';
    db.query(initAppointmentsQuery, (initAppointmentsError, initAppointmentsResults) => {
        if (initAppointmentsError) {
            console.error("error retrieving appointments", initAppointmentsError);
            return res.redirect("/nurse-home");
        }
        
        console.log("Logged in as nurse");

        // Testing for log out feature
        // console.log("%s\n%d\n", req.session.clientRole, req.session.userID);
        // console.log(req.session.clientRole);
        // console.log(req.session.userID);
        
        const appointmentsData = initAppointmentsResults.rows;
        req.session.appointmentsData = appointmentsData;
        console.log("Appointments:", appointmentsData);
        res.render(path.join(__dirname, "nurseDashboard"), { appointmentsData });
    });
});

app.get("/logout", (req, res) => {
    req.session.clientRole = "";
    req.session.userID = null;

    res.redirect("/");
});

//logic to accept job from nurse page
app.post('/book-job/:id', (req, res) => {
    const jobId = req.params.id;
    console.log(`Booking job with ID: ${jobId}`);
    res.json({ success: true });
});

app.get("/view-scheduled-jobs", isAuthenticated, (req, res) => {
    const query = 'SELECT * FROM appointments WHERE is_booked = true';

    db.query(query, [], (error, results) => {
        if (error) {
            console.error("Error fetching booked appointments", error);
            return res.status(500).send("Error fetching booked appointments");
        }
        res.render("view-scheduled-jobs", { appointmentsData: results.rows });
    });
});
//bugs with altering false values
app.post("/book-job/:id", isAuthenticated, (req, res) => {
    const jobId = req.params.id;
    const updateQuery = 'UPDATE appointments SET is_booked = true WHERE id = $1 RETURNING *';

    db.query(updateQuery, [jobId], (error, results) => {
        if (error) {
            console.error("Error booking appointment", error);
            res.status(500).json({ success: false, message: "Error booking appointment" });
        } else {
            console.log("Appointment booked successfully", results.rows[0]);
            res.json({ success: true, message: "Appointment booked successfully" });
        }
    });
});


app.listen(port, (req, res) => {
    console.log(`Listening at http://localhost:${port}`);
});