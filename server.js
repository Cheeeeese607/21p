
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Added fs for announcement

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- MySQL Configuration ---
const dbConfig = {
  host: 'localhost', 
  user: 'root',       // [请确保此处与你的宝塔配置一致]
  password: '',       // [请确保此处与你的宝塔配置一致]
  database: 'biohazard_21', // [请确保此处与你的宝塔配置一致]
  multipleStatements: true 
};

let db;

function initDatabase() {
  console.log(`Attempting to connect to database: ${dbConfig.database}`);
  
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error('DATABASE CONNECTION ERROR:', err.message);
      return;
    }
    console.log(`Successfully connected to database: ${dbConfig.database}`);
    createTables();
  });
}

function createTables() {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatarId VARCHAR(255) DEFAULT 'avatar_1',
      credits INT DEFAULT 100,
      gamesPlayed INT DEFAULT 0,
      wins INT DEFAULT 0,
      fingersLost INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'OFFLINE',
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const friendsTable = `
    CREATE TABLE IF NOT EXISTS friends (
      userId VARCHAR(255),
      friendId VARCHAR(255),
      status VARCHAR(50) DEFAULT 'OFFLINE',
      PRIMARY KEY (userId, friendId)
    )
  `;

  db.query(usersTable, (err) => {
    if (err) console.error("Error creating users table:", err);
    else {
        db.query("SHOW COLUMNS FROM users LIKE 'status'", (err, res) => {
            if (res && res.length === 0) {
                db.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'OFFLINE'");
                db.query("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            }
        });
        db.query("ALTER TABLE users MODIFY COLUMN avatarId VARCHAR(255)");
    }
  });

  db.query(friendsTable);
}

initDatabase();

// Database heartbeat
setInterval(() => {
    if (!db) return;
    const sql = `
        UPDATE users 
        SET status = 'OFFLINE' 
        WHERE last_seen < (NOW() - INTERVAL 60 SECOND) AND status = 'ONLINE'
    `;
    db.query(sql, (err) => {
        if (err) console.error("Heartbeat check error:", err);
    });
}, 10000);

// --- Announcement System (File Based) ---
const ANNOUNCEMENT_FILE = path.join(__dirname, 'announcement.json');

// Initialize announcement file if not exists
if (!fs.existsSync(ANNOUNCEMENT_FILE)) {
    const defaultData = {
        title: "WELCOME SURVIVOR",
        content: "Welcome to Project 21. Win games to earn credits. Lose, and you lose more than just money.\n\nSystem Version: 1.0.5",
        date: new Date().toISOString()
    };
    fs.writeFileSync(ANNOUNCEMENT_FILE, JSON.stringify(defaultData));
}

app.get('/api/announcement', (req, res) => {
    try {
        const data = fs.readFileSync(ANNOUNCEMENT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Failed to read announcement" });
    }
});

app.post('/api/announcement', (req, res) => {
    const { title, content, code } = req.body;
    if (code !== '114514') {
        return res.status(403).json({ error: "ACCESS DENIED: Invalid Protocol Code" });
    }
    const newData = {
        title: title || "SYSTEM UPDATE",
        content: content || "No content.",
        date: new Date().toISOString()
    };
    try {
        fs.writeFileSync(ANNOUNCEMENT_FILE, JSON.stringify(newData));
        res.json({ success: true, data: newData });
    } catch (err) {
        res.status(500).json({ error: "Failed to update announcement" });
    }
});


// --- API Routes ---
app.post('/api/register', (req, res) => {
  const { username, password, inviteCode } = req.body;
  if (inviteCode !== '123456') return res.status(403).json({ error: 'Invalid Invitation Code' });
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const id = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) return res.status(409).json({ error: 'Username already exists' });
    const sql = "INSERT INTO users (id, username, password, avatarId, credits, status) VALUES (?, ?, ?, ?, ?, 'ONLINE')";
    // Default avatar_1
    db.query(sql, [id, username, password, 'avatar_1', 100], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query("SELECT id, username, avatarId, credits, gamesPlayed, wins, fingersLost FROM users WHERE id = ?", [id], (err, results) => {
        if(err) return res.status(500).json({ error: err.message });
        const user = results[0];
        // SAFETY: Ensure avatarId is never null
        user.avatarId = user.avatarId || 'avatar_1';
        res.json(user);
      });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) {
      const user = results[0];
      db.query("UPDATE users SET status = 'ONLINE', last_seen = NOW() WHERE id = ?", [user.id]);
      res.json({
        id: user.id,
        username: user.username,
        avatarId: user.avatarId || 'avatar_1', // SAFETY: Fallback
        credits: user.credits,
        stats: { gamesPlayed: user.gamesPlayed, wins: user.wins, fingersLost: user.fingersLost, rank: 'SURVIVOR' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.post('/api/user/update', (req, res) => {
    const { id, username, avatarId } = req.body;
    db.query("UPDATE users SET username = ?, avatarId = ? WHERE id = ?", [username, avatarId, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/user/credits', (req, res) => {
  const { userId, amount } = req.body;
  db.query("UPDATE users SET credits = credits + ? WHERE id = ?", [amount, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/friends/:userId', (req, res) => {
  const { userId } = req.params;
  const sql = `SELECT u.id, u.username, u.avatarId, u.status FROM friends f JOIN users u ON f.friendId = u.id WHERE f.userId = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    // SAFETY: Map results to ensure no null avatars
    const safeResults = results.map(friend => ({
        ...friend,
        avatarId: friend.avatarId || 'avatar_1'
    }));
    res.json(safeResults);
  });
});

app.post('/api/friends/add', (req, res) => {
  const { userId, friendUsername } = req.body;
  db.query("SELECT id FROM users WHERE username = ?", [friendUsername], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    const friendId = results[0].id;
    if (friendId === userId) return res.status(400).json({ error: "Cannot add yourself" });
    db.query("SELECT * FROM friends WHERE userId = ? AND friendId = ?", [userId, friendId], (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing.length > 0) return res.status(409).json({ error: 'Already friends' });
      const sql = "INSERT INTO friends (userId, friendId) VALUES (?, ?), (?, ?)";
      db.query(sql, [userId, friendId, friendId, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, friendId, username: friendUsername });
      });
    });
  });
});

app.post('/api/friends/remove', (req, res) => {
  const { userId, friendId } = req.body;
  const sql = "DELETE FROM friends WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)";
  db.query(sql, [userId, friendId, friendId, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Leaderboard API ---
app.get('/api/leaderboard', (req, res) => {
    const sql = `SELECT username, avatarId, credits, wins FROM users ORDER BY credits DESC LIMIT 20`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const safeResults = results.map(r => ({
            ...r,
            avatarId: r.avatarId || 'avatar_1'
        }));
        res.json(safeResults);
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Socket.IO Logic ---

const matchmakingQueue = []; 
const privateRooms = {}; 
const userSockets = {}; 
const roomStates = {}; 

setInterval(() => {
    const now = Date.now();
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
        if (now - matchmakingQueue[i].timestamp > 30000) {
            const expired = matchmakingQueue.splice(i, 1)[0];
            io.to(expired.socketId).emit('match_timeout');
        }
    }
    while (matchmakingQueue.length >= 2) {
        const p1 = matchmakingQueue.shift();
        const p2 = matchmakingQueue.shift();
        startMatch(p1.userId, p1.socketId, p2.userId, p2.socketId, 'RANDOM');
    }
}, 1000);

function startMatch(p1Id, p1Socket, p2Id, p2Socket, type) {
    const roomId = `match_${p1Id}_${p2Id}_${Date.now()}`;
    const s1 = io.sockets.sockets.get(p1Socket);
    const s2 = io.sockets.sockets.get(p2Socket);

    roomStates[roomId] = { readyCount: 0 };

    if (s1) { s1.join(roomId); s1.currentRoom = roomId; }
    if (s2) { s2.join(roomId); s2.currentRoom = roomId; }

    io.to(p1Socket).emit('match_found', { opponentId: p2Id, roomId, role: 'HOST' });
    io.to(p2Socket).emit('match_found', { opponentId: p1Id, roomId, role: 'GUEST' });

    if(db) db.query("UPDATE users SET status = 'IN_GAME' WHERE id IN (?, ?)", [p1Id, p2Id]);
}

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId) {
      console.log(`User ${userId} connected (${socket.id})`);
      userSockets[userId] = socket.id;
      socket.userId = userId;
      if (db) db.query("UPDATE users SET status = 'ONLINE', last_seen = NOW() WHERE id = ?", [userId]);
  }

  socket.on('heartbeat', () => {
      if (userId && db) db.query("UPDATE users SET status = 'ONLINE', last_seen = NOW() WHERE id = ?", [userId]);
  });

  socket.on('join_queue', () => {
      const existingIdx = matchmakingQueue.findIndex(p => p.userId === userId);
      if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);
      matchmakingQueue.push({ socketId: socket.id, userId: userId, timestamp: Date.now() });
  });

  socket.on('leave_queue', () => {
      const existingIdx = matchmakingQueue.findIndex(p => p.userId === userId);
      if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);
  });

  socket.on('join_private_room', ({ code }) => {
      if (privateRooms[code]) {
          const roomData = privateRooms[code];
          if (roomData.hostId === userId) return; 
          clearTimeout(roomData.timeoutId);
          delete privateRooms[code];
          startMatch(roomData.hostId, roomData.hostSocketId, userId, socket.id, 'PRIVATE');
      } else {
          const timeoutId = setTimeout(() => {
              if (privateRooms[code]) {
                  io.to(socket.id).emit('match_timeout');
                  delete privateRooms[code];
              }
          }, 30000); 
          privateRooms[code] = { hostId: userId, hostSocketId: socket.id, timeoutId: timeoutId };
          socket.emit('waiting_for_opponent', { code });
      }
  });

  socket.on('cancel_private_room', ({ code }) => {
      if (privateRooms[code] && privateRooms[code].hostId === userId) {
          clearTimeout(privateRooms[code].timeoutId);
          delete privateRooms[code];
      }
  });

  socket.on('send_invite', ({ targetUserId, senderName, senderAvatar }) => {
      const targetSocketId = userSockets[targetUserId];
      if (targetSocketId) {
          io.to(targetSocketId).emit('receive_invite', { senderId: userId, senderName, senderAvatar });
      }
  });

  socket.on('respond_invite', ({ senderId, accepted }) => {
      const senderSocketId = userSockets[senderId];
      if (accepted && senderSocketId) {
          startMatch(senderId, senderSocketId, userId, socket.id, 'INVITE');
      } else if (senderSocketId) {
          io.to(senderSocketId).emit('invite_declined', { userId });
      }
  });

  socket.on('join_game_room', ({ roomId }) => {
      socket.join(roomId);
      socket.currentRoom = roomId; 
  });

  socket.on('player_ready', ({ roomId }) => {
      if (roomStates[roomId]) {
          roomStates[roomId].readyCount += 1;
          if (roomStates[roomId].readyCount >= 2) {
              io.to(roomId).emit('all_players_ready');
              delete roomStates[roomId];
          }
      } else {
          io.to(roomId).emit('all_players_ready'); 
      }
  });

  socket.on('game_signal', (data) => {
      socket.to(data.roomId).emit('game_signal', data);
  });

  socket.on('disconnect', () => {
      const qIdx = matchmakingQueue.findIndex(p => p.userId === userId);
      if (qIdx !== -1) matchmakingQueue.splice(qIdx, 1);

      for (const code in privateRooms) {
          if (privateRooms[code].hostId === userId) {
              clearTimeout(privateRooms[code].timeoutId);
              delete privateRooms[code];
              break;
          }
      }

      if (socket.currentRoom) {
          socket.to(socket.currentRoom).emit('opponent_disconnected');
          delete roomStates[socket.currentRoom];
      }

      if (userId) {
          delete userSockets[userId];
          if (db) db.query("UPDATE users SET status = 'OFFLINE' WHERE id = ?", [userId]);
      }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
