// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

import Peer from "simple-peer";


enum MessageType {
    MESSAGE = "MESSAGE",
    INPUT = "INPUT"
}
interface PeerData {
    type : MessageType,
    content : string
}

export default class PeerController
{
    private peer;


    private position = {
        x : 0,
        y : 0
    }

    private messages : string[] = []

    constructor(is_initiator : boolean){
        var peer = new Peer({
            initiator: is_initiator,
            trickle: false,
            iceCompleteTimeout : 1000 * 60 * 60
          });

          this.peer = peer

          this.peer.on("data", (data : string) => {

            let peerData : PeerData = JSON.parse(data)
            
            if (peerData.type = MessageType.INPUT){
                this.position = JSON.parse(peerData.content)
            }else if (peerData.type = MessageType.MESSAGE){
                this.messages = [...this.messages, JSON.parse(peerData.content)]
            }
  
            return;
          });
          
    }

    public signal(otherId : string) {
        this.peer.signal(otherId)
    }

    public onData(data : string) {
        // what to do when recieving text          
    }

    public sendMessage(message : string){
        this.peer.send(message);
    }

    public getPosition(){
        return this.position
    }

}
