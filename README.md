# Esotere Client
Esotere client is the gateway to the topology world.
Message directly with fellow wizards and roam a fantasy-themed overworld populated with artifacts from other on-chain realities.

## Table of Contents
- [Esotere Client](#esotere-client)
  - [Table of Contents](#table-of-contents)
  - [Stack](#stack)
  - [Installation](#installation)
  - [Usage](#usage)
  
# Stack
The client UI uses Electron to run the app natively on your desktop. Simple-peer is used to establish WebRTC connections between peers. Game engine, additional netcode and frontend frameworks are to be determined.

# Featueres
- [x] Text Chat
- [x] Voice chat
- [ ] Signalling
- [ ] Shared platformer world


# Installation
Pull the main branch of the repo
```
    cd client && npm i
```

# Usage
Start the client by running
```
    npm run start
```
## As an initiator
Once the app is loaded select a username and hit `submit`. 
Then click `+ initialize connection`. Copy the JSON string in `Your ID` and send this to the peer you are connecting to.
Past in the response JSON into `Other id` and select `connect`. Click `Done Connecting` and start chatting with your peer.

## As a responder
Once the app is loaded select a username and hit `submit`. 
Then click `+ Respond to Connection Request`. Copy the JSON string from your peer and paste this string into `Other ID`. Select `connect` and share the resulting `Your ID` with your peer. Click `Done Connecting` and start chatting with your peer.


