import Phaser from "phaser";
import ObstaclesController from "../controllers/ObstaclesController";
import PlayerController from "../controllers/PlayerController";
import type {
  Connection,
  PeerData,
  PeerMessage,
  peerMessage,
  platformerSceneData,
  PositionContent,
} from "./types";

import { MessageType } from "./enums";
import CharacterController from "../controllers/Controller";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import { ScrollablePanel } from "phaser3-rex-plugins/templates/ui/ui-components.js";
import RexUIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import config from "../config";
import { keyboardInputKeys } from "../utils/keys";

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

  private chatBox: InputText | undefined;

  private username: string;

  private userMessages : PeerMessage[] = []

  constructor() {
    super("platformer");
  }

  init(data: platformerSceneData) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.obstacles = new ObstaclesController();

    this.connectedPlayers = data.peers;
    this.username = data.username;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  initializePeers(data: Connection[]) {
    // on data handler from peer
    // send data to peer

    data.forEach((connection, index) => {
      let player = this.connectedPlayers[index];

      let penguin = this.matter.add
        .sprite(1005, 490, "penquin")
        .setFixedRotation()

      penguin.setCollisionGroup(-1)

      this.connectedPlayers[index].penguin = penguin;
      this.connectedPlayers[index].controller = new CharacterController(
        this,
        penguin,
        this.obstacles,
        player.username
      );

      connection.peer.on("data", (data: string) => {
        let parsed: PeerData = JSON.parse(data);
        if (parsed.type == MessageType.INPUT) {
          player.controller?.simulateInput(parsed.content);
        } else if (parsed.type == MessageType.POSITION) {
          let temp: PositionContent = parsed.content;

          player.controller?.moveSprite(temp.x, temp.y);
        } else if (parsed.type == MessageType.MESSAGE) {
          player.controller?.chat(parsed.content);
          connection.messages.push({
            content : parsed.content,
            timestamp : this.time.now
          })
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
          this.penquin.setCollisionGroup(-1)

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
  }

  destroy() {
    this.scene.stop("ui");
  }

  update(t: number, dt: number) {
    this.updatePeers(t, dt);

    this.connectedPlayers.forEach(connection => {
      connection.controller?.updateLabels()
    })
  }

  updatePeers(t: number, dt: number) {
    this.playerController?.update(dt);

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
      content : this.chatBox?.text || "",
      timestamp : this.time.now
    })

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
}
