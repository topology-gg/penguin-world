import Phaser from "phaser";
import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import config from "../config";
import CRDT from "../networking/crdt";
import Media from "../networking/media";
import DefaultButton from "../ui-components/defaultButton";

export default class Demo extends Phaser.Scene {
  private username = "";
  private inputText: InputText | undefined;
  private lobbyInputText: InputText | undefined;
  private removeSignalEvent: any = () => {};

  constructor() {
    super("GameScene");
  }

  preload() {}

  create() {
    this.renderWelcomeMessage();
    this.renderInputText();
    this.renderLobbyInputText();
    this.renderPlatformerButton();
  }

  renderPlatformerButton() {
    var connectButton = this.add.existing(
      new DefaultButton(
        this,
        "Connect",
        (config.scale.width / 4) * 2,
        config.scale.height / 2 + 50,
        config.scale.width / 4 - 10,
        "large",
        () => {
          this.username = this.inputText?.text || "";
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
        },
      ),
    );

    return connectButton;
  }

  renderWelcomeMessage() {
    var welcomeMessageConfig: IText.IConfig = {
      text: "Welcome to esotere",
      color: "white",
      border: 1,
      readOnly: true,
      align: "center",
      fontSize: "50px",
    };
    var welcomeMessage = new InputText(
      this,
      (config.scale.width / 4) * 2,
      config.scale.height / 2 - 200,
      500,
      50,
      welcomeMessageConfig,
    );
    this.add.existing(welcomeMessage);
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
      inputTextConfig,
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
      config.scale.height / 2 - 25,
      500,
      50,
      lobbyInputTextConfig,
    );

    this.add.existing(lobbyInputText);

    // Set our lobby input text as a member object
    this.lobbyInputText = lobbyInputText;
  }
}
