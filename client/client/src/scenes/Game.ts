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
  private prevConnectionBtn: DefaultButton;
  private nextConnectionBtn: DefaultButton;

  private connectionIndex: number = 0;

  private dialogue: InputText | undefined;
  private username = "";
  private inputText: InputText | undefined;
  private lobbyInputText: InputText | undefined;

  private connectionContainers: connectionContainer[] = [];

  private removeSignalEvent: any = () => {};

  //private scene : Phaser.Scene
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
      text: "Welcome to esotere \n Select your username",
      color: "black",
      border: 1,
      backgroundColor: "white",
      readOnly: true,
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
    };
    var inputText = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 - 100,
      500,
      50,
      inputTextConfig
    );
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
    this.add.existing(lobbyInputText);

    // Set our lobby input text as a member object
    this.lobbyInputText = lobbyInputText;
  }

  renderAcceptButton() {
    this._connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Enter username",
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

  incrementConnectionIndex() {
    this.connectionContainers[this.connectionIndex].yourId.setVisible(false);
    this.connectionContainers[this.connectionIndex].otherId.setVisible(false);
    this.connectionContainers[this.connectionIndex].connectButton.setVisible(
      false
    );
    this.connectionIndex++;
    if (this.connectionIndex >= this.connectionContainers.length - 1) {
      this.nextConnectionBtn.disable();
    }
    this.prevConnectionBtn.enable();
    this.connectionContainers[this.connectionIndex].yourId.setVisible(true);
    this.connectionContainers[this.connectionIndex].otherId.setVisible(true);
    this.connectionContainers[this.connectionIndex].connectButton.setVisible(
      true
    );
  }

  decrementConnectionIndex() {
    this.connectionContainers[this.connectionIndex].yourId.setVisible(false);
    this.connectionContainers[this.connectionIndex].otherId.setVisible(false);
    this.connectionContainers[this.connectionIndex].connectButton.setVisible(
      false
    );
    this.connectionIndex--;
    if (this.connectionIndex <= 0) {
      this.prevConnectionBtn.disable();
    }
    this.nextConnectionBtn.enable();
    this.connectionContainers[this.connectionIndex].yourId.setVisible(true);
    this.connectionContainers[this.connectionIndex].otherId.setVisible(true);
    this.connectionContainers[this.connectionIndex].connectButton.setVisible(
      true
    );
  }

  renderConnectionScrollButtons() {
    this.prevConnectionBtn = this.add.existing(
      new DefaultButton(
        this,
        "Prev",
        (config.scale.width / 6) * 2,
        config.scale.height / 2 + 200,
        config.scale.width / 16 - 10,
        "large",
        () => this.decrementConnectionIndex()
      )
    );

    this.nextConnectionBtn = this.add.existing(
      new DefaultButton(
        this,
        "Next",
        (config.scale.width / 6) * 4,
        config.scale.height / 2 + 200,
        config.scale.width / 16 - 10,
        "large",
        () => this.incrementConnectionIndex()
      )
    );

    this.prevConnectionBtn.disable();
    this.nextConnectionBtn.disable();
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

  renderConnection(is_initiator: boolean) {
    var yourIdFieldConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "white",
      readOnly: true,
    };
    var yourId = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 + (is_initiator ? 0 : 100),
      500,
      50,
      yourIdFieldConfig
    );
    this.add.existing(yourId);

    var otherIdFieldConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "white",
      readOnly: false,
      placeholder: "paste your peers id here",
    };
    var otherId = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 + (is_initiator ? 100 : 0),
      500,
      50,
      otherIdFieldConfig
    );

    this.add.existing(otherId);

    let connectButton = this.renderConnectButton();

    if (
      this.prevConnectionBtn == undefined ||
      this.nextConnectionBtn == undefined
    ) {
      this.renderConnectionScrollButtons();
    }

    if (
      this.connectionContainers.length == 1 ||
      this.connectionContainers.length >= this.connectionIndex
    ) {
      this.nextConnectionBtn.enable();
    }

    if (this.connectionContainers.length > 0) {
      yourId.setVisible(false);
      otherId.setVisible(false);
      connectButton.setVisible(false);
    }

    this.connectionContainers.push({
      yourId,
      otherId,
      connectButton,
    });

    this.initializePeer(is_initiator);
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
