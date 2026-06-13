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

// Run Schema and migrations
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        location TEXT,
        avatar TEXT,
        latitude REAL,
        longitude REAL,
        last_seen TEXT,
        is_ghost INTEGER DEFAULT 0
    )`);
    
    // Dynamically add new columns to users if table already existed
    db.run(`ALTER TABLE users ADD COLUMN latitude REAL`, (err) => {});
    db.run(`ALTER TABLE users ADD COLUMN longitude REAL`, (err) => {});
    db.run(`ALTER TABLE users ADD COLUMN last_seen TEXT`, (err) => {});
    db.run(`ALTER TABLE users ADD COLUMN is_ghost INTEGER DEFAULT 0`, (err) => {});
    
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        image TEXT,
        has_power BOOLEAN,
        original_post_id INTEGER,
        has_poll INTEGER DEFAULT 0,
        poll_question TEXT,
        drop_radius INTEGER,
        is_emergency INTEGER DEFAULT 0,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Dynamically add new columns to posts if table already existed
    db.run(`ALTER TABLE posts ADD COLUMN has_poll INTEGER DEFAULT 0`, (err) => {});
    db.run(`ALTER TABLE posts ADD COLUMN poll_question TEXT`, (err) => {});
    db.run(`ALTER TABLE posts ADD COLUMN drop_radius INTEGER`, (err) => {});
    db.run(`ALTER TABLE posts ADD COLUMN is_emergency INTEGER DEFAULT 0`, (err) => {});
    db.run(`ALTER TABLE posts ADD COLUMN latitude REAL`, (err) => {});
    db.run(`ALTER TABLE posts ADD COLUMN longitude REAL`, (err) => {});

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
        burn_time INTEGER,
        opened_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(from_user_id) REFERENCES users(id),
        FOREIGN KEY(to_user_id) REFERENCES users(id)
    )`);

    db.run(`ALTER TABLE messages ADD COLUMN burn_time INTEGER`, (err) => {});
    db.run(`ALTER TABLE messages ADD COLUMN opened_at TEXT`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        sender_id INTEGER,
        type TEXT,
        target_id INTEGER,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
    )`);

    db.run(`ALTER TABLE notifications ADD COLUMN target_id INTEGER`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS votes (
        user_id INTEGER,
        post_id INTEGER,
        vote_option TEXT,
        PRIMARY KEY(user_id, post_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(post_id) REFERENCES posts(id)
    )`);
});

const defaultAvatars = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsR_4gVSGsNT8mhuzw8HQeh-OVDBZfVf6QGBqmBDcJ4HBrGdB2-GvFMHVDarrwM5ME1lqUqjgRGtJUdlMV6vCg6pYB4kWIqgSna6LH5entaJIgUxhSHFEoOLeCfRk3aItm9-3pzMSDcGeiMszf7NuQ_sKBkOED9om2VVrhmipdyYkBenjALMgUS-lKSrOm4jS8yGFWDMwFZ1n3XjI5TzybaomyROWkxPbf02q3HzbnOO7yxovzWzP28Q2216x2VK1q_bx981i6eHem",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCDR4xRJNKmkYCJzXj9M2aHzVh1i5mZVx4f9s4PCEKM6fqVzscd1zbuKGhTY1XJzD17m080NKYGsgPFStXK6EL-gpoTYnLjwTRQ9bcmDNsl3VZcycNvldLpvaPfeTYX6jZ2589G6lpUvK9bb_5_XzyTci6yTY3CHzwjAMfhoeQCXd7GjgYsYp_KI7s-kjVJKx_cEALRpRu9UewqsNANX7vOydhDnRdMOXeCBc2UaqNX__KRF0-gVbcoxct1T4PKcqjFMHHhl-fs1UWX",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCEBhPSsEft7IHxKvtFPtIlq_kAu-xGqDu0xtO8HKTnDC5ASM9m_Sztt-n_PMZ694g7pgadmy9usME06S8J-_OPlft82d-YL6Ab7eRE83D2SxT_6NqYLYFi9JZ3AZJDhTmSao3KSIjC_B9-O5dajHt0S9GJOKxkjnlOKD7x7bhmIOPpHkFUgG2M7LUdo6Y42rUmbn452VZGxS09NUiOLaCw3b2g_WRBaz1MOBLH_SEcdcZXk2reTJC4fmD_oT_lfLue-AGXUHCcUv1k",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBxpJFqyYDZ3egXS-3ekS0XdJnINM2ccgF_dq_RXWd7MW_KkNMEHL-Pxz0u9q7k0IpC0IG3xvwbqe3lRc9kZUebC2qPbaRLC5raTuqOzR9XBRWtuZSBdTCmkcDRDVmOz2uzDdO0o6-8zmauE3MS8fcVvdRlyzuzC35HmdJobr4ipIRnkrEb82vMDiZQNiEk8MuLBa6D4huE_Qx2KwNvp7FfZGmDf0YBOEBU5a4ab5Ci7g_LO-zxQMhWekHu16GqZjsaaWxNKRVWj-TM"
];

