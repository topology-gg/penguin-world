import Phaser from "phaser";
import config from "./config";
import GameScene from "./scenes/Game";
import PlatformerScene from "./scenes/PlatformerScene";
import { Connection, PeerInfo } from "./scenes/types";
import Peer from "simple-peer";

class Connections {
  constructor() {}

  private connections: Connection[] = [];
  private chats: string[] = [];

  private instantiatePeer(
    is_initiator: boolean,
    stream?: MediaStream
  ): PeerInfo {
    var peer = new Peer({
      initiator: is_initiator,
      trickle: false,
      stream: stream,
    });

    let connection: Connection = {
      peer: peer,
      username: "",
    };

    if (stream) {
      let audio = document.createElement("audio");
      document.body.appendChild(audio);

      connection.peer.on("stream", (stream: MediaStream) => {
        audio.srcObject = stream;
        audio.play();
      });
    }

    this.connections.push(connection);

    let index = this.connections.length - 1;
    return {
      peer,
      index,
    };
  }

  initializePeer = (
    is_initiator: boolean,
    is_voice: boolean,
    callback: Function
  ) => {
    if (is_voice) {
      navigator.mediaDevices
        .getUserMedia({
          video: false,
          audio: true,
        })
        .then((stream) => {
          callback(this.instantiatePeer(is_initiator, stream));
        });
    } else {
      callback(this.instantiatePeer(is_initiator));
    }
  };

  // get peer by index
  getConnectionByIndex = (index: number) => {
    return this.connections[index];
  };

  // get connection by username

  // get all connections
  getConnections = () => {
    return this.connections;
  };

  updateUsername = (index: number, username: string) => {
    this.connections[index].username = username;
  };
}

var game = new Phaser.Game(
  Object.assign(config, {
    scene: [GameScene, PlatformerScene],
  })
);

// we are making connections global, persisting between scenes
game.config.connections = new Connections();
