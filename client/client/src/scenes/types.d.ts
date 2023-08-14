import SimplePeer from "simple-peer";
import CRDT from "../networking/crdt";
import { MessageType } from "./enums";

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

interface State {
  username: UsernameContent | undefined;
  position: PositionContent | undefined;
  input: InputContent | undefined;
  text: TextContent | undefined;
}

interface PeerData {
  type: MessageType;
  content: PositionContent | InputContent | string;
}
