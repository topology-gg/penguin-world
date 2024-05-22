import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";
import {
  AudioContent,
  InputContent,
  PositionContent,
  State,
  TextContent,
  UsernameContent,
  resolutionMessage,
  resolutionMessageLite,
} from "../scenes/types";
import { CRDT_CHAT_HISTORY_REMOTE, CRDT_PEER_STATE } from "./messages/crdt";
import { YMap } from "yjs/dist/src/internals";

export enum CRDT_STATE {
  REMOVED = "REMOVED",
  STATE = "STATE",
}

export default class CRDT {
  private doc: Y.Doc;
  private chatHistoryRemote: Y.Array<CRDT_CHAT_HISTORY_REMOTE>;
  private globalState: Y.Map<CRDT_PEER_STATE>;
  private provider: WebrtcProvider;

  private isListening: Map<string, boolean>;
  private peers: Map<number, Map<string, any>>;
  private state: State;

  private readonly AWARENESS = "AWARENESS";

  constructor(lobbyName: string) {
    this.doc = new Y.Doc();
    this.chatHistoryRemote = this.doc.getArray("chat-history");
    this.provider = new WebrtcProvider(lobbyName, this.doc, {
      signaling: [`${process.env.SIGNALING_SERVER}`],
    });

    this.isListening = new Map();
    this.peers = new Map();
    this.state = {
      username: undefined,
      position: undefined,
      input: undefined,
      text: undefined,
      audio: undefined,
    };

    this.globalState = this.doc.getMap("global-state");

    console.log(`CRDT: Client ID is ${this.doc.clientID}.`);
  }

  aware() {
    if (this.isListening.get(this.AWARENESS) === true) {
      return;
    }

    this.provider.awareness.on("change", (changes: any) => {
      console.log(`CRDT: Awareness change ${changes}.`);

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

  setAudio(audio: AudioContent) {
    this.state.audio = audio;
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

    //
    // methods that access & manipulate CRDT global state
    //
    observeGlobalState(
        callback: (globalState: Y.Map<CRDT_PEER_STATE>) => void
    ) {
        this.globalState.observe(
            (event: Y.YMapEvent<CRDT_PEER_STATE>, tx: Y.Transaction) => {
                // console.log(`globalState observe(): last event: ${JSON.stringify(event)}`);
                callback(event.target);
            }
        );
    }

    addResolutionMessageToMyGlobalState (message: resolutionMessage) {
        // grab my current message queue from crdt
        const myClientID = this.doc.clientID;
        let myCurrState = this.globalState.get(myClientID.toString());
        if (myCurrState === undefined) {
            myCurrState = {
                username: undefined,
                position: undefined,
                input: undefined,
                text: undefined,
                audio: undefined,
                messages: []
            };
        }
        const myCurrMessageQueue = myCurrState.messages as resolutionMessage[];

        // push new message to queue
        const newMessageQueue = myCurrMessageQueue.concat([message]);

        // update crdt
        this.globalState.set(myClientID.toString(), {
            ...myCurrState,
            messages: newMessageQueue
        });
    }

    clearMyMessageQueue () {
        const myClientID = this.doc.clientID;

        // check if my queue is already empty; if so, skip crdt update
        const currQueue = this.globalState.get(myClientID.toString())?.messages;
        if (currQueue === undefined) {
            return;
        }
        if (currQueue.length == 0) {
            return;
        }

        // otherwise clear the queue in crdt
        const emptyState = {
            username: undefined,
            position: undefined,
            input: undefined,
            text: undefined,
            audio: undefined,
            messages: []
        };
        this.globalState.set(myClientID.toString(), emptyState);
    }

    addResolutionMessageToPeerMessageQueue (clientID: number, message: resolutionMessageLite) {
        // grab the target message queue from crdt
        let currState = this.globalState.get(clientID.toString());
        if (currState === undefined) {
            currState = {
                username: undefined,
                position: undefined,
                input: undefined,
                text: undefined,
                audio: undefined,
                messages: []
            };
        }
        const currMessageQueue = currState.messages as resolutionMessageLite[];

        // push new message to queue
        const newMessageQueue = currMessageQueue.concat([message]);

        // update crdt
        this.globalState.set(clientID.toString(), {
            ...currState,
            messages: newMessageQueue
        });
    }

}
