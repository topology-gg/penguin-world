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

  private dialogue: InputText | undefined;
  private username = "";
  private messageText: InputText | undefined;
  private inputText: InputText | undefined;

  private connectionContainers: connectionContainer[] = [];
  private peers: Connection[] = [];

  private initializeConnectionBtn: DefaultButton;
  private respondToConnectionBtn: DefaultButton;

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
          this.scene.start('platformer', {
            "peers" : this.peers
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

  
  renderConnectButton(is_initiator: boolean) {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Connect",
        (config.scale.width / 4) * 2,
        config.scale.height / 2 + 200 + 300 * this.connectionContainers.length,
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
          this.renderConnectInitiator();
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
          this.renderConnection();
        }
      )
    );

    return connectButton;
  }

  
  renderConnectInitiator() {
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
      config.scale.height / 2 + 300 * this.connectionContainers.length,
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
      config.scale.height / 2 + 100 + 300 * this.connectionContainers.length,
      500,
      50,
      otherIdFieldConfig
    );

    this.add.existing(otherId);

    let connectButton = this.renderConnectButton(true);

    this.connectionContainers.push({
      yourId,
      otherId,
      connectButton,
    });

    this.initializePeer(true)
  }

  renderConnection() {
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
      config.scale.height / 2 + 300 * this.connectionContainers.length,
      500,
      50,
      otherIdFieldConfig
    );

    this.add.existing(otherId);

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
      config.scale.height / 2 + 100 + 300 * this.connectionContainers.length,
      500,
      50,
      yourIdFieldConfig
    );
    this.add.existing(yourId);

    let connectButton = this.renderConnectButton(false);

    this.connectionContainers.push({
      yourId,
      otherId,
      connectButton,
    });

    this.initializePeer(false)
  }

  initializePeer(is_initiator: boolean) {
    var peer = new Peer({
      initiator: is_initiator,
      trickle: false,
    });

    let username = this.username;
    let index = this.peers.length;
    let connectionContainer = this.connectionContainers[index];

    console.log(username)
    peer.on("signal", function (data) {
      //@ts-ignore
      data.username = username;
      console.log(`signal ${data}`)

      connectionContainer.yourId.setText(JSON.stringify(data));
    });

    let connection : Connection = {
      peer : peer,
      username : ""
    }

    this.peers.push(connection)
        
  }


  connect(index : number){
    console.log(index)
    console.log(this.peers)
    let selectedPeer = this.peers[index];
    let connectionContainer = this.connectionContainers[index];
    let peerUsername = this.peers[index].username;
    
    selectedPeer.peer.signal(connectionContainer.otherId.text)
  }
}
