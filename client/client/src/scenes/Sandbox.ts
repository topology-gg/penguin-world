import Phaser from "phaser";
import DefaultButton from "../ui-components/defaultButton";
import config from "../config";
import InputText from "phaser3-rex-plugins/plugins/inputtext.js";
import IText from "phaser3-rex-plugins/plugins/gameobjects/dom/inputtext/InputText";
import Peer from "simple-peer";
import { Connection, PeerInfo } from "./types";
import Whiteboard from "../gameObjects/whiteboard";

interface connectionContainer {
  yourId: IText;
  otherId: IText;
  connectButton: DefaultButton;
}

export default class Sandbox extends Phaser.Scene {
  constructor() {
    super("Sandbox");
  }

  preload() {}

  create() {


    this.add.existing(new Whiteboard(this, 400, 400, 800, true, () => {}))
  }

}
