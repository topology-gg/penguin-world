import Phaser from "phaser";
import {
  InputContent,
  PositionContent,
  SimulatedCursor,
  TextContent,
  UsernameContent,
  Vec2,
} from "../scenes/types";
import StateMachine from "../utils/StateMachine";
import {
  TEXT_CHAT_X_OFFSET,
  TEXT_CHAT_Y_OFFSET,
  USERNAME_X_OFFSET,
  USERNAME_Y_OFFSET,
} from "../utils/constants";
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
  private username: Phaser.GameObjects.Text;
  private speechText: Phaser.GameObjects.Text;
  private textHistory: Array<TextContent> = new Array();

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
        color: "#32D003",
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

  destroy() {
    this.sprite.destroy(true);
    this.username.destroy(true);
    this.speechText.destroy(true);
  }

  setUsername(username: UsernameContent) {
    this.username.text = username.username;
  }

  getUsername() {
    return this.username.text;
  }

  chat(text: TextContent) {
    const lastText = this.textHistory.at(-1);

    if (lastText && lastText.timestamp >= text.timestamp) {
      return;
    }

    this.speechText.text = text.text;
    setTimeout(() => {
      this.speechText.text = "";
    }, 5 * 1000);

    this.textHistory.push(text);
  }

  updateLabels() {
    this.username.x =
      this.sprite.body.position.x - this.username.width / 2 + USERNAME_X_OFFSET;
    this.username.y = this.sprite.y + USERNAME_Y_OFFSET;

    this.speechText.x =
      this.sprite.body.position.x -
      this.speechText.width / 2 +
      TEXT_CHAT_X_OFFSET;
    this.speechText.y =
      this.sprite.body.position.y - this.speechText.height + TEXT_CHAT_Y_OFFSET;
  }
  update(dt: number) {
    this.stateMachine.update(dt);
    this.updateLabels();
  }

  moveSprite(position: PositionContent) {
    this.sprite.x = position.x;
    this.sprite.y = position.y;

    this.updateLabels();
  }

  changeSpriteVelocity(velocity: Vec2){
    this.sprite.setVelocityX(velocity.x);
    this.sprite.setVelocityY(velocity.y);
  }

  private idleOnEnter() {
    this.sprite.play("player-idle");
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

    const spaceJustPressed = this.cursors.space;
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

  simulateInput(input: InputContent) {
    this.cursors = input.cursor;
    this.stateMachine.setState(input.input);
    this.update(input.dt);
  }
}
