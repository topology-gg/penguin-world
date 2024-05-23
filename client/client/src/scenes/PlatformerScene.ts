import Phaser from "phaser";
import ObstaclesController from "../controllers/ObstaclesController";
import PlayerController from "../controllers/PlayerController";
import type {
  Connection,
  CursorKeys,
  PeerData,
  PeerMessage,
  PositionContent,
  ProjectileResolutionMessge,
  ResolutionMessage,
  State,
  platformerSceneData,
} from "./types";

import config from "../config";
import CharacterController from "../controllers/Controller";
import Whiteboard from "../gameObjects/whiteboard";
import CRDT, { CRDT_STATE } from "../networking/crdt";
import Media from "../networking/media";
import {
  CRDT_CHAT_HISTORY_REMOTE,
  CRDT_PEER_STATE,
} from "../networking/messages/crdt";
import { MessageType, ProjectileEvent } from "./enums";
import { abs, sqrt } from "lib0/math";
import * as Y from "yjs";

interface ConnectedPlayer extends Connection {
  controller?: CharacterController;
}

enum PEER_PRESENCE {
  JOINED = "joined",
  LEFT = "left",
}

interface Snowball {
  sprite: Phaser.Physics.Matter.Sprite;
  id: number;
}

export default class Platformer extends Phaser.Scene {
  private cursors!: CursorKeys;

  private penquin?: Phaser.Physics.Matter.Sprite;
  private snowballs: Snowball[] = [];
  private playerController?: PlayerController;
  private obstacles!: ObstaclesController;

  private connectedPlayers: ConnectedPlayer[] = [];

  private lastPosBroadcast: number = 0;

  private chatHistoryLocal: Array<string> = [];
  private chatHistoryRemotePointer: number | undefined = undefined;

  private username: string;
  private whiteboard: Whiteboard;

  private crdt: CRDT;
  private media: Media;
  private peers: Map<number, CharacterController> = new Map();

  constructor() {
    super("platformer");
  }

  init(data: platformerSceneData) {
    this.cursors = {
      ...this.input.keyboard.createCursorKeys(),
      f: this.input.keyboard.addKey("f"),
    };
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
        player.username,
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
    this.load.image("snowball", "assets/Snowball.png");
    this.load.image("tiles", "assets/sheet.png");
    this.load.tilemapTiledJSON("tilemap", "assets/game.json");

    this.load.image("star", "assets/star.png");
    this.load.image("health", "assets/health.png");

    this.load.atlas("snowman", "assets/snowman.png", "assets/snowman.json");

    this.load.image("mute", "assets/mute.png");
    this.load.image("unmute", "assets/unmute.png");
  }

