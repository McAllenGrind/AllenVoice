import "dotenv/config";
import app from "./app.js";
import {
  createServer,
} from "node:http";

import {
  registerConversationRelayWebSocket,
} from "./websockets/conversation-relay.websocket.js";

const port = process.env.PORT || 3000;

const server =
  createServer(app);

registerConversationRelayWebSocket(
  server,
);

server.listen(
  port,
  () => {
    console.log(
      `Serveur HTTP + WebSocket lancé sur le port ${port}`,
    );
  },
);