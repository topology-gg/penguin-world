// preload.js

const { systemPreferences } = require("electron");

// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

window.addEventListener("DOMContentLoaded", () => {
  const Peer = require("simple-peer");

  // Peers are a JSON object of an Instantiated peer object and a username Field

  var peers = [];
  var username = "";

  function initializePeer(is_initiator) {
    
    let peer_index = peers.length;

    navigator.mediaDevices
      .getUserMedia({
        video: false,
        audio: true,
      })
      .then((stream : MediaStream) => {

        // Default config for a simple-peer Peer https://github.com/feross/simple-peer/issues/797#issuecomment-820915245
        var peer = new Peer({
          initiator: is_initiator,
          trickle: false,
          stream : stream,
          iceCompleteTimeout : 1000 * 60 * 60
        });

        peer._debug = console.log

        
        peers.push({ peer });

        peer.on("stream", (stream : MediaStream) => {
          // We attach our stream to srcObject of a rendered html video element
          // Working example and source code https://webrtc.github.io/samples/src/content/getusermedia/gum/
          var video = document.getElementById("audio") as HTMLVideoElement; 
          
          video.srcObject = stream;
          video.play();

          return;
        });

        peer.on("signal", function (data) {
          data.username = username;

          let yourIdField = document.querySelector(
            `#connection-instance-outer-${peer_index} #yourId`
          ) as HTMLInputElement;

          if (yourIdField !== null) {
            yourIdField.value = JSON.stringify(data);
          }
        });

        document
          .querySelector(`#connection-instance-outer-${peer_index} #connect`)
          .addEventListener("click", function (e) {
            let target = e.target as HTMLButtonElement;

            //get the otherId text of the relevent connection

            let otherId = (<HTMLInputElement>(
              document.querySelector(
                `#connection-instance-outer-${peer_index} #otherId`
              )
            )).value;

            console.log("signal " + peer_index);
            peer.signal(otherId);

            peers[peer_index].username = JSON.parse(otherId).username;

            const div = document.createElement("div");
            div.innerText = `Connected to ${JSON.parse(otherId).username}`;
            div.id = `connection-text`;
            target.parentNode.append(div);

            (<HTMLButtonElement>(
              document.getElementById("finish-signaling")
            )).disabled = false;
          });

        peer.on("data", function (data) {
          let specific_peer = peers.find((given_peer) => {
            return given_peer.peer == peer;
          });

          document.getElementById("messages").textContent +=
            `${specific_peer.username}: ${data}` + "\n";
        });
      }).catch(e => {
        console.log(e)
        let peer = peers[peer_index];

        peer.otherId
      })

  }

  // sending your message to each person
  document.getElementById("send").addEventListener("click", function () {
    var yourMessage = (<HTMLInputElement>document.getElementById("yourMessage"))
      .value;
    peers.forEach((peer) => {
      peer.peer.send(yourMessage);
    });

    console.log("sending");
    document.getElementById("messages").textContent +=
      `${username}: ${yourMessage}` + "\n";
  });

  // Page interactions that create or modify html
  document
    .getElementById("username-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      let form = e.target;

      let username_field = document.getElementById(
        "username-field"
      ) as HTMLInputElement;

      if (username_field.value.length > 0) {
        username_field.disabled = true;
        (<HTMLButtonElement>(
          document.getElementById("username-submit-btn")
        )).disabled = true;
        username = username_field.value;

        (<HTMLButtonElement>(
          document.getElementById("init-connection")
        )).disabled = false;
        (<HTMLButtonElement>(
          document.getElementById("respond-connection")
        )).disabled = false;
      }
    });

  // initialize peer and open input for peers sdp
  document
    .getElementById("init-connection")
    .addEventListener("click", function (e) {
      let node = (<HTMLTemplateElement>(
        document.getElementById("connection-initiator-template")
      )).content.cloneNode(true);

      const div = document.createElement("div");

      let connections = document.getElementById("connections");
      div.id = `connection-instance-outer-${connections.childNodes.length}`;
      div.appendChild(node);

      document.getElementById("connections").appendChild(div);

      initializePeer(true);
    });

  // initialize peer and open input for peers sdp (as reciever)
  document
    .getElementById("respond-connection")
    .addEventListener("click", function (e) {
      let node = (<HTMLTemplateElement>(
        document.getElementById("connection-template")
      )).content.cloneNode(true);

      const div = document.createElement("div");

      let connections = document.getElementById("connections");
      div.id = `connection-instance-outer-${connections.childNodes.length}`;
      div.appendChild(node);

      document.getElementById("connections").appendChild(div);
      initializePeer(false);
    });

  // Disables adding additional peers, enables sending messages
  document
    .getElementById("finish-signaling")
    .addEventListener("click", function (e) {
      let messages = document.getElementById("messages");

      peers.forEach((peer, index) => {
        let connectionInstanceOuter = document.querySelector(
          `#connection-instance-outer-${index}`
        );
        let is_valid_peer = document.querySelector(
          `#connection-instance-outer-${index} #connection-text`
        );

        // Connections that are not complete need to be destroyed
        if (is_valid_peer) {
          is_valid_peer.textContent = is_valid_peer.textContent + "\n";
          messages.prepend(is_valid_peer);
          connectionInstanceOuter.remove();
        } else {
          peer.peer.destroy();
          connectionInstanceOuter.remove();
          peers = peers.filter((_, i) => index != i);
        }
      });

      (<HTMLButtonElement>(
        document.getElementById("respond-connection")
      )).disabled = true;
      (<HTMLButtonElement>document.getElementById("init-connection")).disabled =
        true;
      (<HTMLButtonElement>(
        document.getElementById("finish-signaling")
      )).disabled = true;
      (<HTMLButtonElement>document.getElementById("yourMessage")).disabled =
        false;
      (<HTMLButtonElement>document.getElementById("send")).disabled = false;
    });
});
