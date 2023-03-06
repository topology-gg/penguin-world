import Label from "phaser3-rex-plugins/templates/ui/label/Label.js";
import RexUIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin.js";
import RoundRectanglePlugin from "phaser3-rex-plugins/plugins/roundrectangle-plugin.js"

interface onClick<callback = void> {
    (): callback;
}

export default class DefaultButton extends Label {
    private _scene: Phaser.Scene;
    _rexUI: RexUIPlugin;
    private _background: RoundRectanglePlugin;
    private _displayText: Phaser.GameObjects.Text;
    private _enabled: boolean = true;
    private _textSize: number = 0;
    private _onClick: onClick;

    constructor(scene, text: string = '', x: number = 0, y: number = 0, width: number = 0, size: 'small' | 'medium' | 'large' = 'medium', onClick?: onClick) {
        let textSize: number = 20;
        switch (size) {
            case 'small':
                textSize = 15;
                break;
            case 'medium':
                textSize = 20;
                break;
            case 'large':
                textSize = 25;
                break;
        }

        let textStyle = scene.add.text(x, y, text,{
            fontSize: textSize + 'px',
            fontFamily: 'MRegular',
            color: '#ffdead',
        }).setOrigin(0.5).setDepth(2);

        super(scene, {
            width: width,
            height: textSize * 2,
            space: {
                left: textSize - 5,
                right: textSize - 5,
                top: textSize - 5,
                bottom: textSize - 5,
            },
            align: 'center',
            text: textStyle
        });
        this._scene = scene;
        this._rexUI = scene.rexUI;
        this._onClick = onClick ? onClick : null;
        this.displayText = textStyle;
        this.textSize = textSize;

        this.constructBackground(x, y, width);
        this.addBackground(this.background);
        this.constructEvents();
        scene.add.existing(this);
    }

    get background(): RoundRectanglePlugin {
        return this._background;
    }

    set background(value: RoundRectanglePlugin) {
        this._background = value;
    }

    get displayText(): Phaser.GameObjects.Text {
        return this._displayText;
    }

    set displayText(value: Phaser.GameObjects.Text) {
        this._displayText = value;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }

    get textSize(): number {
        return this._textSize;
    }

    set textSize(value: number) {
        this._textSize = value;
    }

    handleClick(onClick) {
        onClick && this.enabled && onClick();
    }

    handleOver() {
        if (this.enabled) {
            this.background.setFillStyle(0x0e141b, 1);
            this.displayText.setFontFamily('MBold');
        }
    }

    handleOut() {
        if (this.enabled) {
            this.background.setFillStyle(0x121212, 1);
            this.displayText.setFontFamily('MRegular');
        }
    }

    enable() {
        this.enabled = true;
        this.background.setFillStyle(0x121212, 1);
    }

    disable() {
        this.enabled = false;
        this.background.setFillStyle(0x121212, 0.5);
    }

    constructBackground(x, y, width) {
        this.background = (this._scene.add as any).rexRoundRectangle({
            x: x,
            y: y,
            width: width,
            height: this.textSize * 2,
            color: 0x121212,
            radius: 10,
            strokeColor: 0xF34C0B,
            strokeWidth: 1,
        });
    }

    constructEvents() {
        this.background.setInteractive({ cursor: 'pointer' }).setDepth(1)
            .on('pointerdown', () => {
                this.handleClick(this._onClick || null)
            })
            .on('pointerover', () => {
                this.handleOver()
            })
            .on('pointerout', () => {
                this.handleOut()
            })
        ;
    }


}