  renderButtons() {
    const buttonX = config.scale.width - 100;
    const buttonY = config.scale.height / 2 - 100;
    const buttonSpacing = 50;

    const emoteButtons = [
      { text: "🚀", action: () => this.sendMessage("🚀") },
      { text: "🍺", action: () => this.sendMessage("🍺") },
      { text: "👀", action: () => this.sendMessage("👀") },
      { text: "🌶️", action: () => this.sendMessage("🌶️") },
      { text: "❄️", action: () => this.playerController?.throwSnowball() },
    ];

    emoteButtons.forEach((button, index) => {
      this.add
        .text(buttonX, buttonY + buttonSpacing * index, button.text, {
          fontSize: "32px",
          backgroundColor: "#000",
          color: "#fff",
          padding: { x: 0, y: 5 },
        })
        .setInteractive()
        .on("pointerdown", button.action)
        .setScrollFactor(0, 0)
        .setDepth(1000);
    });
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
      const id = this.media.getMediaStreamID();

      if (id === undefined) {
        alert("PlatformerScene: MediaStream is not ready.");
        return;
      }

      this.crdt.setAudio({
        id: id,
        muted: false,
      });

      mute.setAlpha(0);
      unmute.clearAlpha();
    });

    unmute.on("pointerdown", () => {
      const id = this.media.getMediaStreamID();

      if (id === undefined) {
        alert("PlatformerScene: MediaStream is not ready.");
        return;
      }

      this.crdt.setAudio({
        id: id,
        muted: true,
      });

      unmute.setAlpha(0);
      mute.clearAlpha();
    });
  }

  create() {
    this.initializePeers(this.connectedPlayers);
    this.renderButtons();
    this.renderMic();

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

          this.events.addListener;
          this.playerController = new PlayerController(
            this,
            this.penquin,
            this.cursors,
            this.obstacles,
            this.username,
          );

          this.events.addListener("throw", this.handleThrowEvent, this);
          this.events.addListener("hit", this.handleHitEvent, this);

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
        this.penquin,
      ),
    );

    this.processedMessageIDs = new Set();

    this.crdt.aware();
    this.crdt.setUsername({ username: this.username });

    this.crdt.observeGlobalState((globalState: Y.Map<CRDT_PEER_STATE>) => {
      const myClientID = this.crdt.getClientID();

      //
      // Grab my message queue
      //
      const messages = globalState.get(myClientID.toString())?.messages;
      if (messages === undefined) {
        return;
      }

      //
      // Process all of them sequentially
      //
      messages.forEach((msg: ResolutionMessage) => {
        console.log("message", msg);
        if ("update" in msg) {
          const msgUpdate = msg.update;
          const msgIsVelocityBased = msg.isVelocityBased;
          if (!msgIsVelocityBased) {
            // Position based collision resolution
            this.playerController?.setPosition(msgUpdate.x, msgUpdate.y);
          } else {
            // Velocity based collision resolution
            const force: Phaser.Math.Vector2 = new Phaser.Math.Vector2(
              msgUpdate.x / 100,
              msgUpdate.y / 100,
            );
            this.playerController?.applyForce(force);
          }
        } else {
          const msgObjectId = msg.objectId;
          const msgUpdate = msg.projectileEvent;

          if (msgUpdate === ProjectileEvent.SPAWN) {
            const existiningSnowball = this.snowballs.find(
              (snowball) => snowball.id === msgObjectId,
            );
            if (existiningSnowball === undefined) {
              const posX = msg.position.x;
              const posY = msg.position.y;
              const velocityX = msg.velocity.x;
              const velocityY = msg.velocity.y;

              const snowball = this.createSnowball(
                posX,
                posY,
                velocityX,
                velocityY,
                msgObjectId,
              );

              const newSnowball: Snowball = {
                sprite: snowball,
                id: msg.messageID,
              };

              this.snowballs.push(newSnowball);
            }
          } else if (msgUpdate === ProjectileEvent.DESPAWN) {
            this.snowballs.forEach((snowball) => {
              if (snowball.id === msg.messageID) {
                snowball.sprite.destroy();
              }
            });
          }
        }
      });

      //
      // Clear my message queue
      //
      this.crdt.clearMyMessageQueue();
    });

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

        for (
          let i = this.chatHistoryRemotePointer;
          i < chatHistoryRemote.length;
          i++
        ) {
          if (chatHistoryRemote[i].text.length === 0) {
            continue;
          }

          this.chatHistoryRemotePointer = chatHistoryRemote.length;
        }
      },
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

  createSnowball(
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    messageId: number,
  ) {
    const snowballCollisionGroup = -12;

    const snowball = this.matter.add
      .sprite(x, y, "snowball")
      .setFixedRotation()
      .setScale(0.05);

    snowball.setCollisionGroup(snowballCollisionGroup);
    snowball.setIgnoreGravity(true);
    snowball.setVelocity(velocityX, velocityY);
    snowball.setFriction(0, 0);
    //Used to genereate valid DESPWAN events on collision
    snowball.snowballId = messageId;

    setTimeout(() => {
      snowball.destroy();
      this.snowballs = this.snowballs.filter((s) => s.id !== messageId);
    }, 1000);

    return snowball;
  }
  handleThrowEvent(positon: Phaser.Math.Vector2, velocityX: number) {
    const { x, y } = positon;

    const messageId = Date.now() * this.crdt.getClientID();
    const snowball = this.createSnowball(x, y, velocityX, 0, messageId);
    const newSnowball: Snowball = {
      sprite: snowball,
      id: messageId,
    };

    this.snowballs.push(newSnowball);

    const resolutionMessage: ProjectileResolutionMessge = {
      messageID: messageId,
      objectId: messageId,
      projectileEvent: ProjectileEvent.SPAWN,
      position: { x, y },
      velocity: { x: velocityX, y: 0 },
    };

    const peers = this.crdt.getPeers();

    for (const [peerClientID, _] of peers) {
      this.crdt.addResolutionMessageToPeerMessageQueue(
        peerClientID,
        resolutionMessage,
      );
    }
  }

  handleHitEvent(snowballId: number) {
    const resolutionMessage: ProjectileResolutionMessge = {
      messageID: snowballId,
      objectId: snowballId,
      projectileEvent: ProjectileEvent.DESPAWN,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    };

    const peers = this.crdt.getPeers();

    this.snowballs.find((s) => s.id === snowballId)?.sprite.destroy();

    for (const [peerClientID, _] of peers) {
      this.crdt.addResolutionMessageToPeerMessageQueue(
        peerClientID,
        resolutionMessage,
      );
    }
  }

  updatePeers(t: number, dt: number) {
    if (this.playerController !== undefined) {
      // Update my penguin.
      const shouldUpdateState = true;

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
      //
      // handle peer removal
      //
      if (peer.get(CRDT_STATE.REMOVED) === true) {
        this.informPeerPresence(
          this.peers.get(clientID)!.getUsername(),
          PEER_PRESENCE.LEFT,
        );

        this.peers.get(clientID)!.destroy();
        this.peers.delete(clientID);

        peers.delete(clientID);

        return;
      }

      //
      // get the peer's current state
      //
      const state: State | undefined = peer.get(CRDT_STATE.STATE);

      if (state === undefined) {
        return;
      }

      //
      // Spawn and draw peer penguins
      //
      if (this.peers.has(clientID) === false) {
        this.peers.set(clientID, this.initPeer());

        const username = state.username;

        if (username) {
          this.peers.get(clientID)!.setUsername(username);
        }

        this.informPeerPresence(
          username ? username.username : " ",
          PEER_PRESENCE.JOINED,
        );
      }

      const position = state.position;
      const input = state.input;
      const text = state.text;
      const audio = state.audio;

      if (position) {
        this.peers.get(clientID)!.moveSprite(position);
      }

      if (input) {
        this.peers.get(clientID)!.simulateInput(input);
      }

      if (text) {
        this.peers.get(clientID)!.chat(text);
      }

      if (audio && audio.id) {
        this.media.controlMediaStreamByID(audio.id, audio.muted);
      }
    }

    //
    // Check overlap between my penguin and each of other penguins
    // note:
    // - the local clientID can be obtained from `this.crdt.getClientID()`
    // - use `for (const [clientID, peer] of peers) {` to loop through all peers
    // - use a guesstimate hitbox dimension for now; use square as the hitbox shape
    //
    const me = this.playerController;
    if (me !== undefined) {
      const TOY_HITBOX_DIM = this.penquin!.displayWidth;

      for (const [peerClientID, peer] of peers) {
        // get peer state
        const state: State | undefined = peer.get(CRDT_STATE.STATE);
        if (state === undefined) {
          continue;
        }

        // get coordinates of interest
        const myPos = me.getPosition();
        const myX = myPos.x;
        const myY = myPos.y;
        const theirPos = (
          state ? state.position : { x: 0, y: 0 }
        ) as PositionContent;
        const theirX = theirPos.x;
        const theirY = theirPos.y;

        // check for overlap
        const distanceX = abs(myX - theirX);
        const distanceY = abs(myY - theirY);
        const isOverlapped =
          distanceX <= TOY_HITBOX_DIM && distanceY <= TOY_HITBOX_DIM;

        // if overlap, send resolution message via crdt (use crdt as mailbox)
        if (isOverlapped) {
          console.log("isOverlapped!");

          //
          // calculate the magnitude of the displacement vector from them to me
          //
          const normalizationFactor = sqrt(
            (myX - theirX) ** 2 + (myY - theirY) ** 2,
          );
          const normalizationFactorSafe =
            normalizationFactor == 0 ? 1 : normalizationFactor;

          //
          // calculate the normalised displacement vector from them to me
          //
          const normalizedDisplacementVectorMeMinusPeer = {
            x: (myX - theirX) / normalizationFactorSafe,
            y: (myY - theirY) / normalizationFactorSafe,
          };

          //
          // this coef resembles restitution coefficient
          //
          const RESOLVE_VEL_COEF = 6;

          //
          // calculate new velocities for myself and them for resolving the collision
          //
          const myNewVel = {
            x: normalizedDisplacementVectorMeMinusPeer.x * RESOLVE_VEL_COEF,
            y: normalizedDisplacementVectorMeMinusPeer.y * RESOLVE_VEL_COEF,
          };
          const theirNewVel = {
            x:
              normalizedDisplacementVectorMeMinusPeer.x * RESOLVE_VEL_COEF * -1,
            y:
              normalizedDisplacementVectorMeMinusPeer.y * RESOLVE_VEL_COEF * -1,
          };

          //
          // don't send message to myself; act upon it immediately
          //
          
          // const currAnimStateName = this.playerController?.getStateName() as string;
          // if (currAnimStateName != 'bump') {
          //     const myForce: Phaser.Math.Vector2 = new Phaser.Math.Vector2(myNewVel.x / 100, myNewVel.y / 100);
          //     this.playerController?.applyForce(myForce);
          //     this.playerController?.setAnimState('bump');
          //     // this.playerController?.setVelocity(myNewVel.x, myNewVel.y);
          // }
          // this.playerController?.setAnimState('bump');
          this.playerController?.setVelocity(myNewVel.x, myNewVel.y);

          //
          // put the peer resolution message in their mailbox
          //
          const resolveThemMessage: resolutionMessageLite = {
            messageID: Date.now() * peerClientID, // this messageID should be hash of things to guarantee uniqueness; NOTE: BYZANTINE FAULT VULNERABLE!
            update: theirNewVel,
            isVelocityBased: true,
          };
          this.crdt.addResolutionMessageToPeerMessageQueue(
            peerClientID,
            resolveThemMessage,
          );
        }
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

  sendMessage(content: string) {
    if (content.length === 0) {
      return;
    }

    const text = {
      text: content,
      timestamp: this.time.now,
    };

    this.crdt.setText(text);
    this.crdt.setChatHistoryRemote(text);
    this.chatHistoryLocal.push(content);

    this.playerController?.chat(content);
  }

  private initPeer(username: string = ""): CharacterController {
    let penguin = this.matter.add.sprite(0, 0, "penquin").setFixedRotation();

    penguin.setCollisionGroup(-1);

    return new CharacterController(this, penguin, this.obstacles, username);
  }

  private informPeerPresence(username: string, presence: PEER_PRESENCE) {
    console.log(`${username} ${presence}`);
  }
}
