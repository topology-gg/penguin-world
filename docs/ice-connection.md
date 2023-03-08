I found out why our connections were timing out in WebRTC (forcing us to share our ids quickly).

In `simple-peer` a peer recieves a connection id from an initiator, this peer immediatley gathers information to create the connection and [pings the initiator](https://github.com/topology-gg/esotere-client/blob/main/extra/error_reciever.txt#L21-L23) that it is ready to connect Since the initiator has no entered the peer's id the message from this peer will be met with a disconnected state. 

In `simple-peer` this peer is immediatley destroyed https://github.com/feross/simple-peer/blob/master/index.js#L720

For now we can comment out [this](https://github.com/feross/simple-peer/blob/master/index.js#L720) line and our connections can be made over an arbitary amount of time.

In the near future we can fork much of simple-peer and have our own error handling based on the fact we are using a blockchain as the signalling server.

