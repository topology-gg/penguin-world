import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import {
  InputContent,
  PositionContent,
  State,
  TextContent,
  UsernameContent,
} from "../scenes/types";

export enum CRDT_STATE {
  REMOVED = "REMOVED",
  STATE = "STATE",
}

export default class CRDT {
  private doc: Y.Doc;
  private provider: WebrtcProvider;

  private isListening: Map<string, boolean>;
  private peers: Map<number, Map<string, any>>;
  private state: State;

  private readonly AWARENESS = "AWARENESS";

  constructor() {
    this.doc = new Y.Doc();
    this.provider = new WebrtcProvider("the-penguin-world", this.doc, {
      signaling: [`${process.env.SIGNALING_SERVER}`],
    });

    this.isListening = new Map();
    this.peers = new Map();
    this.state = {
      username: undefined,
      position: undefined,
      input: undefined,
      text: undefined,
    };
  }

  aware() {
    if (this.isListening.get(this.AWARENESS) === true) {
      return;
    }

    this.provider.awareness.on("change", (changes: any) => {
      const states = this.provider.awareness.getStates();

      changes.updated.forEach((clientID: number) => {
        if (clientID === this.doc.clientID) {
          return;
        }

        const state = states.get(clientID);

        if (state === undefined) {
          return;
        }

        if (this.peers.has(clientID) === false) {
          this.peers.set(clientID, new Map());
        }

        this.peers.get(clientID)!.set(CRDT_STATE.STATE, state);
      });

      changes.removed.forEach((clientID: number) => {
        if (clientID === this.doc.clientID) {
          return;
        }

        if (this.peers.has(clientID) === false) {
          return;
        }

        this.peers.get(clientID)!.set(CRDT_STATE.REMOVED, true);
      });
    });

    this.isListening.set(this.AWARENESS, true);
  }

  setUsername(username: UsernameContent) {
    this.state.username = username;
  }

  setPosition(position: PositionContent) {
    this.state.position = position;
  }

  setInput(input: InputContent) {
    this.state.input = input;
  }

  setText(text: TextContent) {
    this.state.text = text;
  }

  broadcastState() {
    if (this.isListening.get(this.AWARENESS) !== true) {
      return;
    }

    this.provider.awareness.setLocalState(this.state);
  }

  getPeers() {
    return this.peers;
  }
}
