import SimplePeer from "simple-peer";
import CRDT from "../networking/crdt";
import Media from "../networking/media";
import { MessageType, ProjectileEvent } from "./enums";

interface PeerMessage {
  content: string;
  timestamp: number;
}
interface Connection {
  username: string;
  peer: SimplePeer.Instance;
  messages: PeerMessage[];
}

interface PeerInfo {
  peer: SimplePeer.Instance;
  index: number;
}

interface platformerSceneData {
  peers: Connection[];
  username: string;
  crdt: CRDT;
  media: Media;
}

interface SimulatedCursor {
  left: {
    isDown: boolean;
  };
  right: {
    isDown: boolean;
  };

  space: boolean;
}

interface Vec2 {
  x: number;
  y: number;
}

interface PositionContent {
  x: number;
  y: number;
}

interface InputContent {
  cursor: SimulatedCursor;
  input: string;
  dt: number;
}

interface TextContent {
  text: string;
  timestamp: number;
}

interface UsernameContent {
  username: string;
}

interface AudioContent {
  id: string;
  muted: boolean;
}

interface ResolutionMessageBase {
  messageID: number; // for each peer to keep track of which messageID of which queue is processed or yet to be processed
  objectId: number; // Id of the peer being effected or the projectile
}

interface PeerResolutionMessage extends ResolutionMessageBase {
  update: Vec2;
  isVelocityBased: boolean;
}

interface ProjectileResolutionMessge extends ResolutionMessageBase {
  projectileEvent: ProjectileEvent;
  position: Vec2;
  velocity: Vec2;
}

type ResolutionMessage = PeerResolutionMessage | ProjectileResolutionMessge;

//
// CRDT state interface
//
interface State {
  username: UsernameContent | undefined;
  position: PositionContent | undefined;
  input: InputContent | undefined;
  text: TextContent | undefined;
  audio: AudioContent | undefined;
}

interface PeerData {
  type: MessageType;
  content: PositionContent | InputContent | string;
}



interface CursorKeys extends Phaser.Types.Input.Keyboard.CursorKeys {
  f: Phaser.Input.Keyboard.Key;
}
