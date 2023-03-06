import Phaser from "phaser";
import RexUIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import RoundRectanglePlugin from "phaser3-rex-plugins/plugins/roundrectangle-plugin.js";
import ButtonPlugin from "phaser3-rex-plugins/plugins/button-plugin.js";
import InputTextPlugin from 'phaser3-rex-plugins/plugins/inputtext-plugin.js'

export default {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#111",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  dom: {
    createContainer: true
},     
  physics: {
		default: 'matter',
		matter: {
			debug: true
		}
	},
  plugins: {
    scene: [
      {
        key: "rexUI",
        plugin: RexUIPlugin,
        mapping: "rexUI",
      },
    ],
    global: [
      {
        key: "rexRoundRectanglePlugin",
        plugin: RoundRectanglePlugin,
        start: true,
      },
      {
        key: "rexButton",
        plugin: ButtonPlugin,
        start: true,
      },
      {
        key: 'rexInputTextPlugin',
        plugin: InputTextPlugin,
        start: true
    }
    ],
  },
};
