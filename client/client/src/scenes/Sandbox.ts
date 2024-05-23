import Phaser from "phaser";
import Whiteboard from "../gameObjects/whiteboard";

export default class Sandbox extends Phaser.Scene {
  constructor() {
    super("Sandbox");
  }

  preload() {}

  create() {


    this.add.existing(new Whiteboard(this, 400, 400, 800, true, () => {}))
  }

}
