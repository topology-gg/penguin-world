import Phaser from "phaser";
import { InputContent, SimulatedCursor } from "../scenes/types";
import StateMachine from "../utils/StateMachine";
import ObstaclesController from "./ObstaclesController";



const initCursor: SimulatedCursor = {
  left: {
    isDown: false,
  },
  right: {
    isDown: false,
  },
  space: false,
};
//CharacterController and PlayerController should share a base class
export default class CharacterController {
  private scene: Phaser.Scene;
  private sprite: Phaser.Physics.Matter.Sprite;

  private obstacles: ObstaclesController;

  private stateMachine: StateMachine;
  private cursors: SimulatedCursor;

  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.Physics.Matter.Sprite,
    obstacles: ObstaclesController,
    username: string
  ) {
    this.scene = scene;
    this.sprite = sprite;
    this.obstacles = obstacles;
    this.cursors = initCursor;
    
    this.createAnimations();

    this.stateMachine = new StateMachine(this, username);

    this.stateMachine
      .addState("idle", {
        onEnter: this.idleOnEnter,
        onUpdate: this.idleOnUpdate,
      })
      .addState("walk", {
        onEnter: this.walkOnEnter,
        onUpdate: this.walkOnUpdate,
        onExit: this.walkOnExit,
      })
      .addState("jump", {
        onEnter: this.jumpOnEnter,
        onUpdate: this.jumpOnUpdate,
      })
      .setState("idle");

    this.sprite.setOnCollide((data: MatterJS.ICollisionPair) => {
      const body = data.bodyB as MatterJS.BodyType;

      const gameObject = body.gameObject;

      if (!gameObject) {
        return;
      }

      if (gameObject instanceof Phaser.Physics.Matter.TileBody) {
        if (this.stateMachine.isCurrentState("jump")) {
          this.stateMachine.setState("idle");
        }
        return;
      }
    });
  }

  update(dt: number) {
    this.stateMachine.update(dt);
  }

  replaceSprite(sprite: Phaser.Physics.Matter.Sprite) {
    this.sprite = sprite;
  }
  private idleOnEnter() {
    //console.log(this.sprite)
    //this.sprite.play('player-idle')
  }

  private idleOnUpdate() {
    if (this.cursors.left.isDown || this.cursors.right.isDown) {
      this.stateMachine.setState("walk");
    }

    const spaceJustPressed = this.cursors.space;
    if (spaceJustPressed) {
      this.stateMachine.setState("jump");
    }
  }

  private walkOnEnter() {
    this.sprite.play('player-walk')
  }

  private walkOnUpdate() {
    const speed = 5;

    if (this.cursors.left.isDown) {
      this.sprite.flipX = true;
      this.sprite.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.sprite.flipX = false;
      this.sprite.setVelocityX(speed);
    } else {
      this.sprite.setVelocityX(0);
      this.stateMachine.setState("idle");
    }

    const spaceJustPressed = this.cursors.space;
    if (spaceJustPressed) {
        console.log("peer jump")
      this.stateMachine.setState("jump");
    }
  }

  private walkOnExit() {
    this.sprite.stop();
  }

  private jumpOnEnter() {
    this.sprite.setVelocityY(-12);
  }

  private jumpOnUpdate() {
    const speed = 5;

    if (this.cursors.left.isDown) {
      this.sprite.flipX = true;
      this.sprite.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.sprite.flipX = false;
      this.sprite.setVelocityX(speed);
    }
  }

  private createAnimations() {
    this.sprite.anims.create({
      key: "player-idle",
      frames: [{ key: "penquin", frame: "penguin_walk01.png" }],
    });

    this.sprite.anims.create({
      key: "player-walk",
      frameRate: 10,
      frames: this.sprite.anims.generateFrameNames("penquin", {
        start: 1,
        end: 4,
        prefix: "penguin_walk0",
        suffix: ".png",
      }),
      repeat: -1,
    });

    this.sprite.anims.create({
      key: "player-death",
      frames: this.sprite.anims.generateFrameNames("penquin", {
        start: 1,
        end: 4,
        prefix: "penguin_die",
        zeroPad: 2,
        suffix: ".png",
      }),
      frameRate: 10,
    });

  }

  simulateInput(input: InputContent) {

    console.log(input)
    this.cursors = input.cursor
    this.stateMachine.setState(input.input)
    this.update(input.dt)


  }
}
