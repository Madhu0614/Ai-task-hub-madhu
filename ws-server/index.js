const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store cursors by boardId
const boardCursors = {};
// Store user sockets
const userSockets = {}; // userId -> socket.id

io.on('connection', (socket) => {
  let currentBoard = null;
  let currentUser = null;

  // Register user socket for invitation notifications
  socket.on('register-user', ({ userId }) => {
    userSockets[userId] = socket.id;
    socket.join(userId); // Join a room named after the userId
  });

  socket.on('join-board', ({ boardId, user }) => {
    currentBoard = boardId;
    currentUser = user;
    socket.join(boardId);
    if (!boardCursors[boardId]) boardCursors[boardId] = {};
    boardCursors[boardId][user.id] = { x: 0, y: 0, user };
    // Send current cursors to the new user
    socket.emit('cursors-update', Object.values(boardCursors[boardId]));
    // Notify others
    socket.to(boardId).emit('cursors-update', Object.values(boardCursors[boardId]));
  });

  socket.on('cursor-move', ({ boardId, user, x, y }) => {
    if (!boardCursors[boardId]) boardCursors[boardId] = {};
    boardCursors[boardId][user.id] = { x, y, user };
    io.to(boardId).emit('cursors-update', Object.values(boardCursors[boardId]));
  });

  socket.on('disconnect', () => {
    // Clean up userSockets
    for (const [userId, id] of Object.entries(userSockets)) {
      if (id === socket.id) {
        delete userSockets[userId];
        break;
      }
    }
    if (currentBoard && currentUser && boardCursors[currentBoard]) {
      delete boardCursors[currentBoard][currentUser.id];
      io.to(currentBoard).emit('cursors-update', Object.values(boardCursors[currentBoard]));
    }
  });
});

// Notify a user they have been invited to a board
function notifyUserInvited(userId, boardId, boardName) {
  io.to(userId).emit('board-invited', { boardId, boardName });
}

// REST endpoint to trigger invitation notification
app.post('/notify-invite', (req, res) => {
  const { userId, boardId, boardName } = req.body;
  notifyUserInvited(userId, boardId, boardName);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

module.exports = { notifyUserInvited }; 