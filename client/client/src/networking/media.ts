import SimplePeer from "simple-peer";
import {
  MEDIA_REQUEST,
  MEDIA_REQUEST_JOIN,
  MEDIA_REQUEST_MESSAGE,
  MEDIA_REQUEST_SEND_SIGNAL,
  MEDIA_RESPONSE,
  MEDIA_RESPONSE_CONNECT_PEER,
  MEDIA_RESPONSE_DISCONNECT_PEER,
  MEDIA_RESPONSE_MESSAGE,
  MEDIA_RESPONSE_RECEIVE_SIGNAL,
} from "./messages/media";

export default class Media {
  private id: number;
  private ws: WebSocket;
  private audio: HTMLAudioElement;
  private stream: MediaStream | undefined;
  private isPrepared: boolean = false;
  private peers: Map<number, SimplePeer.Instance> = new Map();

  private readonly CHANNEL_NAME = "esotere";

  constructor(id: number) {
    this.id = id;
    this.ws = new WebSocket(`${process.env.SIGNALING_SERVER}`);
    this.ws.onopen = this.prepareAndJoin;
    this.ws.onmessage = this.receiveMessage;
    this.audio = document.createElement("audio");
    document.body.appendChild(this.audio);
  }

  prepareAndJoin = () => {
    if (this.ws.readyState !== this.ws.OPEN) {
      alert("Media: Failed to connect to the server. Can't join voice chat.");
      return;
    }

    if (this.isPrepared === true) {
      this.join();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream: MediaStream) => {
        console.log("Media: Succeed to prepare media stream.");

        this.stream = stream;
        this.isPrepared = true;

        this.join();
      })
      .catch((e: Error) => {
        console.log("Media: Failed to prepare media stream.\n", e);

        alert("Failed to have an access to the microphone.");

        this.stream = undefined;
        this.isPrepared = false;
      });
  };

  mute() {
    this.audio.muted = true;
  }

  unmute() {
    this.audio.muted = false;
  }

  private sendMessage(message: MEDIA_REQUEST_MESSAGE) {
    if (this.ws.readyState !== this.ws.OPEN) {
      console.log(`Media: Socket must be ready. Can't send a message.`);
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  private receiveMessage = (messageEvent: MessageEvent) => {
    const message: MEDIA_RESPONSE_MESSAGE = JSON.parse(messageEvent.data);

    if (message && message.type) {
      switch (message.type) {
        case MEDIA_RESPONSE.CONNECT_PEER:
          this.connectPeer(message as MEDIA_RESPONSE_CONNECT_PEER);
          break;
        case MEDIA_RESPONSE.RECEIVE_SIGNAL:
          this.receiveSignal(message as MEDIA_RESPONSE_RECEIVE_SIGNAL);
          break;
        case MEDIA_RESPONSE.DISCONNECT_PEER:
          this.disconnectPeer(message as MEDIA_RESPONSE_DISCONNECT_PEER);
          break;
        default:
          console.log(`Media: Unknown message type '${message.type}'.`);
          break;
      }
    }
  };

  private join() {
    if (this.ws.readyState !== this.ws.OPEN && this.isPrepared !== true) {
      console.log(
        `Media: Both socket and media must be ready. Can't join voice chat.`
      );
      return;
    }

    const message: MEDIA_REQUEST_JOIN = {
      type: MEDIA_REQUEST.JOIN,
      from: this.id,
    };

    this.sendMessage(message);
  }

  private connectPeer(message: MEDIA_RESPONSE_CONNECT_PEER) {
    const peerID = message.from;

    if (this.peers.has(peerID) === true) {
      console.log(`Media: Already connected to peer ${peerID}.`);
      return;
    }

    const peer: SimplePeer.Instance = new SimplePeer({
      initiator: message.shouldCreateOffer,
      channelName: this.CHANNEL_NAME,
      stream: this.stream,
      trickle: false,
    });

    this.peers.set(peerID, peer);

    peer.on("signal", (data) => {
      const message: MEDIA_REQUEST_SEND_SIGNAL = {
        type: MEDIA_REQUEST.SEND_SIGNAL,
        from: this.id,
        to: peerID,
        signal: JSON.stringify(data),
      };

      this.sendMessage(message);
    });

    peer.on("connect", () => {
      console.log(`Media: Succeed to connect to peer ${peerID}.`);
    });

    peer.on("stream", (stream) => {
      this.audio.srcObject = stream;
      this.audio.muted = true;
      this.audio.play();
    });
  }

  private receiveSignal(message: MEDIA_RESPONSE_RECEIVE_SIGNAL) {
    const peerID = message.from;

    if (this.peers.has(peerID) === false) {
      console.log(`Media: Unknown peer ${peerID}.`);
      return;
    }

    const peer = this.peers.get(peerID)!;

    peer.signal(message.signal);
  }

  private disconnectPeer(message: MEDIA_RESPONSE_DISCONNECT_PEER) {
    const peerID = message.from;

    if (this.peers.has(peerID) === false) {
      console.log(`Media: Peer ${peerID} is already disconnected.`);
      return;
    }

    this.peers.delete(peerID);
  }
}
