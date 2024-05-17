import Phaser from "phaser";
import StateMachine from "../utils/StateMachine";
import {
  TEXT_CHAT_X_OFFSET,
  TEXT_CHAT_Y_OFFSET,
  USERNAME_X_OFFSET,
  USERNAME_Y_OFFSET,
} from "../utils/constants";
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

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isTouching: boolean = false;
  private moveDirection: "left" | "right" | null = null;
  private jump: boolean = false;
  private moveEvent: Phaser.Time.TimerEvent | null = null;

  private jumpThreshold: number = 100; // Threshold for jumping

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
        if (this.stateMachine.isCurrentState("jump") || this.stateMachine.isCurrentState("bump")) {
          this.stateMachine.setState("idle");
        }
        return;
      }
    });

    // Add touch input handlers
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
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
    if (this.cursors.left.isDown || this.cursors.right.isDown || this.moveDirection) {
      this.stateMachine.setState("walk");
    }

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    if (spaceJustPressed || this.jump) {
      this.stateMachine.setState("jump");
    }
  }

  //
  // Walk state handling
  //
  private walkOnEnter() {
    this.sprite.play("player-walk");
  }

  private walkOnUpdate() {
    const speed = 5;

    if (this.cursors.left.isDown || this.moveDirection === "left") {
      this.sprite.flipX = true;
      this.sprite.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.moveDirection === "right") {
      this.sprite.flipX = false;
      this.sprite.setVelocityX(speed);
    } else {
      this.sprite.setVelocityX(0);
      this.stateMachine.setState("idle");
    }

    const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    if (spaceJustPressed || this.jump) {
      this.stateMachine.setState("jump");
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

  private jumpOnUpdate() {
    const speed = 5;

    if (this.cursors.left.isDown || this.moveDirection === "left") {
      this.sprite.flipX = true;
      this.sprite.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.moveDirection === "right") {
      this.sprite.flipX = false;
      this.sprite.setVelocityX(speed);
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

  handlePointerDown(pointer : Phaser.Input.Pointer) {
    this.touchStartX = pointer.x;
    this.touchStartY = pointer.y;
    this.isTouching = true;

    // Start a looping event to continuously check the movement direction
    this.moveEvent = this.scene.time.addEvent({
      delay: 50, // Adjust the delay as needed
      callback: this.updateMovement,
      callbackScope: this,
      loop: true,
    });
  }

  handlePointerMove(pointer : Phaser.Input.Pointer) {
    if (!this.isTouching) {
      return;
    }

    const deltaX = pointer.x - this.touchStartX;
    const deltaY = this.touchStartY - pointer.y; // Inverted for upward direction

    if (deltaX < 0) {
      this.moveDirection = "left";
    } else if (deltaX > 0) {
      this.moveDirection = "right";
    }

    this.jump = deltaY > this.jumpThreshold; // Set a threshold for jump
  }

  handlePointerUp() {
    this.isTouching = false;
    this.moveDirection = null;
    this.jump = false;
    this.sprite.setVelocityX(0);
    this.stateMachine.setState("idle");

    // Stop the movement event
    if (this.moveEvent) {
      this.moveEvent.remove(false);
      this.moveEvent = null;
    }
  }

  updateMovement() {
    if (this.moveDirection === "left") {
      this.sprite.flipX = true;
      this.sprite.setVelocityX(-5);
    } else if (this.moveDirection === "right") {
      this.sprite.flipX = false;
      this.sprite.setVelocityX(5);
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

  setVelocity(vx: number, vy: number) {
    this.sprite.setVelocity(vx,vy);
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
    };
  }
}
