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

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isTouching: boolean = false;
  private moveDirection: "left" | "right" | null = null;
  private jump: boolean = false;
  private moveEvent: Phaser.Time.TimerEvent | null = null;

  private jumpThreshold: number = 100;

  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.Physics.Matter.Sprite,
    cursors: CursorKeys,
    obstacles: ObstaclesController,
    username: string,
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
        padding: { x: 0, y: 5 },
      },
    );
    this.username = scene.add.text(
      sprite.x + USERNAME_X_OFFSET,
      sprite.y + USERNAME_Y_OFFSET,
      username,
      {
        color: "#F9DE04",
        fixedWidth: 150,
        align: "center",
      },
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
      .addState("bump", {
        onEnter: this.bumpOnEnter,
        onUpdate: this.bumpOnUpdate,
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

        const characterBottom = Math.floor(
          this.sprite.body.position.y - this.sprite.height / 2,
        );

        const characterLeft =
          this.sprite.body.position.x - this.sprite.width / 2;
        const characterRight =
          this.sprite.body.position.x + this.sprite.width / 2;

        const tileTop = body.position.y - gameObject.tile.height / 2;
        const tileLeft = body.position.x - gameObject.tile.width / 2;
        const tileRight = body.position.x + gameObject.tile.width / 2;

        const characterAboveTile =
          characterBottom <= tileTop && this.sprite.body.velocity.y >= 0;
        const characterLeftOfTile = characterRight - 10 <= tileLeft;
        const characterRightOfTile = characterLeft + 10 >= tileRight;

        if (
          (this.stateMachine.isCurrentState("jump") ||
            this.stateMachine.isCurrentState("bump")) &&
          (characterAboveTile || characterLeftOfTile || characterRightOfTile)
        ) {
          this.stateMachine.setState("idle");
        }
        return;
      }
      if (gameObject.snowballId) {
        this.scene.events.emit("hit", gameObject.snowballId);
      }
    });

    // Add touch input handlers
    this.scene.input.on("pointerdown", this.handlePointerDown, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.on("pointerup", this.handlePointerUp, this);
  }

  setJumpThreshold(threshold: number) {
    this.jumpThreshold = threshold;
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
    if (
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.isTouching
    ) {
      this.stateMachine.setState("walk");
    }

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    if (spaceJustPressed || this.jump) {
      this.stateMachine.setState("jump");
    }

    const fJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.f);
    if (fJustPressed) {
      this.throwSnowball();
    }
  }

  //
  // Walk state handling
  //
  private walkOnEnter() {
    this.sprite.play("player-walk");
  }

  private walkOnUpdate() {
    const baseSpeed = 5;

    if (this.isTouching) {
      const pointer = this.scene.input.activePointer;
      const deltaX = pointer.x - this.touchStartX;
      const velocityX = Phaser.Math.Clamp(deltaX / 10, -baseSpeed, baseSpeed);

      if (velocityX < 0) {
        this.sprite.flipX = true;
      } else if (velocityX > 0) {
        this.sprite.flipX = false;
      }

      this.sprite.setVelocityX(velocityX);
    } else {
      if (this.cursors.left.isDown) {
        this.sprite.flipX = true;
        this.sprite.setVelocityX(-baseSpeed);
      } else if (this.cursors.right.isDown) {
        this.sprite.flipX = false;
        this.sprite.setVelocityX(baseSpeed);
      } else {
        this.sprite.setVelocityX(0);
        this.stateMachine.setState("idle");
      }
    }

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);

    if (spaceJustPressed || this.jump) {
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

  //
  // Jump state handling
  //
  private jumpOnEnter() {
    this.sprite.play("player-jump");
    this.sprite.setVelocityY(-12);
  }

  private throwSnowball() {
    const facingLeft = this.sprite.flipX;

    const positionAdjust = facingLeft
      ? -10 - this.sprite.width / 2
      : 10 + this.sprite.width / 2;
    const position = new Phaser.Math.Vector2(
      this.sprite.x + positionAdjust,
      this.sprite.y,
    );
    const velocityX = facingLeft ? -20 : 20;

    this.scene.events.emit("throw", position, velocityX);
  }

  private jumpOnUpdate() {
    const baseSpeed = 5;

    if (this.isTouching) {
      const pointer = this.scene.input.activePointer;
      const deltaX = pointer.x - this.touchStartX;
      const velocityX = Phaser.Math.Clamp(deltaX / 10, -baseSpeed, baseSpeed);

      if (velocityX < 0) {
        this.sprite.flipX = true;
      } else if (velocityX > 0) {
        this.sprite.flipX = false;
      }

      this.sprite.setVelocityX(velocityX);
    } else {
      if (this.cursors.left.isDown) {
        this.sprite.flipX = true;
        this.sprite.setVelocityX(-baseSpeed);
      } else if (this.cursors.right.isDown) {
        this.sprite.flipX = false;
        this.sprite.setVelocityX(baseSpeed);
      } else {
        this.sprite.setVelocityX(0);
        this.stateMachine.setState("idle");
      }
    }

    const fJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.f);
    if (fJustPressed) {
      this.throwSnowball();
    }
  }

  //
  // Bump state handling
  //
  private bumpOnEnter() {
    this.sprite.play("player-bump");
  }
  private bumpOnUpdate() {
    // do not accept user input
  }

  private createAnimations() {
    this.sprite.anims.create({
      key: "player-idle",
      frames: [{ key: "penquin", frame: "penguin_walk01.png" }],
    });

    this.sprite.anims.create({
      key: "player-bump",
      frames: [{ key: "penquin", frame: "penguin_hurt.png" }],
    });
    this.sprite.anims.create({
      key: "player-jump",
      frames: [{ key: "penquin", frame: "penguin_jump02.png" }],
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

  handlePointerDown(pointer: Phaser.Input.Pointer) {
    const emoteButtons = this.scene.children.list.filter(
      (child) => child.type === "Text" && child.input && child.input.enabled,
    );

    const isEmoteButtonPressed = emoteButtons.some((button) =>
      Phaser.Geom.Rectangle.Contains(
        button.getBounds(),
        pointer.x,
        pointer.y,
      ),
    );

    if (isEmoteButtonPressed) {
      return;
    }

    this.touchStartX = pointer.x;
    this.touchStartY = pointer.y;
    this.isTouching = true;

    this.moveEvent = this.scene.time.addEvent({
      delay: 50,
      callback: this.updateMovement,
      callbackScope: this,
      loop: true,
    });
  }

  handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isTouching) {
      return;
    }

    const deltaX = pointer.x - this.touchStartX;
    const deltaY = this.touchStartY - pointer.y;

    if (deltaX < 0) {
      this.moveDirection = "left";
    } else if (deltaX > 0) {
      this.moveDirection = "right";
    }

    this.jump = deltaY > this.jumpThreshold;
  }

  handlePointerUp() {
    this.isTouching = false;
    this.moveDirection = null;
    this.jump = false;
    this.sprite.setVelocityX(0);
    this.stateMachine.setState("idle");

    if (this.moveEvent) {
      this.moveEvent.remove(false);
      this.moveEvent = null;
    }
  }

  updateMovement() {
    const maxSpeed = 10;

    if (this.moveDirection === "left") {
      const speed = Phaser.Math.Clamp(
        (-maxSpeed * (this.touchStartX - this.scene.input.activePointer.x)) /
          10,
        -maxSpeed,
        maxSpeed,
      );
      this.sprite.flipX = true;
      this.sprite.setVelocityX(speed);
    } else if (this.moveDirection === "right") {
      const speed = Phaser.Math.Clamp(
        (maxSpeed * (this.scene.input.activePointer.x - this.touchStartX)) / 10,
        -maxSpeed,
        maxSpeed,
      );
      this.sprite.flipX = false;
      this.sprite.setVelocityX(speed);
    }

    if (this.jump) {
      this.stateMachine.setState("jump");
    }
  }

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

  setAnimState(name: string) {
    this.stateMachine.setState(name);
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
