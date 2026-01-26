const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Database config
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// Secure CORS
const allowedOrigins = [
    "http://localhost:3000",
    "https://card-app-smoky.vercel.app",
    // "https://YOUR-frontend.onrender.com"
];

app.use(
    cors({
        origin: function (origin, callback) {
            // allow requests with no origin (Postman/server-to-server)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
    }),
);

const DEMO_USER = {
    id: 1,
    username: "admin",
    password: "admin123",
};

// login
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username !== DEMO_USER.username && password !== DEMO_USER.password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
        { userId: DEMO_USER.id, username: DEMO_USER.username },
        JWT_SECRET,
        { expiresIn: "1h" },
    );

    res.json({ token });
});

function requireAuth(req, res, next) {
    const header = req.headers.authorization; // "Bearer <token>"

    if (!header) {
        return res.status(401).json({ error: "Authorization header missing" });
    }

    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid authorization header" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

// Protect only ONE route for this demo
app.post("/addcard", requireAuth, async (req, res) => {
// existing addcard logic (same as before)
});

// Get all cards
app.get("/allcards", async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT * FROM cards");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error for allcards" });
    } finally {
        if (connection) connection.end();
    }
});

// Add a new card
app.post("/addcard", async (req, res) => {
    const { card_name, card_pic } = req.body;
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            "INSERT INTO cards (card_name, card_pic) VALUES (?, ?)",
            [card_name, card_pic]
        );
        res.json({ message: "Card added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error - could not add card" });
    } finally {
        if (connection) connection.end();
    }
});

app.put('/updatecard/:id', async (req, res) => {
    const { id } = req.params;
    const { card_name, card_pic } = req.body;
    try{
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE cards SET card_name=?, card_pic=? WHERE id=?', [card_name, card_pic, id]);
        res.status(201).json({ message: 'Card ' + id + ' updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not update card ' + id });
    }
});

// Example Route: Delete a card
app.delete('/deletecard/:id', async (req, res) => {
    const { id } = req.params;
    try{
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM cards WHERE id=?', [id]);
        res.status(201).json({ message: 'Card ' + id + ' deleted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not delete card ' + id });
    }
});

// Start server
app.listen(port, () => {
    console.log("Server running on port", port);
});
