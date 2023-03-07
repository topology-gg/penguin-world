import Phaser from 'phaser';
import config from './config';
import GameScene from './scenes/Game';
import PlatformerScene from "./scenes/PlatformerScene";


console.log(process.nextTick)
console.log(process.env)
console.log(window.process.nextTick)
new Phaser.Game(
  Object.assign(config, {
    scene: [GameScene, PlatformerScene]
  })
);
