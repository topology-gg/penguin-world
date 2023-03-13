import SimplePeer from "simple-peer";
import { MessageType } from "./enums";

interface Connection {
  username: string;
  peer: SimplePeer.Instance;
}

interface platformerSceneData {
  peers: Connection[];
  username : string
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
  x : number,
  y : number
}

interface InputContent {
  cursor : SimulatedCursor,
  input : string,
  dt : number
}

interface PeerData {
  type: MessageType;
  content: PositionContent | InputContent | string;
}
