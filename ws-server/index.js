const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      return;
    }
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
});

console.log(`WebSocket server running on port ${PORT}`); 