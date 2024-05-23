import InputText from "phaser3-rex-plugins/plugins/inputtext";
import DefaultButton from "../ui-components/defaultButton";
import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import config from "../config";

export default class Whiteboard {
  private _scene: Phaser.Scene;

  private initializeWhiteboardBtn: DefaultButton;

  private shareInput: InputText;

  private shareSession: any = () => {};

  private whiteboardLink: string = "https://excalidraw.com";

  private whiteboard: Phaser.GameObjects.DOMElement;

  private player: Phaser.Physics.Matter.Sprite;

  private x;
  private y;
  private width;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    is_initializing: boolean,
    shareCallback: any,
    player: Phaser.Physics.Matter.Sprite
  ) {
    this._scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    //create background
    this.renderBackground(x, y, width);
    this.shareSession = shareCallback;
    this.player = player;
    this.initializeWhiteboardBtn = this.renderInitializeBtn(x, y, width);
    this.fullScreenButton = this.renderFullScreenButton(
      x + width / 2 + width / 16,
      y - width / 4,
      width / 8
    );
    if (is_initializing) {
      this.shareButton = this.renderShareBtn(
        x + width / 2,
        y + y / 1.5 + 40,
        width / 8
      );
      this.shareInput = this.renderShareInput(
        x + width / 2,
        y + y / 1.5 + 40,
        width / 8
      );
    }
  }

  renderBackground(x: number, y: number, width: number) {
    this.background = (this._scene.add as any).rexRoundRectangle({
      x: x,
      y: y,
      width: width,
      height: width / 1.5,
      color: 0x121212,
      radius: 10,
      strokeColor: 0xf34c0b,
      strokeWidth: 1,
    });
  }

  setWhiteboardLink(link : string){
    this.whiteboardLink = link
    this.initializeWhiteboardBtn.setText("Collaborate")
  }
  initializeWhiteboard(x: number, y: number, width: number) {
    this.whiteboard?.destroy()
    this.whiteboard = this._scene.add
      .dom(x, y)
      .createFromHTML(
        `<iframe width="${width}" height="${width / 1.5}" src="${
          this.whiteboardLink
        }" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      );
  }

  renderInitializeBtn(x: number, y: number, width: number) {
    return this._scene.add.existing(
      new DefaultButton(
        this._scene,
        "whiteboard",
        x,
        y,
        width - width / 8,
        "small",
        () => {
          this.initializeWhiteboard(x, y, width);
        }
      )
    );
  }

  renderShareBtn(x: number, y: number, width: number) {
    return this._scene.add.existing(
      new DefaultButton(
        this._scene,
        "share",
        x,
        y,
        width - width / 8,
        "small",
        () => {
          this.shareSession(this.shareInput.text);
          this.whiteboardLink = this.shareInput.text;
          this.shareInput.setText("Sent");
        }
      )
    );
  }

  renderShareInput(x: number, y: number, width: number) {
    var inputTextConfig: IText.IConfig = {
      text: "",
      color: "black",
      border: 1,
      backgroundColor: "white",
    };

    var inputText = new InputText(
      this._scene,
      x - width,
      y,
      width - width / 8,
      50,
      inputTextConfig
    );
    return this._scene.add.existing(inputText);
  }

  renderFullScreenButton(x: number, y: number, width: number) {
    return this._scene.add.existing(
      new DefaultButton(
        this._scene,
        "fullscreen",
        x,
        y,
        width - width / 8,
        "small",
        () => {
          this.initializeWhiteboard(x, y, config.scale.width * 0.85);
          this.focusOnWhiteboard();
        }
      )
    );
  }

  renderExitScreenButton() {
    return this._scene.add.existing(
      new DefaultButton(
        this._scene,
        "exit",
        this.whiteboard.x + config.scale.width / 2 - 100,
         this.whiteboard.y,
        200,
        "small",
        () => {
          this.initializeWhiteboard(this.x, this.y, this.width);
          this._scene.cameras.main.startFollow(this.player, true);
        }
      )
    );
  }

  focusOnWhiteboard() {
    this._scene.cameras.main.stopFollow();
    this._scene.cameras.main.centerOn(this.whiteboard.x, this.whiteboard.y);

    this.renderExitScreenButton();
  }
}
