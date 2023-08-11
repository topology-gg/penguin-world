import Phaser from "phaser";
import ObstaclesController from "../controllers/ObstaclesController";
import PlayerController from "../controllers/PlayerController";
import type {
  Connection,
  PeerData,
  PeerMessage,
  platformerSceneData,
} from "./types";

import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import config from "../config";
import CharacterController from "../controllers/Controller";
import Whiteboard from "../gameObjects/whiteboard";
import CRDT, { CRDT_STATE } from "../networking/crdt";
import { keyboardInputKeys } from "../utils/keys";
import { MessageType } from "./enums";

interface ConnectedPlayer extends Connection {
  controller?: CharacterController;
}

export default class Platformer extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private penquin?: Phaser.Physics.Matter.Sprite;
  private playerController?: PlayerController;
  private obstacles!: ObstaclesController;

  private connectedPlayers: ConnectedPlayer[] = [];

  private lastPosBroadcast: number = 0;

  private chatBox: InputText | undefined;

  private username: string;

  private userMessages: PeerMessage[] = [];

  private whiteboard: Whiteboard;

  private crdt: CRDT;
  private peers: Map<number, CharacterController> = new Map();

  constructor() {
    super("platformer");
  }

  init(data: platformerSceneData) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.obstacles = new ObstaclesController();

    this.connectedPlayers = data.peers;
    this.username = data.username;
    this.crdt = data.crdt;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  initializePeers(data: Connection[]) {
    // on data handler from peer
    // send data to peer

    data.forEach((connection, index) => {
      let player = this.connectedPlayers[index];

      this.connectedPlayers[index].controller = this.initPeer(
        1005,
        490,
        player.username
      );

      connection.peer.on("data", (data: string) => {
        let parsed: PeerData = JSON.parse(data);
        if (parsed.type == MessageType.INPUT) {
          player.controller?.simulateInput(parsed.content);
        } else if (parsed.type == MessageType.POSITION) {
          player.controller?.moveSprite(parsed.content);
        } else if (parsed.type == MessageType.MESSAGE) {
          player.controller?.chat(parsed.content);
          connection.messages.push({
            content: parsed.content,
            timestamp: this.time.now,
          });
        } else if (parsed.type == MessageType.WHITEBOARD) {
          this.whiteboard.setWhiteboardLink(parsed.content);
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

  renderChatBox() {
    var inputTextConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "rgba(255,255,255,0.5)",
      placeholder: "Send messages here",
    };
    var inputText = new InputText(
      this,
      config.scale.width - 275,
      config.scale.height - 50,
      500,
      50,
      inputTextConfig
    );
    this.add.existing(inputText);

    inputText.setScrollFactor(0, 0);

    // Set our input text as a member object
    this.chatBox = inputText;
  }

  appendKey({ key }: any) {
    this.chatBox?.setText(this.chatBox?.text + key);
  }

  create() {
    this.initializePeers(this.connectedPlayers);
    this.renderChatBox();

    this.chatBox?.on("click", this.focusChatBox);

    this.input.keyboard.on("keydown-" + "ENTER", () => {
      this.sendMessage();
    });

    keyboardInputKeys.forEach((key) => {
      this.input.keyboard.on(`keydown-${key}`, this.appendKey);
    });

    this.input.keyboard.on("keydown-" + "BACKSPACE", () => {
      this.chatBox?.setText(
        this.chatBox?.text.slice(0, this.chatBox?.text.length)
      );
    });

    this.input.keyboard.on("keydown-" + "SPACE", () => {
      this.chatBox?.setText(this.chatBox?.text + " ");
    });

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
          console.log(x + width * 0.5, y);
          this.penquin = this.matter.add
            .sprite(x + width * 0.5, y, "penquin")
            .setFixedRotation();

          // Negative collision group prevents player collision
          // https://brm.io/matter-js/docs/classes/Body.html#property_collisionFilter
          this.penquin.setCollisionGroup(-1);

          this.playerController = new PlayerController(
            this,
            this.penquin,
            this.cursors,
            this.obstacles,
            this.username
          );

          this.cameras.main.startFollow(this.penquin, true);
          break;
        }
      }
    });

    this.matter.world.convertTilemapLayer(ground);

    this.whiteboard = this.add.existing(
      new Whiteboard(
        this,
        2685,
        500,
        700,
        true,
        this.shareWhiteboardLink.bind(this),
        this.penquin
      )
    );

    this.crdt.aware();
  }

  shareWhiteboardLink(link: string) {
    this.connectedPlayers.forEach((connectedPlayer) => {
      let message = JSON.stringify({
        type: MessageType.WHITEBOARD,
        content: link,
      });

      connectedPlayer.peer.send(message);
    });
  }
  destroy() {
    this.scene.stop("ui");
  }

  update(t: number, dt: number) {
    this.updatePeers(t, dt);

    this.connectedPlayers.forEach((connection) => {
      connection.controller?.updateLabels();
    });
  }

  updatePeers(t: number, dt: number) {
    if (this.playerController !== undefined) {
      // Update my penguin.
      this.playerController.update(dt);

      // Broadcast my states to peers.
      this.crdt.broadcastPosition(this.playerController.getPosition());
      this.crdt.broadcastInput({
        input: this.playerController.getStateName(),
        cursor: this.playerController.serializeCursor(),
        dt,
      });
    }

    // Update peer penguins.
    const peers = this.crdt.getPeers();

    for (const [clientID, peer] of peers) {
      if (this.peers.has(clientID) === false) {
        this.peers.set(clientID, this.initPeer());
      }

      if (peer.get(CRDT_STATE.REMOVED) === true) {
        this.peers.get(clientID)!.destroy();
        this.peers.delete(clientID);

        peers.delete(clientID);

        return;
      }

      if (peer.get(CRDT_STATE.INPUT)) {
        this.peers.get(clientID)!.simulateInput(peer.get(CRDT_STATE.INPUT));
      }

      if (peer.get(CRDT_STATE.POSITION)) {
        this.peers.get(clientID)!.moveSprite(peer.get(CRDT_STATE.POSITION));
      }
    }

    const GAME_TICKS_TILL_POSITION_UPDATE = 1;
    if (this.lastPosBroadcast + GAME_TICKS_TILL_POSITION_UPDATE <= t) {
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
          input: this.playerController?.getStateName(),
          cursor: this.playerController?.serializeCursor(),
          dt,
        },
      });

      connectedPlayer.peer.send(message);
    });
  }

  sendMessage() {
    this.connectedPlayers.forEach((connectedPlayer) => {
      let message = JSON.stringify({
        type: MessageType.MESSAGE,
        content: this.chatBox?.text,
      });

      connectedPlayer.peer.send(message);
    });

    this.userMessages.push({
      content: this.chatBox?.text || "",
      timestamp: this.time.now,
    });

    this.playerController?.chat(this.chatBox?.text);
    this.chatBox?.setText("");
  }

  focusChatBox() {
    this.chatBox?.setStyle("backgroundColor", "rgba(2,2,2,1)");

    //this.initChatEvents();
  }

  initChatEvents() {
    this.input.keyboard.on("keydown-" + "ENTER", () => {
      this.sendMessage();
    });

    keyboardInputKeys.forEach((key) => {
      this.input.keyboard.on(`keydown-${key}`, this.appendKey);
    });

    this.input.keyboard.on("keydown-" + "BACKSPACE", () => {
      this.chatBox?.setText(
        this.chatBox?.text.slice(0, this.chatBox?.text.length)
      );
    });

    this.input.keyboard.on("keydown-" + "SPACE", () => {
      this.chatBox?.setText(this.chatBox?.text + " ");
    });
  }

  private initPeer(
    x: number = 0,
    y: number = 0,
    username: string = ""
  ): CharacterController {
    let penguin = this.matter.add.sprite(0, 0, "penquin").setFixedRotation();

    penguin.setCollisionGroup(-1);

    return new CharacterController(this, penguin, this.obstacles, username);
  }
}
