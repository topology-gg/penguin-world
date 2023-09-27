import Phaser from "phaser";
import StateMachine from "../utils/StateMachine";
import {
  TEXT_CHAT_X_OFFSET,
  TEXT_CHAT_Y_OFFSET,
  USERNAME_X_OFFSET,
  USERNAME_Y_OFFSET,
} from "../utils/constants";
import ObstaclesController from "./ObstaclesController";
import { CursorKeys } from "../scenes/types";

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
      sprite.x + TEXT_CHAT_X_OFFSET,
      sprite.y + TEXT_CHAT_Y_OFFSET,
      "",
      {
        wordWrap: {
          width: 300,
          useAdvancedWrap: true,
        },
        align: "center",
        maxLines: 5,
      }
    );
    this.username = scene.add.text(
      sprite.x + USERNAME_X_OFFSET,
      sprite.y + USERNAME_Y_OFFSET,
      username,
      {
        color: "#F9DE04",
        fixedWidth: 150,
        align: "center",
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
        // show coordinates of both objects
        
        const characterBottom = Math.floor(this.sprite.body.position.y - this.sprite.height / 2);

        const characterLeft = this.sprite.body.position.x - this.sprite.width / 2;
        const characterRight = this.sprite.body.position.x + this.sprite.width / 2;        

        const tileTop = body.position.y - gameObject.tile.height / 2;
        const tileLeft = body.position.x - gameObject.tile.width / 2;
        const tileRight = body.position.x + gameObject.tile.width / 2;

        const characterAboveTile = characterBottom <= tileTop && this.sprite.body.velocity.y >= 0
        const characterLeftOfTile = characterRight - 10 <= tileLeft
        const characterRightOfTile = characterLeft + 10 >= tileRight

        if (this.stateMachine.isCurrentState("jump") && (characterAboveTile || characterLeftOfTile || characterRightOfTile)) {
          this.stateMachine.setState("idle");
        }
        return;
      }
      if(gameObject.snowballId) {
        this.scene.events.emit("hit", gameObject.snowballId)
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
      TEXT_CHAT_X_OFFSET;
    this.speechText.y =
      this.sprite.body.position.y - this.speechText.height + TEXT_CHAT_Y_OFFSET;

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

    const fJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.f);
    if (fJustPressed) {
      this.throwSnowball();
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

    const fJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.f);
    if (fJustPressed) {
      this.throwSnowball();
    }
  }



  private walkOnExit() {
    this.sprite.stop();
  }

  private jumpOnEnter() {
    this.sprite.setVelocityY(-12);
  }

  private throwSnowball() {
    const facingLeft = this.sprite.flipX;

    const positionAdjust = facingLeft
      ? -10 - this.sprite.width / 2
      : 10 + this.sprite.width / 2;
    const position = new Phaser.Math.Vector2(
      this.sprite.x + positionAdjust,
      this.sprite.y
    );
    const velocityX = facingLeft ? -20 : 20;

    this.scene.events.emit("throw", position, velocityX);
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

    const fJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.f);
    if (fJustPressed) {
      this.throwSnowball();
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

  setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
  }

  //   getVelocity() {
  //     return this.sprite.
  //   }

  setVelocity(vx: number, vy: number) {
    this.sprite.setVelocity(vx, vy);
  }
  applyForce(force: Phaser.Math.Vector2) {
    this.sprite.applyForce(force);
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
      f: this.cursors.f.isDown,
    };
  }
}
