const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure public/uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

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
        avatar TEXT,
        is_ghost BOOLEAN DEFAULT 0,
        latitude REAL DEFAULT NULL,
        longitude REAL DEFAULT NULL
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        image TEXT,
        has_power BOOLEAN,
        original_post_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        drop_radius INTEGER DEFAULT NULL,
        has_poll BOOLEAN DEFAULT 0,
        poll_question TEXT DEFAULT NULL,
        is_emergency BOOLEAN DEFAULT 0,
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
        burn_time INTEGER DEFAULT NULL,
        opened_at DATETIME DEFAULT NULL,
        FOREIGN KEY(from_user_id) REFERENCES users(id),
        FOREIGN KEY(to_user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        sender_id INTEGER,
        type TEXT,
        is_read BOOLEAN DEFAULT 0,
        target_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
        post_id INTEGER,
        user_id INTEGER,
        vote_option TEXT,
        PRIMARY KEY(post_id, user_id),
        FOREIGN KEY(post_id) REFERENCES posts(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Migraciones seguras para bases de datos existentes
    db.run("ALTER TABLE users ADD COLUMN is_ghost BOOLEAN DEFAULT 0", () => {});
    db.run("ALTER TABLE posts ADD COLUMN drop_radius INTEGER DEFAULT NULL", () => {});
    db.run("ALTER TABLE posts ADD COLUMN has_poll BOOLEAN DEFAULT 0", () => {});
    db.run("ALTER TABLE posts ADD COLUMN poll_question TEXT DEFAULT NULL", () => {});
    db.run("ALTER TABLE posts ADD COLUMN is_emergency BOOLEAN DEFAULT 0", () => {});
    db.run("ALTER TABLE messages ADD COLUMN burn_time INTEGER DEFAULT NULL", () => {});
    db.run("ALTER TABLE messages ADD COLUMN opened_at DATETIME DEFAULT NULL", () => {});
    db.run("ALTER TABLE users ADD COLUMN latitude REAL DEFAULT NULL", () => {});
    db.run("ALTER TABLE users ADD COLUMN longitude REAL DEFAULT NULL", () => {});
    db.run("ALTER TABLE notifications ADD COLUMN target_id INTEGER DEFAULT NULL", () => {});
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
    db.get("SELECT id, username, name, location, avatar, is_ghost, latitude, longitude FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json(row);
        else res.status(401).json({ error: "Credenciales inválidas" });
    });
});

app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, name, location, avatar, is_ghost, latitude, longitude FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processed = (rows || []).map(u => {
            if (u.is_ghost) {
                u.username = `nodo_fantasma_${u.id}`;
                u.name = `Nodo Fantasma`;
                u.avatar = `/favicon.svg`;
                u.location = `Anónimo`;
                u.latitude = null;
                u.longitude = null;
            }
            return u;
        });
        res.json(processed);
    });
});

