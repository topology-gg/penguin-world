import { AudioContent, InputContent, PositionContent, TextContent, UsernameContent, positionalMessage } from "../../scenes/types";

export interface CRDT_CHAT_HISTORY_REMOTE {
  id: number;
  username: string;
  text: string;
  timestamp: number;
}

export interface CRDT_PEER_STATE {
    username: UsernameContent | undefined;
    position: PositionContent | undefined;
    input: InputContent | undefined;
    text: TextContent | undefined;
    audio: AudioContent | undefined;
    messages: positionalMessage[] | undefined;
}
