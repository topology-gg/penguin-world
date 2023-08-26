import Phaser from "phaser";
import ObstaclesController from "../controllers/ObstaclesController";
import PlayerController from "../controllers/PlayerController";
import type {
  Connection,
  PeerData,
  PeerMessage,
  State,
  platformerSceneData,
} from "./types";

import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import ScrollablePanel from "phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel";
import config from "../config";
import CharacterController from "../controllers/Controller";
import Whiteboard from "../gameObjects/whiteboard";
import CRDT, { CRDT_STATE } from "../networking/crdt";
import Media from "../networking/media";
import { CRDT_CHAT_HISTORY_REMOTE } from "../networking/messages/crdt";
import { MessageType } from "./enums";

interface ConnectedPlayer extends Connection {
  controller?: CharacterController;
}

enum PEER_PRESENCE {
  JOINED = "joined",
  LEFT = "left",
}

export default class Platformer extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private penquin?: Phaser.Physics.Matter.Sprite;
  private playerController?: PlayerController;
  private obstacles!: ObstaclesController;

  private connectedPlayers: ConnectedPlayer[] = [];

  private lastPosBroadcast: number = 0;

  private chatBox: InputText;
  private chatHistoryLocal: Array<string> = [];
  private chatHistoryLocalPointer: number = 0;
  private chatHistoryRemotePointer: number | undefined = undefined;
  private chatSaved: string = "";

  private infoPanel: ScrollablePanel;
  private infoPanelHasScrolled: boolean = false;
  private readonly COLOR_LIGHT = 0x24b5d2;
  private readonly COLOR_DARK = 0x1184bf;
  private readonly COLOR_CHAT = 0x508bc5;
  private readonly COLOR_PRESENCE = 0xce70ee;

  private username: string;

  private userMessages: PeerMessage[] = [];

  private whiteboard: Whiteboard;

  private crdt: CRDT;
  private media: Media;
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
    this.media = data.media;
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
          const message: PeerMessage = {
            content: parsed.content,
            timestamp: this.time.now,
          };

          player.controller?.chat(message);
          connection.messages.push(message);
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

    this.load.image("mute", "assets/mute.png");
    this.load.image("unmute", "assets/unmute.png");
  }

  renderChatBox() {
    var inputTextConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "rgba(190,190,190,0.8)",
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

  renderMic() {
    const posX = config.scale.width - 574;
    const posY = config.scale.height - 48;

    const mute = this.add
      .sprite(posX, posY, "mute")
      .setDepth(1)
      .setScrollFactor(0, 0)
      .setInteractive();

    const unmute = this.add
      .sprite(posX, posY, "unmute")
      .setDepth(1)
      .setScrollFactor(0, 0)
      .setInteractive()
      .setAlpha(0); // Mute by default.

    mute.on("pointerdown", () => {
      mute.setAlpha(0);
      unmute.clearAlpha();
      this.media.unmute();
    });

    unmute.on("pointerdown", () => {
      unmute.setAlpha(0);
      mute.clearAlpha();
      this.media.mute();
    });
  }

  renderInfoPanel() {
    this.infoPanel = this.rexUI.add
      .scrollablePanel({
        x: config.scale.width - 275,
        y: config.scale.height - 250,
        width: 500,
        height: 300,
        scrollMode: "vertical",
        background: this.rexUI.add.roundRectangle({
          strokeColor: this.COLOR_LIGHT,
          radius: 10,
        }),
        panel: {
          child: this.rexUI.add.sizer({
            orientation: "vertical",
            space: { item: 10, top: 5, bottom: 5, right: 10 },
          }),
        },
        mouseWheelScroller: {
          focus: true,
          speed: 0.1,
        },
        slider: {
          track: this.rexUI.add.roundRectangle({
            width: 3,
            radius: 3,
            color: this.COLOR_DARK,
            alpha: 0.4,
          }),
          thumb: this.rexUI.add.roundRectangle({
            width: 8,
            radius: 8,
            color: this.COLOR_LIGHT,
            alpha: 0.75,
          }),
        },
        space: {
          left: 15,
          right: 15,
          top: 10,
          bottom: 10,
        },
      })
      .setDepth(1)
      .setScrollFactor(0, 0)
      .layout();
  }

  create() {
    this.initializePeers(this.connectedPlayers);
    this.renderChatBox();
    this.renderMic();
    this.renderInfoPanel();

    this.chatBox.on("focus", this.focusChatBox);
    this.chatBox.on("blur", this.blurChatBox);

    this.plugins
      .get("rexClickOutside")
      .add(this.chatBox, {
        enable: true,
        mode: 0, // Fire click event upon press. Set it 1 to fire event upon release.
      })
      .on("clickoutside", () => {
        this.chatBox.setBlur();
      });

    this.input.keyboard.on("keydown-" + "ENTER", () => {
      if (this.chatBox.isFocused === true) {
        this.sendMessage();
        this.chatBox.setBlur();
      } else {
        this.chatBox.setFocus();
      }
    });

    this.input.keyboard.on("keydown-" + "ESC", () => {
      if (this.chatBox.isFocused === true) {
        this.chatBox.setBlur();
      }
    });

    this.input.keyboard.on("keydown-" + "SPACE", () => {
      if (this.chatBox.isFocused === false) {
        return;
      }

      if (this.chatBox === undefined) {
        return;
      }

      const oldText = this.chatBox.text;
      const oldCursorPosition = this.chatBox.cursorPosition;
      const newText =
        oldText.slice(0, oldCursorPosition) +
        " " +
        oldText.slice(oldCursorPosition);
      const newCursorPosition = oldCursorPosition + 1;

      this.chatBox.setText(newText);
      this.chatBox.setCursorPosition(newCursorPosition);
    });

    this.input.keyboard.on("keydown-" + "LEFT", () => {
      if (this.chatBox.isFocused === false) {
        return;
      }

      this.chatBox.setCursorPosition(this.chatBox.cursorPosition - 1);
    });

    this.input.keyboard.on("keydown-" + "RIGHT", () => {
      if (this.chatBox.isFocused === false) {
        return;
      }

      this.chatBox.setCursorPosition(this.chatBox.cursorPosition + 1);
    });

    this.input.keyboard.on("keydown-" + "UP", () => {
      if (this.chatBox.isFocused === false) {
        return;
      }

      if (this.chatHistoryLocalPointer === 0) {
        // End of chat history.
        return;
      }

      if (this.chatHistoryLocalPointer === this.chatHistoryLocal.length) {
        // Start to rewind chat history.
        this.chatSaved = this.chatBox.text || "";
      }

      this.chatHistoryLocalPointer--;

      this.chatBox.setText(this.chatHistoryLocal[this.chatHistoryLocalPointer]);
    });

    this.input.keyboard.on("keydown-" + "DOWN", () => {
      if (this.chatBox.isFocused === false) {
        return;
      }

      if (this.chatHistoryLocalPointer === this.chatHistoryLocal.length) {
        return;
      }

      this.chatHistoryLocalPointer++;

      let text: string;

      if (this.chatHistoryLocalPointer === this.chatHistoryLocal.length) {
        // End of chat history.
        text = this.chatSaved;
      } else {
        // Start to fast forward chat history.
        text = this.chatHistoryLocal[this.chatHistoryLocalPointer];
      }

      this.chatBox.setText(text);
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
          const clientID = this.crdt.getClientID();
          const zone = clientID % 3;

          let randomX: number = 1050;
          let randomY: number = 490;

          switch (zone) {
            case 0:
              randomX = (clientID % 730) + 450;
              randomY = (clientID % 130) + 390;
              break;
            case 1:
              randomX = (clientID % 465) + 1555;
              randomY = (clientID % 180) + 50;
              break;
            case 2:
              randomX = (clientID % 620) + 280;
              randomY = (clientID % 125) - 115;
              break;
            default:
              // Do nothing.
              break;
          }

          this.penquin = this.matter.add
            .sprite(randomX + width * 0.5, randomY, "penquin")
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
    this.crdt.setUsername({ username: this.username });
    this.crdt.observeChatHistoryRemote(
      (chatHistoryRemote: Array<CRDT_CHAT_HISTORY_REMOTE>) => {
        if (this.chatHistoryRemotePointer === undefined) {
          if (chatHistoryRemote.length === 1) {
            // There is no remote chat history, and now there is one from me or peer.
            this.chatHistoryRemotePointer = 0;
          } else {
            // I just joined the world no matter if there is remote chat history.
            this.chatHistoryRemotePointer = chatHistoryRemote.length;
            return;
          }
        }

        const chatBackground = this.rexUI.add.roundRectangle(
          Number.MAX_SAFE_INTEGER, // x
          Number.MAX_SAFE_INTEGER, // y
          440, // width
          50, // height
          20, // radiusConfig
          this.COLOR_CHAT, // fillColor
          0.8 // fillAlpha
        );

        const sliderPosition = this.infoPanel.getElement("slider")!.value;
        const shouldScrollToBottom =
          sliderPosition >= 0.95 || !this.infoPanelHasScrolled;

        if (sliderPosition > 0) {
          this.infoPanelHasScrolled = true;
        }

        for (
          let i = this.chatHistoryRemotePointer;
          i < chatHistoryRemote.length;
          i++
        ) {
          if (chatHistoryRemote[i].text.length === 0) {
            continue;
          }

          this.infoPanel.getElement("panel")!.add(
            this.rexUI.add.label({
              orientation: "horizontal",
              width: chatBackground.displayWidth,
              background: chatBackground,
              space: {
                left: 10,
                right: 10,
                top: 10,
                bottom: 10,
              },
              text: this.add.text(
                0, // x
                0, // y
                `${chatHistoryRemote[i].username}: ${chatHistoryRemote[i].text}`, // text
                {
                  wordWrap: {
                    width: 420,
                    useAdvancedWrap: true,
                  },
                } // style
              ),
              align: "left",
            })
          );
        }
        this.infoPanel.setDepth(1).setScrollFactor(0, 0).layout();

        if (shouldScrollToBottom === true) {
          this.infoPanel.scrollToBottom();
        }

        this.chatHistoryRemotePointer = chatHistoryRemote.length;
      }
    );
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
      const shouldUpdateState = this.chatBox.isFocused === false;

      this.playerController.update(dt, shouldUpdateState);

      // Update my state.
      this.crdt.setPosition(this.playerController.getPosition());
      this.crdt.setInput({
        cursor: this.playerController.serializeCursor(),
        input: this.playerController.getStateName(),
        dt: 0, // dt is not being used as of now.
      });

      // Broadcast my state to peers.
      this.crdt.broadcastState();
    }

    // Update peer penguins.
    const peers = this.crdt.getPeers();

    for (const [clientID, peer] of peers) {
      if (peer.get(CRDT_STATE.REMOVED) === true) {
        this.informPeerPresence(
          this.peers.get(clientID)!.getUsername(),
          PEER_PRESENCE.LEFT
        );

        this.peers.get(clientID)!.destroy();
        this.peers.delete(clientID);

        peers.delete(clientID);

        return;
      }

      const state: State | undefined = peer.get(CRDT_STATE.STATE);

      if (state === undefined) {
        return;
      }

      if (this.peers.has(clientID) === false) {
        this.peers.set(clientID, this.initPeer());

        const username = state.username;

        if (username) {
          this.peers.get(clientID)!.setUsername(username);
        }

        this.informPeerPresence(
          username ? username.username : " ",
          PEER_PRESENCE.JOINED
        );
      }

      const position = state.position;
      const input = state.input;
      const text = state.text;

      if (position) {
        this.peers.get(clientID)!.moveSprite(position);
      }

      if (input) {
        this.peers.get(clientID)!.simulateInput(input);
      }

      if (text) {
        this.peers.get(clientID)!.chat(text);
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
    if (this.chatBox.text.length === 0) {
      return;
    }

    const text = {
      text: this.chatBox.text,
      timestamp: this.time.now,
    };

    this.crdt.setText(text);
    this.crdt.setChatHistoryRemote(text);
    this.chatHistoryLocal.push(this.chatBox.text);

    this.playerController?.chat(this.chatBox.text);
    this.chatBox.setText("");
    this.chatSaved = "";
    this.chatHistoryLocalPointer = this.chatHistoryLocal.length;
  }

  focusChatBox = () => {
    this.chatBox.setStyle("backgroundColor", "rgba(255,255,255,0.9)");
  };

  blurChatBox = () => {
    this.chatBox.setStyle("backgroundColor", "rgba(190,190,190,0.8)");
  };

  private initPeer(
    x: number = 0,
    y: number = 0,
    username: string = ""
  ): CharacterController {
    let penguin = this.matter.add.sprite(0, 0, "penquin").setFixedRotation();

    penguin.setCollisionGroup(-1);

    return new CharacterController(this, penguin, this.obstacles, username);
  }

  // TODO: Refactor codes adding new info to info panel.
  private informPeerPresence(username: string, presence: PEER_PRESENCE) {
    const presenceBackground = this.rexUI.add.roundRectangle(
      Number.MAX_SAFE_INTEGER, // x
      Number.MAX_SAFE_INTEGER, // y
      440, // width
      50, // height
      20, // radiusConfig
      this.COLOR_PRESENCE, // fillColor
      0.8 // fillAlpha
    );

    const sliderPosition = this.infoPanel.getElement("slider")!.value;
    const shouldScrollToBottom =
      sliderPosition >= 0.95 || !this.infoPanelHasScrolled;

    if (sliderPosition > 0) {
      this.infoPanelHasScrolled = true;
    }

    this.infoPanel.getElement("panel")!.add(
      this.rexUI.add.label({
        orientation: "horizontal",
        width: presenceBackground.displayWidth,
        background: presenceBackground,
        space: {
          left: 10,
          right: 10,
          top: 10,
          bottom: 10,
        },
        text: this.add.text(
          0, // x
          0, // y
          `${username} ${presence}`, // text
          {
            wordWrap: {
              width: 420,
              useAdvancedWrap: true,
            },
          } // style
        ),
        align: "left",
      })
    );
    this.infoPanel.setDepth(1).setScrollFactor(0, 0).layout();

    if (shouldScrollToBottom === true) {
      this.infoPanel.scrollToBottom();
    }
  }
}
