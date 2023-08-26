import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import {
  InputContent,
  PositionContent,
  State,
  TextContent,
  UsernameContent,
} from "../scenes/types";
import { CRDT_CHAT_HISTORY_REMOTE } from "./messages/crdt";

export enum CRDT_STATE {
  REMOVED = "REMOVED",
  STATE = "STATE",
}

export default class CRDT {
  private doc: Y.Doc;
  private chatHistoryRemote: Y.Array<CRDT_CHAT_HISTORY_REMOTE>;
  private provider: WebrtcProvider;

  private isListening: Map<string, boolean>;
  private peers: Map<number, Map<string, any>>;
  private state: State;

  private readonly AWARENESS = "AWARENESS";

  constructor() {
    this.doc = new Y.Doc();
    this.chatHistoryRemote = this.doc.getArray("chat-history");
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

    console.log(`CRDT: Client ID is ${this.doc.clientID}.`);
  }

  aware() {
    if (this.isListening.get(this.AWARENESS) === true) {
      return;
    }

    this.provider.awareness.on("change", (changes: any) => {
      const states = this.provider.awareness.getStates();

      const setState = (clientID: number) => {
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
      };

      const setRemoved = (clientID: number) => {
        if (clientID === this.doc.clientID) {
          return;
        }

        if (this.peers.has(clientID) === false) {
          return;
        }

        this.peers.get(clientID)!.set(CRDT_STATE.REMOVED, true);
      };

      changes.added.forEach(setState);

      changes.updated.forEach(setState);

      changes.removed.forEach(setRemoved);
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

    setTimeout(() => {
      const nullifierText = {
        text: "",
        timestamp: 0,
      };

      this.state.text = nullifierText;
      this.setChatHistoryRemote(nullifierText);
    }, 5 * 1000);
  }

  setChatHistoryRemote(text: TextContent) {
    this.chatHistoryRemote.push([
      {
        id: this.doc.clientID,
        username: this.state.username ? this.state.username.username : "",
        ...text,
      },
    ]);
  }

  broadcastState() {
    if (this.isListening.get(this.AWARENESS) !== true) {
      return;
    }

    this.provider.awareness.setLocalState(this.state);
  }

  observeChatHistoryRemote(
    callback: (chatHistoryRemote: Array<CRDT_CHAT_HISTORY_REMOTE>) => void
  ) {
    this.chatHistoryRemote.observe(
      (event: Y.YArrayEvent<CRDT_CHAT_HISTORY_REMOTE>, _: Y.Transaction) => {
        callback(event.target.toArray());
      }
    );
  }

  getClientID(): number {
    return this.doc.clientID;
  }

  getChatHistoryRemote(): Array<CRDT_CHAT_HISTORY_REMOTE> {
    return this.chatHistoryRemote.toArray();
  }

  getPeers(): Map<number, Map<string, any>> {
    return this.peers;
  }
}