app.get('/api/users/:id', (req, res) => {
    db.get("SELECT id, username, name, location, avatar, is_ghost, latitude, longitude FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row && row.is_ghost) {
            row.username = `nodo_fantasma_${row.id}`;
            row.name = `Nodo Fantasma`;
            row.avatar = `/favicon.svg`;
            row.location = `Anónimo`;
            row.latitude = null;
            row.longitude = null;
        }
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

// UPDATE COORDINATES
app.post('/api/users/:id/coordinates', (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.params.id;
    db.run("UPDATE users SET latitude = ?, longitude = ? WHERE id = ?", [latitude, longitude, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// POSTS ROUTES
app.post('/api/posts', upload.single('image'), (req, res) => {
    const { user_id, content, has_power, original_post_id, drop_radius, has_poll, poll_question, is_emergency } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const hasPwr = has_power === 'true' || has_power === true ? 1 : 0;
    const dropRad = drop_radius ? parseInt(drop_radius) : null;
    const hasPollVal = has_poll === 'true' || has_poll === true ? 1 : 0;
    const isEmergencyVal = is_emergency === 'true' || is_emergency === true ? 1 : 0;
    
    db.run("INSERT INTO posts (user_id, content, image, has_power, original_post_id, drop_radius, has_poll, poll_question, is_emergency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [user_id, content, image, hasPwr, original_post_id || null, dropRad, hasPollVal, poll_question || null, isEmergencyVal], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const newPostId = this.lastID;
            
            // Generate notifications of type 'emergency' for all other users
            if (isEmergencyVal) {
                db.all("SELECT id FROM users WHERE id != ?", [user_id], (err, allUsers) => {
                    (allUsers || []).forEach(u => {
                        db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [u.id, user_id, 'emergency', newPostId]);
                    });
                });
            }

            // Generate notification for share
            if (original_post_id) {
                db.get("SELECT user_id FROM posts WHERE id = ?", [original_post_id], (err, postOwner) => {
                    if (postOwner && postOwner.user_id != user_id) {
                        db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [postOwner.user_id, user_id, 'share', newPostId]);
                    }
                });
            }
            
            res.json({ success: true, post_id: newPostId });
    });
});

app.get('/api/posts', (req, res) => {
    const user_id = req.query.user_id;
    const query = `
        SELECT p.*, u.username, u.name, u.avatar, u.location, u.is_ghost, u.latitude, u.longitude,
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
    db.all(query, [user_id || 0], (err, posts) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Fetch all poll votes
        db.all("SELECT * FROM poll_votes", (err, votes) => {
            const allVotes = votes || [];
            
            // Mask users who have is_ghost = 1
            const processedPosts = posts.map(p => {
                if (p.is_ghost) {
                    p.username = `nodo_fantasma_${p.user_id}`;
                    p.name = `Nodo Fantasma`;
                    p.avatar = `/favicon.svg`;
                    p.location = `Anónimo`;
                }
                
                // Compile poll stats
                if (p.has_poll) {
                    const postVotes = allVotes.filter(v => v.post_id === p.id);
                    const votesOpt1 = postVotes.filter(v => v.vote_option === 'opt1').length;
                    const votesOpt2 = postVotes.filter(v => v.vote_option === 'opt2').length;
                    const userVote = allVotes.find(v => v.user_id == user_id && v.post_id === p.id);
                    
                    p.poll_stats = {
                        opt1_count: votesOpt1,
                        opt2_count: votesOpt2,
                        total_count: postVotes.length,
                        user_voted_option: userVote ? userVote.vote_option : null
                    };
                }
                return p;
            });
            
            res.json(processedPosts);
        });
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
                        db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [postOwner.user_id, user_id, 'like', post_id]);
                    }
                });
                res.json({ status: "liked" });
            });
        }
    });
});

app.delete('/api/posts/:id', (req, res) => {
    const postId = req.params.id;
    const { user_id } = req.body;
    
    db.get("SELECT user_id FROM posts WHERE id = ?", [postId], (err, post) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!post) return res.status(404).json({ error: "Post no encontrado" });
        if (post.user_id != user_id) return res.status(403).json({ error: "No autorizado" });
        
        db.serialize(() => {
            db.run("DELETE FROM likes WHERE post_id = ?", [postId]);
            db.run("DELETE FROM comments WHERE post_id = ?", [postId]);
            db.run("DELETE FROM poll_votes WHERE post_id = ?", [postId]);
            db.run("DELETE FROM posts WHERE id = ?", [postId], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        });
    });
});

app.post('/api/posts/:id/edit', (req, res) => {
    const postId = req.params.id;
    const { user_id, content } = req.body;
    
    db.get("SELECT user_id FROM posts WHERE id = ?", [postId], (err, post) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!post) return res.status(404).json({ error: "Post no encontrado" });
        if (post.user_id != user_id) return res.status(403).json({ error: "No autorizado" });
        
        db.run("UPDATE posts SET content = ? WHERE id = ?", [content, postId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
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
                db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [postOwner.user_id, user_id, 'comment', post_id]);
            }
        });
        res.json({ success: true, comment_id: this.lastID });
    });
});

app.get('/api/posts/:id/comments', (req, res) => {
    db.all("SELECT c.*, u.name, u.avatar, u.username, u.is_ghost FROM comments c JOIN users u ON c.user_id = u.id WHERE post_id = ? ORDER BY c.created_at ASC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const processed = rows.map(c => {
            if (c.is_ghost) {
                c.username = `nodo_fantasma_${c.user_id}`;
                c.name = `Nodo Fantasma`;
                c.avatar = `/favicon.svg`;
            }
            return c;
        });
        res.json(processed);
    });
});

// MESSAGES ROUTES
app.post('/api/messages', (req, res) => {
    const { from_user_id, to_user_id, content, burn_time } = req.body;
    const burnT = burn_time ? parseInt(burn_time) : null;
    db.run("INSERT INTO messages (from_user_id, to_user_id, content, burn_time) VALUES (?, ?, ?, ?)", [from_user_id, to_user_id, content, burnT], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        // Generate Notification
        db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [to_user_id, from_user_id, 'message', from_user_id]);
        res.json({ success: true, message_id: this.lastID });
    });
});

app.get('/api/messages/:user1/:user2', (req, res) => {
    const u1 = req.params.user1;
    const u2 = req.params.user2;
    
    // 1. Borrar mensajes expirados antes de retornar la lista
    const deleteExpiredQuery = `
        DELETE FROM messages 
        WHERE burn_time IS NOT NULL 
          AND opened_at IS NOT NULL 
          AND (strftime('%s', 'now') - strftime('%s', opened_at)) > burn_time
    `;
    
    db.serialize(() => {
        db.run(deleteExpiredQuery);
        
        // 2. Marcar como abiertos los mensajes dirigidos a u1 provenientes de u2
        db.run(`
            UPDATE messages 
            SET opened_at = datetime('now') 
            WHERE to_user_id = ? AND from_user_id = ? 
              AND opened_at IS NULL AND burn_time IS NOT NULL
        `, [u1, u2]);
        
        // 3. Consultar mensajes restantes
        const query = `
            SELECT * FROM messages 
            WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
            ORDER BY created_at ASC
        `;
        db.all(query, [u1, u2, u2, u1], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
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

// Typing Status Memory Map
const typingStatuses = {};

app.post('/api/chat/typing', (req, res) => {
    const { user_id, typing_to_id, is_typing } = req.body;
    if (!typingStatuses[typing_to_id]) {
        typingStatuses[typing_to_id] = {};
    }
    if (is_typing) {
        typingStatuses[typing_to_id][user_id] = Date.now();
    } else {
        delete typingStatuses[typing_to_id][user_id];
    }
    res.json({ success: true });
});

app.get('/api/chat/typing/:user_id', (req, res) => {
    const targetUserId = req.params.user_id;
    const typers = typingStatuses[targetUserId] || {};
    const activeTypers = [];
    const now = Date.now();
    
    for (const [typerId, timestamp] of Object.entries(typers)) {
        if (now - timestamp < 4000) {
            activeTypers.push(parseInt(typerId));
        } else {
            delete typers[typerId];
        }
    }
    res.json(activeTypers);
});

app.post('/api/users/:id/ghost', (req, res) => {
    const { is_ghost } = req.body;
    const ghostVal = is_ghost ? 1 : 0;
    db.run("UPDATE users SET is_ghost = ? WHERE id = ?", [ghostVal, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, is_ghost: ghostVal });
    });
});

app.post('/api/posts/:id/vote', (req, res) => {
    const post_id = req.params.id;
    const { user_id, vote_option } = req.body;
    db.run("INSERT OR REPLACE INTO poll_votes (post_id, user_id, vote_option) VALUES (?, ?, ?)", [post_id, user_id, vote_option], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Geosocial Aura Backend running on http://localhost:${PORT}`);
});
