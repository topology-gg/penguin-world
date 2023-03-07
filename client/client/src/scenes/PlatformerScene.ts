import Phaser from "phaser";
import ObstaclesController from "../controllers/ObstaclesController";
import PlayerController from "../controllers/PlayerController";
import type {
  Connection,
  PeerData,
  platformerSceneData,
  PositionContent,
} from "./types";

import { MessageType } from "./enums";
import CharacterController from "../controllers/Controller";

interface ConnectedPlayer extends Connection {
  penguin?: Phaser.Physics.Matter.Sprite;
  controller?: CharacterController;
}

export default class Platformer extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private penquin?: Phaser.Physics.Matter.Sprite;
  private playerController?: PlayerController;
  private obstacles!: ObstaclesController;

  private connectedPlayers: ConnectedPlayer[] = [];

  private lastPosBroadcast: number = 0;

  constructor() {
    super("platformer");
  }

  init(data: platformerSceneData) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.obstacles = new ObstaclesController();

    this.connectedPlayers = data.peers;
    this.initializePeers(data.peers);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  initializePeers(data: Connection[]) {
    // on data handler from peer
    // send data to peer

    data.forEach((connection, index) => {
      let player = this.connectedPlayers[index];

      let tempPeng = this.matter.add
        .sprite(1005, 490, "penquin")
        .setFixedRotation();
      
      this.connectedPlayers[index].controller = new CharacterController(
        this,
        tempPeng,
        this.obstacles,
        player.username
      );

      connection.peer.on("data", (data: string) => {
        
        let parsed: PeerData = JSON.parse(data);
        if (parsed.type == MessageType.INPUT) {
          
          player.controller?.simulateInput(parsed.content);
        } else if (parsed.type == MessageType.POSITION) {
          let temp: PositionContent = parsed.content;

          player.penguin?.destroy();

          player.penguin = this.matter.add
            .sprite(temp.x, temp.y, "penquin")
            .setFixedRotation();

          player.controller?.replaceSprite(player.penguin);
        } else if (parsed.type == MessageType.MESSAGE) {
          console.log(`${connection.username} : ${parsed.content}`);
        }
      });
    });
  }

  preload() {
    this.load.atlas("penquin", "assets/penquin.png", "assets/penquin.json");
    this.load.image("tiles", "assets/sheet.png");
    this.load.tilemapTiledJSON("tilemap", "assets/game.json");

    this.load.image("star", "assets/star.png");
    this.load.image("health", "assets/health.png");

    this.load.atlas("snowman", "assets/snowman.png", "assets/snowman.json");
  }

  create() {
    this.scene.launch("ui");

    const map = this.make.tilemap({ key: "tilemap" });
    const tileset = map.addTilesetImage("iceworld", "tiles");

    const ground = map.createLayer("ground", tileset);
    ground.setCollisionByProperty({ collides: true });

    map.createLayer("obstacles", tileset);

    const objectsLayer = map.getObjectLayer("objects");

    objectsLayer.objects.forEach((objData) => {
      const { x = 0, y = 0, name, width = 0, height = 0 } = objData;
      
      switch (name) {
        case "penquin-spawn": {
          console.log(x + width * 0.5, y)
          this.penquin = this.matter.add
            .sprite(x + width * 0.5, y, "penquin")
            .setFixedRotation();

          this.playerController = new PlayerController(
            this,
            this.penquin,
            this.cursors,
            this.obstacles
          );

          this.cameras.main.startFollow(this.penquin, true);
          break;
        }
      }
    });

    this.matter.world.convertTilemapLayer(ground);
  }

  destroy() {
    this.scene.stop("ui");
  }

  update(t: number, dt: number) {
    this.playerController?.update(dt);

    const GAME_TICKS_TILL_POSITION_UPDATE = 500;
    if (this.lastPosBroadcast + GAME_TICKS_TILL_POSITION_UPDATE < t) {
      this.connectedPlayers.forEach((connectedPlayer) => {
        let message = JSON.stringify({
          type: MessageType.POSITION,
          content: {
            x: this.penquin?.x || 0,
            y: this.penquin?.y || 0,
          },
        });

        connectedPlayer.peer.send(message);
      });
      this.lastPosBroadcast = t;
    }

    this.connectedPlayers.forEach((connectedPlayer) => {
      let message = JSON.stringify({
        type: MessageType.INPUT,
        content: {
          input : this.playerController?.getStateName(),
          cursor : this.playerController?.serializeCursor(),
          dt
        },
      });

      connectedPlayer.peer.send(message);
    });
  }
}
