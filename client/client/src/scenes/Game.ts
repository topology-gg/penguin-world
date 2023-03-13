import Phaser from "phaser";
import DefaultButton from "../ui-components/defaultButton";
import config from "../config";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import Peer from "simple-peer";
import { Connection } from "./types";

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

  private connectionContainers: connectionContainer[] = [];
  private peers: Connection[] = [];

  //private scene : Phaser.Scene
  preload() {}

  create() {
    this.renderAcceptButton();
    this.renderWelcomeMessage();
    this.renderInputText();
    this.renderPlatformerButton();
  }
  renderPlatformerButton() {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Enter Platformer",
        (config.scale.width / 4) * 2,
        config.scale.height / 4 - 100,
        config.scale.width / 4 - 10,
        "large",
        () => {
          this.scene.start("platformer", {
            peers: this.peers,
            username: this.username,
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
            this.renderInitializeConnectButton();
            this.renderRespondToConnectButton();
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
          let index = this.peers.length;
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

  initializePeer(is_initiator: boolean) {
    var peer = new Peer({
      initiator: is_initiator,
      trickle: false,
    });

    let username = this.username;
    let index = this.peers.length;
    let connectionContainer = this.connectionContainers[index];

    console.log(username);
    peer.on("signal", function (data) {
      //@ts-ignore
      data.username = username;
      console.log(`signal ${data}`);

      connectionContainer.yourId.setText(JSON.stringify(data));
    });

    let connection: Connection = {
      peer: peer,
      username: "",
    };

    this.peers.push(connection);
  }

  connect(index: number) {
    let selectedPeer = this.peers[index];
    let connectionContainer = this.connectionContainers[index];

    this.peers[index].username = JSON.parse(
      connectionContainer.otherId.text
    ).username;
    console.log("username " + this.peers[index].username);
    selectedPeer.peer.signal(connectionContainer.otherId.text);
  }
}
