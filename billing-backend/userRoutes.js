const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("./db");
const jwt = require("jsonwebtoken");

// Add this connection test
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

// Get all users
router.get("/users", async (req, res) => {
    try {
        console.log("GET /users endpoint hit");
        const result = await pool.query(
            "SELECT id, name, email, role, google_id FROM users ORDER BY name"
        );
        console.log("Users found:", result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error("Error in GET /users:", err);
        res.status(500).json({ error: err.message });
    }
});

// Register a new user (regular registration)
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const validRoles = ["admin", "billing_manager", "user"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        // Check if user already exists
        const userExists = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role]
        );

        res.status(201).json({ message: "User registered", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register/Login with Google
router.post("/google-auth", async (req, res) => {
    try {
        console.log("Received Google auth request:", req.body);
        
        if (!req.body.credential) {
            console.error("No credential provided");
            return res.status(400).json({ error: "No credential provided" });
        }

        const decoded = jwt.decode(req.body.credential);
        console.log("Decoded Google token:", decoded);

        if (!decoded || !decoded.email) {
            console.error("Invalid token");
            return res.status(400).json({ error: "Invalid token" });
        }

        const { google_id, email, name } = req.body;
        
        // Check if email is in admin whitelist
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        const isAdmin = adminEmails.includes(email);

        // First check if there are any users in the system
        const userCount = await pool.query("SELECT COUNT(*) FROM users");
        const isFirstUser = userCount.rows[0].count === '0';

        // Check if user exists
        const userResult = await pool.query(
            "SELECT * FROM users WHERE google_id = $1 OR email = $2",
            [google_id, email]
        );

        if (userResult.rows.length > 0) {
            // Existing user logic...
            const user = userResult.rows[0];
            if (!user.google_id) {
                await pool.query(
                    "UPDATE users SET google_id = $1 WHERE email = $2",
                    [google_id, email]
                );
            }
            return res.json(user);
        }

        // When creating new user, set role based on whitelist
        const role = isAdmin ? 'admin' : 'user';
        const newUser = await pool.query(
            "INSERT INTO users (google_id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING *",
            [google_id, name, email, role]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update user role
router.put("/users/:id/role", async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ["admin", "billing_manager", "user"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const result = await pool.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
            [role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a single user by ID
router.get("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: err.message });
    }
});

// Add this new route
router.delete("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // First check if user exists
        const userCheck = await pool.query(
            "SELECT role FROM users WHERE id = $1",
            [id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Delete the user
        await pool.query("DELETE FROM users WHERE id = $1", [id]);

        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;




