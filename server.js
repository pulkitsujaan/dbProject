const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files from the 'public' folder
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

    // API: Upload user
    app.post('/upload', upload.single('profile_pic'), async (req, res) => {
        try {
            const { name } = req.body;
            const imageBuffer = req.file.buffer;
            const sql = "INSERT INTO users (name, profile_image) VALUES (?, ?)";
            await connection.execute(sql, [name, imageBuffer]);
            res.redirect('/'); // Refresh the page after upload
        } catch (err) {
            res.status(500).send("Upload failed.");
        }
    });

    // API: Get list of users (JSON)
    app.get('/users', async (req, res) => {
        const [users] = await connection.execute("SELECT id, name FROM users");
        res.json(users);
    });

    // API: Serve raw image
    app.get('/image/:id', async (req, res) => {
        const [rows] = await connection.execute(
            "SELECT profile_image FROM users WHERE id = ?", [req.params.id]
        );
        if (rows.length > 0) {
            res.set('Content-Type', 'image/jpeg');
            res.send(rows[0].profile_image);
        } else {
            res.status(404).send("Not found");
        }
    });

    app.listen(3000, () => console.log('Server: http://localhost:3000'));
}

startServer().catch(err => console.error(err));