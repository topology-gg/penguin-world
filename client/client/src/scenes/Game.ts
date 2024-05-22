import Phaser from "phaser";
import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import config from "../config";
import CRDT from "../networking/crdt";
import Media from "../networking/media";
import DefaultButton from "../ui-components/defaultButton";
import { PeerInfo } from "./types";

interface connectionContainer {
  yourId: IText;
  otherId: IText;
  connectButton: DefaultButton;
}

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  private _connectButton: DefaultButton;

  private dialogue: InputText | undefined;
  private username = "";
  private inputText: InputText | undefined;
  private lobbyInputText: InputText | undefined;

  private connectionContainers: connectionContainer[] = [];

  private removeSignalEvent: any = () => {};

  preload() {}

  create() {
    this.renderAcceptButton();
    this.renderWelcomeMessage();
    this.renderInputText();
    this.renderLobbyInputText();
  }
  renderPlatformerButton() {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Enter Platformer",
        (config.scale.width / 4) * 2,
        config.scale.height / 2 + 100,
        config.scale.width / 4 - 10,
        "large",
        () => {
          const lobbyName = this.lobbyInputText?.text || "";
          const crdt = new CRDT(lobbyName);
          const media = new Media(crdt.getClientID());

          this.removeSignalEvent();
          this.game.config.lobbyName = lobbyName;

          this.scene.start("platformer", {
            peers: this.game.config.connections.getConnections(),
            username: this.username,
            crdt: crdt,
            media: media,
          });
        }
      )
    );

    return connectButton;
  }

  renderWelcomeMessage() {
    var welcomeMessageConfig: IText.IConfig = {
      text: "Welcome to esotere",
      color: "black",
      border: 1,
      backgroundColor: "white",
      readOnly: true,
      align: "center",
    };
    var welcomeMessage = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 - 200,
      500,
      50,
      welcomeMessageConfig
    );
    this.add.existing(welcomeMessage);

    this.dialogue = welcomeMessage;
  }

  renderInputText() {
    var inputTextConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "white",
      placeholder: "Enter Username",
    };
    var inputText = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 - 100,
      500,
      50,
      inputTextConfig
    );
    inputText.setStyle("margin-top", "5px");

    this.add.existing(inputText);

    // Set our input text as a member object
    this.inputText = inputText;
  }

  renderLobbyInputText() {
    var lobbyInputTextConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "white",
      placeholder: "Enter Lobby Name",
    };
    var lobbyInputText = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 - 50,
      500,
      50,
      lobbyInputTextConfig
    );

    lobbyInputText.setStyle("margin-top", "5px");

    this.add.existing(lobbyInputText);

    // Set our lobby input text as a member object
    this.lobbyInputText = lobbyInputText;
  }

  renderAcceptButton() {
    this._connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Confirm",
        (config.scale.width / 4) * 2,
        config.scale.height / 2,
        config.scale.width / 4 - 10,
        "large",
        () => {
          let newUsername = this.inputText?.text || "";

          if (newUsername.length > 0) {
            this.username = newUsername;
            this.dialogue?.setText(`Username : ${newUsername}`);
            this._connectButton.destroy();
            this.inputText?.destroy();
            this.renderPlatformerButton();
          }
        }
      )
    );
  }

  renderConnectButton() {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Connect",
        (config.scale.width / 4) * 2,
        config.scale.height / 2 + 200,
        config.scale.width / 4 - 10,
        "large",
        () => {
          let index = this.connectionContainers.length;
          this.connect(index - 1);
        }
      )
    );

    return connectButton;
  }

  renderInitializeConnectButton() {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "+ Initialize Connection",
        (config.scale.width / 4) * 2 - 150,
        config.scale.height / 2 - 100,
        config.scale.width / 4 - 10,
        "large",
        () => {
          this.renderConnection(true);
        }
      )
    );

    return connectButton;
  }

  renderRespondToConnectButton() {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "+ Respond to Connection",
        (config.scale.width / 4) * 2 + 150,
        config.scale.height / 2 - 100,
        config.scale.width / 4 - 10,
        "large",
        () => {
          this.renderConnection(false);
        }
      )
    );

    return connectButton;
  }

  private attachSignalEvent({ peer, index }: PeerInfo) {
    let username = this.username;

    let connectionContainer = this.connectionContainers[index];

    function signalData(data: any) {
      //@ts-ignore
      data.username = username;

      if (connectionContainer.yourId.text.length == 0) {
        connectionContainer?.yourId?.setText(JSON.stringify(data));
      }
    }

    this.removeSignalEvent = () => peer.removeListener("signal", signalData);
    peer.on("signal", signalData);
  }

  initializePeer(is_initiator: boolean) {
    this.game.config.connections.initializePeer(
      is_initiator,
      true,
      // bind the Game scene object to the `this` keyword so it is accessible in the callback function
      this.attachSignalEvent.bind(this)
    );
  }

  connect(index: number) {
    console.log(this);
    let selectedPeer = this.game.config.connections.getConnectionByIndex(index);
    let connectionContainer = this.connectionContainers[index];

    let username = JSON.parse(connectionContainer.otherId.text).username;
    this.game.config.connections.updateUsername(index, username);
    selectedPeer.peer.signal(connectionContainer.otherId.text);
  }
}
