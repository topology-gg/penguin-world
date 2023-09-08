#!/usr/bin/env node

import { readFileSync } from "fs";
import https from "https";
import * as map from "lib0/map";
import ws from "ws";

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line
const wsReadyStateClosed = 3; // eslint-disable-line

const pingTimeout = 30000;

const port = process.env.PORT || 443;
// @ts-ignore
const wss = new ws.Server({ noServer: true });

const options = {
  key: readFileSync("./src/signaling-server/tls/localhost.key"),
  cert: readFileSync("./src/signaling-server/tls/localhost.crt"),
};

const server = https.createServer(options, (request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

const peers = {};

/**
 * Map froms topic-name to set of subscribed clients.
 * @type {Map<string, Set<any>>}
 */
const topics = new Map();

/**
 * @param {any} conn
 * @param {object} message
 */
const send = (conn, message) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    conn.close();
  }
  try {
    conn.send(JSON.stringify(message));
  } catch (e) {
    conn.close();
  }
};

/**
 * Setup a new client
 * @param {any} conn
 */
const onConnection = (conn) => {
  console.log("New connection");
  /**
   * @type {Set<string>}
   */
  const subscribedTopics = new Set();
  let closed = false;
  // Check if connection is still alive
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        conn.close();
      }
    }
  }, pingTimeout);
  conn.on("pong", () => {
    pongReceived = true;
  });
  conn.on("close", () => {
    onClose(conn);

    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName) || new Set();
      subs.delete(conn);
      if (subs.size === 0) {
        topics.delete(topicName);
      }
    });
    subscribedTopics.clear();
    closed = true;
  });
  conn.on(
    "message",
    /** @param {object} message */ (message) => {
      if (typeof message === "string") {
        message = JSON.parse(message);
      }
      if (message && message.type && !closed) {
        switch (message.type) {
          case "subscribe":
            /** @type {Array<string>} */ (message.topics || []).forEach(
              (topicName) => {
                if (typeof topicName === "string") {
                  // add conn to topic
                  const topic = map.setIfUndefined(
                    topics,
                    topicName,
                    () => new Set()
                  );
                  topic.add(conn);
                  // add topic to conn
                  subscribedTopics.add(topicName);
                }
              }
            );
            break;
          case "unsubscribe":
            /** @type {Array<string>} */ (message.topics || []).forEach(
              (topicName) => {
                const subs = topics.get(topicName);
                if (subs) {
                  subs.delete(conn);
                }
              }
            );
            break;
          case "publish":
            if (message.topic) {
              const receivers = topics.get(message.topic);
              if (receivers) {
                message.clients = receivers.size;
                receivers.forEach((receiver) => send(receiver, message));
              }
            }
            break;
          case "ping":
            send(conn, { type: "pong" });
            break;
          case "join":
            onJoin(conn, message);
            break;
          case "send_signal":
            onSendSignal(conn, message);
            break;
        }
      }
    }
  );
};

const onJoin = (conn, message) => {
  // NOTE: In here, ID is clienID of CRDT.
  conn.id = message.from;

  if (peers.hasOwnProperty(message.from)) {
    console.log(`Peer ${message.from} is already joined.`);
    return;
  }

  for (const peerID in peers) {
    // An existing peer connects to new peer.
    send(peers[peerID], {
      type: "connect_peer",
      from: message.from,
      shouldCreateOffer: false,
    });

    // A new peer connects to existing peer
    send(conn, {
      type: "connect_peer",
      from: Number(peerID),
      shouldCreateOffer: true,
    });
  }

  peers[message.from] = conn;
};

const onSendSignal = (conn, message) => {
  if (conn.id !== message.from) {
    console.log(`ID ${conn.id} and sender ${message.from} are different.`);
    return;
  }

  send(peers[message.to], {
    type: "receive_signal",
    from: message.from,
    signal: message.signal,
  });
};

const onClose = (conn) => {
  if (conn.id) {
    delete peers[conn.id];

    for (const peerID in peers) {
      // An existing peer disconnects with the closed peer.
      send(peers[peerID], {
        type: "disconnect_peer",
        from: conn.id,
      });

      // The closed peer disconnects with existing peer.
      send(conn, {
        type: "disconnect_peer",
        from: Number(peerID),
      });
    }
  }
};

wss.on("connection", onConnection);

server.on("upgrade", (request, socket, head) => {
  // You may check auth of request here..
  /**
   * @param {any} ws
   */
  const handleAuth = (ws) => {
    wss.emit("connection", ws, request);
  };
  wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen(port);

console.log("Signaling server running on localhost:", port);
