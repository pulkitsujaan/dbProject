const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json());

let connection;

async function startServer() {
    connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Pulkit@123'
    });

    await connection.query("CREATE DATABASE IF NOT EXISTS user_db");
    await connection.query("USE user_db");
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            profile_image LONGBLOB
        )
    `);

    // ── Upload user ──────────────────────────────────────────
    app.post('/upload', upload.single('profile_pic'), async (req, res) => {
        try {
            const { name } = req.body;
            if (!name || !req.file) return res.status(400).send("Missing name or image.");
            const imageBuffer = req.file.buffer;
            await connection.execute(
                "INSERT INTO users (name, profile_image) VALUES (?, ?)",
                [name, imageBuffer]
            );
            res.status(200).send("OK");
        } catch (err) {
            console.error(err);
            res.status(500).send("Upload failed.");
        }
    });

    // ── Get all users ────────────────────────────────────────
    app.get('/users', async (req, res) => {
        try {
            const [users] = await connection.execute("SELECT id, name FROM users ORDER BY id DESC");
            res.json(users);
        } catch (err) {
            res.status(500).json([]);
        }
    });

    // ── Serve profile image ──────────────────────────────────
    app.get('/image/:id', async (req, res) => {
        try {
            const [rows] = await connection.execute(
                "SELECT profile_image FROM users WHERE id = ?",
                [req.params.id]
            );
            if (rows.length > 0 && rows[0].profile_image) {
                res.set('Content-Type', 'image/jpeg');
                res.set('Cache-Control', 'public, max-age=86400');
                res.send(rows[0].profile_image);
            } else {
                res.status(404).send("Not found");
            }
        } catch {
            res.status(500).send("Error");
        }
    });

    // ── Update user ──────────────────────────────────────────
    app.put('/users/:id', upload.single('profile_pic'), async (req, res) => {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).send("Name is required.");
            if (req.file) {
                await connection.execute(
                    "UPDATE users SET name = ?, profile_image = ? WHERE id = ?",
                    [name, req.file.buffer, req.params.id]
                );
            } else {
                await connection.execute(
                    "UPDATE users SET name = ? WHERE id = ?",
                    [name, req.params.id]
                );
            }
            res.status(200).send("Updated");
        } catch (err) {
            console.error(err);
            res.status(500).send("Update failed.");
        }
    });

    // ── Delete user ──────────────────────────────────────────
    app.delete('/users/:id', async (req, res) => {
        try {
            const [result] = await connection.execute(
                "DELETE FROM users WHERE id = ?",
                [req.params.id]
            );
            if (result.affectedRows > 0) {
                res.status(200).send("Deleted");
            } else {
                res.status(404).send("User not found");
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Delete failed.");
        }
    });

    app.listen(3000, () => console.log('✓ Server running: http://localhost:3000'));
}

startServer().catch(err => console.error(err));
