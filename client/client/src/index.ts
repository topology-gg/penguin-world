import Phaser from 'phaser';
import config from './config';
import GameScene from './scenes/Game';
import PlatformerScene from "./scenes/PlatformerScene";
new Phaser.Game(
  Object.assign(config, {
    scene: [GameScene, PlatformerScene]
  })
);
