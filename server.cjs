const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve static files from 'public' directory, allowing clean URLs (without .html)
app.use(express.static('public', { extensions: ['html'] }));

// Setup Multer for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Error opening database:", err);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        location TEXT,
        avatar TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        image TEXT,
        has_power BOOLEAN,
        original_post_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS likes (
        user_id INTEGER,
        post_id INTEGER,
        PRIMARY KEY(user_id, post_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(post_id) REFERENCES posts(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
        content TEXT,
        parent_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(post_id) REFERENCES posts(id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(parent_id) REFERENCES comments(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER,
        to_user_id INTEGER,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(from_user_id) REFERENCES users(id),
        FOREIGN KEY(to_user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        sender_id INTEGER,
        type TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
    )`);
});

const defaultAvatars = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsR_4gVSGsNT8mhuzw8HQeh-OVDBZfVf6QGBqmBDcJ4HBrGdB2-GvFMHVDarrwM5ME1lqUqjgRGtJUdlMV6vCg6pYB4kWIqgSna6LH5entaJIgUxhSHFEoOLeCfRk3aItm9-3pzMSDcGeiMszf7NuQ_sKBkOED9om2VVrhmipdyYkBenjALMgUS-lKSrOm4jS8yGFWDMwFZ1n3XjI5TzybaomyROWkxPbf02q3HzbnOO7yxovzWzP28Q2216x2VK1q_bx981i6eHem",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCDR4xRJNKmkYCJzXj9M2aHzVh1i5mZVx4f9s4PCEKM6fqVzscd1zbuKGhTY1XJzD17m080NKYGsgPFStXK6EL-gpoTYnLjwTRQ9bcmDNsl3VZcycNvldLpvaPfeTYX6jZ2589G6lpUvK9bb_5_XzyTci6yTY3CHzwjAMfhoeQCXd7GjgYsYp_KI7s-kjVJKx_cEALRpRu9UewqsNANX7vOydhDnRdMOXeCBc2UaqNX__KRF0-gVbcoxct1T4PKcqjFMHHhl-fs1UWX",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCEBhPSsEft7IHxKvtFPtIlq_kAu-xGqDu0xtO8HKTnDC5ASM9m_Sztt-n_PMZ694g7pgadmy9usME06S8J-_OPlft82d-YL6Ab7eRE83D2SxT_6NqYLYFi9JZ3AZJDhTmSao3KSIjC_B9-O5dajHt0S9GJOKxkjnlOKD7x7bhmIOPpHkFUgG2M7LUdo6Y42rUmbn452VZGxS09NUiOLaCw3b2g_WRBaz1MOBLH_SEcdcZXk2reTJC4fmD_oT_lfLue-AGXUHCcUv1k",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBxpJFqyYDZ3egXS-3ekS0XdJnINM2ccgF_dq_RXWd7MW_KkNMEHL-Pxz0u9q7k0IpC0IG3xvwbqe3lRc9kZUebC2qPbaRLC5raTuqOzR9XBRWtuZSBdTCmkcDRDVmOz2uzDdO0o6-8zmauE3MS8fcVvdRlyzuzC35HmdJobr4ipIRnkrEb82vMDiZQNiEk8MuLBa6D4huE_Qx2KwNvp7FfZGmDf0YBOEBU5a4ab5Ci7g_LO-zxQMhWekHu16GqZjsaaWxNKRVWj-TM"
];

// AUTH ROUTES
app.post('/api/register', (req, res) => {
    const { username, password, name, location } = req.body;
    const avatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    db.run("INSERT INTO users (username, password, name, location, avatar) VALUES (?, ?, ?, ?, ?)", [username, password, name, location, avatar], function(err) {
        if (err) return res.status(400).json({ error: "Usuario ya existe" });
        res.json({ id: this.lastID, username, name, location, avatar });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT id, username, name, location, avatar FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json(row);
        else res.status(401).json({ error: "Credenciales inválidas" });
    });
});

app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, name, location, avatar FROM users", (err, rows) => {
        res.json(rows);
    });
});

app.get('/api/users/:id', (req, res) => {
    db.get("SELECT id, username, name, location, avatar FROM users WHERE id = ?", [req.params.id], (err, row) => {
        res.json(row);
    });
});

// UPDATE SETTINGS
app.post('/api/users/:id/update', upload.single('avatar'), (req, res) => {
    const { name, location } = req.body;
    const userId = req.params.id;
    
    if (req.file) {
        const avatarPath = '/uploads/' + req.file.filename;
        db.run("UPDATE users SET name = ?, location = ?, avatar = ? WHERE id = ?", [name, location, avatarPath, userId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, avatar: avatarPath, name, location });
        });
    } else {
        db.run("UPDATE users SET name = ?, location = ? WHERE id = ?", [name, location, userId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, name, location });
        });
    }
});

// POSTS ROUTES
app.post('/api/posts', upload.single('image'), (req, res) => {
    const { user_id, content, has_power, original_post_id } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const hasPwr = has_power === 'true' || has_power === true ? 1 : 0;
    
    db.run("INSERT INTO posts (user_id, content, image, has_power, original_post_id) VALUES (?, ?, ?, ?, ?)",
        [user_id, content, image, hasPwr, original_post_id || null], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Generate notification for share
            if (original_post_id) {
                db.get("SELECT user_id FROM posts WHERE id = ?", [original_post_id], (err, postOwner) => {
                    if (postOwner && postOwner.user_id != user_id) {
                        db.run("INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)", [postOwner.user_id, user_id, 'share']);
                    }
                });
            }
            
            res.json({ success: true, post_id: this.lastID });
    });
});

app.get('/api/posts', (req, res) => {
    const user_id = req.query.user_id;
    const query = `
        SELECT p.*, u.username, u.name, u.avatar, u.location,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked,
               op.content as original_content, ou.name as original_author
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN posts op ON p.original_post_id = op.id
        LEFT JOIN users ou ON op.user_id = ou.id
        ORDER BY p.created_at DESC
    `;
    db.all(query, [user_id || 0], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// LIKES & COMMENTS
app.post('/api/posts/:id/like', (req, res) => {
    const { user_id } = req.body;
    const post_id = req.params.id;
    db.get("SELECT * FROM likes WHERE user_id = ? AND post_id = ?", [user_id, post_id], (err, row) => {
        if (row) {
            db.run("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [user_id, post_id], () => res.json({ status: "unliked" }));
        } else {
            db.run("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", [user_id, post_id], () => {
                // Generate Notification for Post Owner
                db.get("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, postOwner) => {
                    if (postOwner && postOwner.user_id != user_id) {
                        db.run("INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)", [postOwner.user_id, user_id, 'like']);
                    }
                });
                res.json({ status: "liked" });
            });
        }
    });
});

app.post('/api/posts/:id/comment', (req, res) => {
    const { user_id, content, parent_id } = req.body;
    const post_id = req.params.id;
    db.run("INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)", [post_id, user_id, content, parent_id || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        // Generate Notification
        db.get("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, postOwner) => {
            if (postOwner && postOwner.user_id != user_id) {
                db.run("INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)", [postOwner.user_id, user_id, 'comment']);
            }
        });
        res.json({ success: true, comment_id: this.lastID });
    });
});

app.get('/api/posts/:id/comments', (req, res) => {
    db.all("SELECT c.*, u.name, u.avatar, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE post_id = ? ORDER BY c.created_at ASC", [req.params.id], (err, rows) => {
        res.json(rows);
    });
});

// MESSAGES ROUTES
app.post('/api/messages', (req, res) => {
    const { from_user_id, to_user_id, content } = req.body;
    db.run("INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)", [from_user_id, to_user_id, content], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        // Generate Notification
        db.run("INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)", [to_user_id, from_user_id, 'message']);
        res.json({ success: true, message_id: this.lastID });
    });
});

app.get('/api/messages/:user1/:user2', (req, res) => {
    const query = `
        SELECT * FROM messages 
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY created_at ASC
    `;
    db.all(query, [req.params.user1, req.params.user2, req.params.user2, req.params.user1], (err, rows) => {
        res.json(rows);
    });
});

// NOTIFICATIONS
app.get('/api/notifications/:user_id', (req, res) => {
    const query = `
        SELECT n.*, u.name as sender_name 
        FROM notifications n
        JOIN users u ON n.sender_id = u.id
        WHERE n.user_id = ? 
        ORDER BY n.created_at DESC LIMIT 20
    `;
    db.all(query, [req.params.user_id], (err, rows) => {
        res.json(rows);
    });
});

app.post('/api/notifications/read/:user_id', (req, res) => {
    db.run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.params.user_id], () => {
        res.json({ success: true });
    });
});


// MAP STATS
app.get('/api/stats/map', (req, res) => {
    const query = `
        SELECT u.location, p.has_power, COUNT(DISTINCT u.id) as users_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id IN (SELECT MAX(id) FROM posts GROUP BY user_id)
        GROUP BY u.location, p.has_power
    `;
    db.all(query, (err, rows) => {
        res.json(rows);
    });
});



app.listen(PORT, '0.0.0.0', () => {
    console.log(`Geosocial Aura Backend running on http://localhost:${PORT}`);
});
