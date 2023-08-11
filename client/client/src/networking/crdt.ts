import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import { InputContent, PositionContent } from "../scenes/types";

export enum CRDT_STATE {
  INPUT = "input",
  POSITION = "position",
  REMOVED = "removed",
}

export default class CRDT {
  private doc: Y.Doc;
  private provider: WebrtcProvider;

  private isListening: Map<string, boolean> = new Map();
  private peers: Map<number, Map<string, any>> = new Map();

  private readonly AWARENESS = "AWARENESS";

  constructor() {
    this.doc = new Y.Doc();
    this.provider = new WebrtcProvider("the-penguin-world", this.doc, {
      signaling: ["ws://localhost:4444"],
    });
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

        const position = state[CRDT_STATE.POSITION];
        const input = state[CRDT_STATE.INPUT];

        if (this.peers.has(clientID) === false) {
          this.peers.set(clientID, new Map());
        }

        this.peers.get(clientID)!.set(CRDT_STATE.POSITION, position);
        this.peers.get(clientID)!.set(CRDT_STATE.INPUT, input);
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

  broadcastPosition(position: PositionContent) {
    if (this.isListening.get(this.AWARENESS) !== true) {
      return;
    }

    this.provider.awareness.setLocalStateField(CRDT_STATE.POSITION, position);
  }

  broadcastInput(input: InputContent) {
    if (this.isListening.get(this.AWARENESS) !== true) {
      return;
    }

    this.provider.awareness.setLocalStateField(CRDT_STATE.INPUT, input);
  }

  getPeers() {
    return this.peers;
  }
}