// Typing Status Store (In-memory)
const typingStatus = {}; // { userId: { typingToId: timestamp } }

// Helper to update last_seen
function updateLastSeen(userId) {
    if (!userId) return;
    const now = new Date().toISOString();
    db.run("UPDATE users SET last_seen = ? WHERE id = ?", [now, userId]);
}

// AUTH ROUTES
app.post('/api/register', (req, res) => {
    const { username, password, name, location } = req.body;
    const avatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
    const now = new Date().toISOString();
    db.run("INSERT INTO users (username, password, name, location, avatar, last_seen) VALUES (?, ?, ?, ?, ?, ?)", [username, password, name, location, avatar, now], function(err) {
        if (err) return res.status(400).json({ error: "Usuario ya existe" });
        res.json({ id: this.lastID, username, name, location, avatar, is_ghost: 0 });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT id, username, name, location, avatar, is_ghost FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            updateLastSeen(row.id);
            res.json(row);
        }
        else res.status(401).json({ error: "Credenciales inválidas" });
    });
});

app.get('/api/users', (req, res) => {
    db.all("SELECT id, username, name, location, avatar, latitude, longitude, last_seen, is_ghost FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const now = Date.now();
        const results = rows.map(r => {
            const lastSeenTime = r.last_seen ? new Date(r.last_seen).getTime() : 0;
            const isOnline = (now - lastSeenTime) < 15000;
            return {
                id: r.id,
                username: r.username,
                name: r.name,
                location: r.location,
                avatar: r.avatar,
                latitude: r.latitude,
                longitude: r.longitude,
                is_ghost: r.is_ghost === 1,
                is_online: isOnline
            };
        });
        res.json(results);
    });
});

app.get('/api/users/:id', (req, res) => {
    db.get("SELECT id, username, name, location, avatar, latitude, longitude, last_seen, is_ghost FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "No encontrado" });
        const now = Date.now();
        const lastSeenTime = row.last_seen ? new Date(row.last_seen).getTime() : 0;
        res.json({
            id: row.id,
            username: row.username,
            name: row.name,
            location: row.location,
            avatar: row.avatar,
            latitude: row.latitude,
            longitude: row.longitude,
            is_ghost: row.is_ghost === 1,
            is_online: (now - lastSeenTime) < 15000
        });
    });
});

