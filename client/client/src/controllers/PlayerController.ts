import Phaser from "phaser";
import StateMachine from "../utils/StateMachine";
import { USERNAME_X_OFFSET, USERNAME_Y_OFFSET } from "../utils/constants";
import ObstaclesController from "./ObstaclesController";

type CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys;

export default class PlayerController {
  private scene: Phaser.Scene;
  private sprite: Phaser.Physics.Matter.Sprite;
  private cursors: CursorKeys;
  private obstacles: ObstaclesController;
  private username: Phaser.GameObjects.Text;

  private stateMachine: StateMachine;

  private speechText: Phaser.GameObjects.Text;

  private chatTimeoutID: any;
  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.Physics.Matter.Sprite,
    cursors: CursorKeys,
    obstacles: ObstaclesController,
    username: string
  ) {
    this.scene = scene;
    this.sprite = sprite;
    this.cursors = cursors;
    this.obstacles = obstacles;

    this.createAnimations();

    this.stateMachine = new StateMachine(this, "player");

    this.speechText = scene.add.text(
      sprite.x + USERNAME_X_OFFSET - 25,
      sprite.y + USERNAME_Y_OFFSET - 25,
      ""
    );
    this.username = scene.add.text(
      sprite.x - username.length / 2 + USERNAME_X_OFFSET,
      sprite.y + USERNAME_Y_OFFSET,
      username,
      {
        color: "#F9DE04",
      }
    );

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

  chat(input: string) {
    clearTimeout(this.chatTimeoutID);
    this.speechText.text = input;
    this.chatTimeoutID = setTimeout(() => {
      this.speechText.text = "";
    }, 5 * 1000);
  }

  update(dt: number, shouldUpdateState: boolean | undefined) {
    let res: string | undefined;

    if (shouldUpdateState === true) {
      res = this.stateMachine.update(dt);
    } else {
      res = this.stateMachine.getCurrentStateName();
    }

    this.username.x =
      this.sprite.body.position.x - this.username.width / 2 + USERNAME_X_OFFSET;
    this.username.y = this.sprite.body.position.y + USERNAME_Y_OFFSET;

    this.speechText.x =
      this.sprite.body.position.x -
      this.speechText.width / 2 +
      USERNAME_X_OFFSET;
    this.speechText.y = this.sprite.body.position.y + USERNAME_Y_OFFSET - 25;

    return res;
  }

  private idleOnEnter() {
    this.sprite.play("player-idle");
  }

  private idleOnUpdate() {
    if (this.cursors.left.isDown || this.cursors.right.isDown) {
      this.stateMachine.setState("walk");
    }

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    if (spaceJustPressed) {
      this.stateMachine.setState("jump");
    }
  }

  private walkOnEnter() {
    this.sprite.play("player-walk");
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

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    if (spaceJustPressed) {
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

  // to share state with peers
  getStateName() {
    return this.stateMachine.getCurrentStateName();
  }

  getPosition() {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
    };
  }

  serializeCursor() {
    return {
      left: {
        isDown: this.cursors.left.isDown,
      },
      right: {
        isDown: this.cursors.right.isDown,
      },
      space: this.cursors.space.isDown,
    };
  }
}
