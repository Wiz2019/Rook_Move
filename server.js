const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let currentTurn = null;
let moveTimeout;

function switchTurn() {
  const nextPlayer = playersQueue.shift();
  playersQueue.push(nextPlayer);
  currentTurn = playersQueue[0];
  io.emit('currentTurn', currentTurn);

  console.log(`Switching turn to player ${currentTurn}`);
  startTurnTimer();
}

function startTurnTimer() {
  clearTimeout(moveTimeout);
  moveTimeout = setTimeout(() => {
    console.log('Time is up! Switching turn.');
    switchTurn();
  }, 10000);
}

const playersQueue = [];

io.on('connection', (socket) => {
  console.log('A user connected');

  // Assign a unique ID to each player
  socket.emit('setPlayerId', socket.id);

  // Add the player to the queue
  playersQueue.push(socket.id);

  // If the player is the only one in the queue, start their turn
  if (playersQueue.length === 1) {
    switchTurn();
  }

  // Handle player moves
  socket.on('move', (data) => {
    // Check if it's the player's turn
    if (socket.id === currentTurn) {
      // Broadcast the move to all connected clients
      io.emit('move', { ...data, player: socket.id });

      // Switch to the next player's turn
      switchTurn();
    } else {
      // Inform the player that it's not their turn
      socket.emit('message', 'Wait for your turn!');
    }
  });

  // Handle move validation
  socket.on('validateMove', (data) => {
    const { x, y } = data;

    // Validate the move
    const isValidMove = validateMove(socket.id, x, y);
    // Send the validation result back to the client
    socket.emit('moveValidationResult', { isValidMove, x, y });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');

    // Remove the player from the queue
    const index = playersQueue.indexOf(socket.id);
    if (index !== -1) {
      playersQueue.splice(index, 1);
    }

    // If the disconnected player was in turn, switch to the next player's turn
    if (socket.id === currentTurn) {
      switchTurn();
    }
  });
});

function validateMove(playerId, x, y) {
  // Add your move validation logic here
  // For example, check if the move is valid based on game rules.

  // Get the current position of the player
  const currentPlayerIndex = playersQueue.indexOf(playerId);
  const currentPlayerRow = Math.floor(currentPlayerIndex / 8);
  const currentPlayerCol = currentPlayerIndex % 8;

  // Check if the move is to the left or down
  const isLeft = y < currentPlayerCol;
  const isDown = x > currentPlayerRow;

  // Return true if the move is left or down, otherwise false
  return isLeft || isDown;
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
