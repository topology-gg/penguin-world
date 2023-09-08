export enum MEDIA_REQUEST {
  JOIN = "join",
  SEND_SIGNAL = "send_signal",
}

export enum MEDIA_RESPONSE {
  CONNECT_PEER = "connect_peer",
  RECEIVE_SIGNAL = "receive_signal",
  DISCONNECT_PEER = "disconnect_peer",
}

export interface MEDIA_MESSAGE {
  from: number;
}

export interface MEDIA_REQUEST_MESSAGE extends MEDIA_MESSAGE {
  type: MEDIA_REQUEST;
}

export interface MEDIA_RESPONSE_MESSAGE extends MEDIA_MESSAGE {
  type: MEDIA_RESPONSE;
}

export interface MEDIA_REQUEST_JOIN extends MEDIA_REQUEST_MESSAGE {}

export interface MEDIA_REQUEST_SEND_SIGNAL extends MEDIA_REQUEST_MESSAGE {
  to: number;
  signal: string;
}

export interface MEDIA_RESPONSE_CONNECT_PEER extends MEDIA_RESPONSE_MESSAGE {
  shouldCreateOffer: boolean;
}

export interface MEDIA_RESPONSE_RECEIVE_SIGNAL extends MEDIA_RESPONSE_MESSAGE {
  signal: string;
}

export interface MEDIA_RESPONSE_DISCONNECT_PEER
  extends MEDIA_RESPONSE_MESSAGE {}