// COORDINATES & LOCATION UPDATE ROUTES
app.post('/api/users/:id/coordinates', (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.params.id;
    const now = new Date().toISOString();
    db.run("UPDATE users SET latitude = ?, longitude = ?, last_seen = ? WHERE id = ?", [latitude, longitude, now, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/users/:id/update_location', (req, res) => {
    const { location } = req.body;
    const userId = req.params.id;
    db.run("UPDATE users SET location = ? WHERE id = ?", [location, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/users/:id/ghost', (req, res) => {
    const { is_ghost } = req.body;
    const userId = req.params.id;
    db.run("UPDATE users SET is_ghost = ? WHERE id = ?", [is_ghost ? 1 : 0, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        updateLastSeen(userId);
        res.json({ success: true });
    });
});

app.post('/api/users/:id/update', upload.single('avatar'), (req, res) => {
    const { name, location } = req.body;
    const userId = req.params.id;
    updateLastSeen(userId);
    
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
    const { user_id, content, has_power, original_post_id, drop_radius, is_emergency, has_poll, poll_question } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const hasPwr = has_power === 'true' || has_power === true ? 1 : 0;
    const isEmerg = is_emergency === 'true' || is_emergency === true ? 1 : 0;
    const hasPl = has_poll === 'true' || has_poll === true ? 1 : 0;
    const dropRad = drop_radius ? parseInt(drop_radius) : null;
    const pollQ = poll_question || null;
    
    updateLastSeen(user_id);

    // Get user's coordinates to save to the post
    db.get("SELECT latitude, longitude FROM users WHERE id = ?", [user_id], (err, uCoords) => {
        const lat = uCoords ? uCoords.latitude : null;
        const lon = uCoords ? uCoords.longitude : null;

        db.run(`INSERT INTO posts (user_id, content, image, has_power, original_post_id, has_poll, poll_question, drop_radius, is_emergency, latitude, longitude) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, content, image, hasPwr, original_post_id || null, hasPl, pollQ, dropRad, isEmerg, lat, lon], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const newPostId = this.lastID;
                
                // Generate notification for share
                if (original_post_id) {
                    db.get("SELECT user_id FROM posts WHERE id = ?", [original_post_id], (err, postOwner) => {
                        if (postOwner && postOwner.user_id != user_id) {
                            db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [postOwner.user_id, user_id, 'share', newPostId]);
                        }
                    });
                }
                
                // Broadcast emergency notification to all users (excluding self)
                if (isEmerg) {
                    db.all("SELECT id FROM users WHERE id != ?", [user_id], (err, allUsers) => {
                        if (allUsers) {
                            allUsers.forEach(u => {
                                db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [u.id, user_id, 'emergency', newPostId]);
                            });
                        }
                    });
                }
                
                res.json({ success: true, post_id: newPostId });
        });
    });
});

app.get('/api/posts', (req, res) => {
    const user_id = req.query.user_id;
    if (user_id) updateLastSeen(user_id);

    const query = `
        SELECT p.*, u.username, u.name, u.avatar, u.location, u.is_ghost,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked,
               op.content as original_content, ou.name as original_author
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN posts op ON p.original_post_id = op.id
        LEFT JOIN users ou ON op.user_id = ou.id
        WHERE u.is_ghost = 0 OR u.id = ?
        ORDER BY p.created_at DESC
    `;
    db.all(query, [user_id || 0, user_id || 0], (err, posts) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Fetch poll details for all posts
        db.all("SELECT * FROM votes", (err, votes) => {
            const results = posts.map(p => {
                const postVotes = votes ? votes.filter(v => v.post_id === p.id) : [];
                const opt1Count = postVotes.filter(v => v.vote_option === 'opt1').length;
                const opt2Count = postVotes.filter(v => v.vote_option === 'opt2').length;
                const userVote = postVotes.find(v => v.user_id == user_id);

                return {
                    ...p,
                    has_power: p.has_power === 1 || p.has_power === true || p.has_power === '1',
                    is_emergency: p.is_emergency === 1,
                    has_poll: p.has_poll === 1,
                    poll_stats: p.has_poll ? {
                        total_count: postVotes.length,
                        opt1_count: opt1Count,
                        opt2_count: opt2Count,
                        user_voted_option: userVote ? userVote.vote_option : null
                    } : null
                };
            });
            res.json(results);
        });
    });
});

app.post('/api/posts/:id/edit', (req, res) => {
    const { content, user_id } = req.body;
    const postId = req.params.id;
    updateLastSeen(user_id);
    db.run("UPDATE posts SET content = ? WHERE id = ? AND user_id = ?", [content, postId, user_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/posts/:id', (req, res) => {
    const { user_id } = req.body;
    const postId = req.params.id;
    updateLastSeen(user_id);
    db.run("DELETE FROM posts WHERE id = ? AND user_id = ?", [postId, user_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// LIKES, COMMENTS & VOTES
app.post('/api/posts/:id/like', (req, res) => {
    const { user_id } = req.body;
    const post_id = req.params.id;
    updateLastSeen(user_id);
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

app.post('/api/posts/:id/comment', (req, res) => {
    const { user_id, content, parent_id } = req.body;
    const post_id = req.params.id;
    updateLastSeen(user_id);
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
    db.all("SELECT c.*, u.name, u.avatar, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE post_id = ? ORDER BY c.created_at ASC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/posts/:id/vote', (req, res) => {
    const { user_id, vote_option } = req.body;
    const post_id = req.params.id;
    updateLastSeen(user_id);
    db.run("INSERT OR REPLACE INTO votes (user_id, post_id, vote_option) VALUES (?, ?, ?)", [user_id, post_id, vote_option], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// MESSAGES ROUTES
app.post('/api/messages', (req, res) => {
    const { from_user_id, to_user_id, content, burn_time } = req.body;
    updateLastSeen(from_user_id);
    db.run("INSERT INTO messages (from_user_id, to_user_id, content, burn_time) VALUES (?, ?, ?, ?)", [from_user_id, to_user_id, content, burn_time !== undefined ? burn_time : null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const msgId = this.lastID;
        // Generate Notification
        db.run("INSERT INTO notifications (user_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)", [to_user_id, from_user_id, 'message', msgId]);
        res.json({ success: true, message_id: msgId });
    });
});

app.get('/api/messages/:user1/:user2', (req, res) => {
    const user1 = req.params.user1;
    const user2 = req.params.user2;
    updateLastSeen(user1);
    
    // Auto-update burn note read status/timer
    const nowStr = new Date().toISOString();
    db.run("UPDATE messages SET opened_at = ? WHERE from_user_id = ? AND to_user_id = ? AND burn_time IS NOT NULL AND opened_at IS NULL", [nowStr, user2, user1]);

    const query = `
        SELECT * FROM messages 
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY created_at ASC
    `;
    db.all(query, [user1, user2, user2, user1], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// TYPING STATUS ROUTES
app.post('/api/chat/typing', (req, res) => {
    const { user_id, typing_to_id, is_typing } = req.body;
    updateLastSeen(user_id);
    if (!typingStatus[user_id]) typingStatus[user_id] = {};
    if (is_typing) {
        typingStatus[user_id][typing_to_id] = Date.now();
    } else {
        delete typingStatus[user_id][typing_to_id];
    }
    res.json({ success: true });
});

app.get('/api/chat/typing/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const typers = [];
    const now = Date.now();
    
    for (const [typerId, targets] of Object.entries(typingStatus)) {
        if (targets[userId] && (now - targets[userId] < 4000)) {
            typers.push(parseInt(typerId));
        }
    }
    res.json(typers);
});

// NOTIFICATIONS
app.get('/api/notifications/:user_id', (req, res) => {
    updateLastSeen(req.params.user_id);
    const query = `
        SELECT n.*, u.name as sender_name 
        FROM notifications n
        JOIN users u ON n.sender_id = u.id
        WHERE n.user_id = ? 
        ORDER BY n.created_at DESC LIMIT 20
    `;
    db.all(query, [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/notifications/read/:user_id', (req, res) => {
    updateLastSeen(req.params.user_id);
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
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Geosocial Aura Backend running on http://localhost:${PORT}`);
});
