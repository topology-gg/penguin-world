// preload.js

// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

function gotMedia(stream, peer) {
  peer.on("stream", (stream) => {
    var video = document.createElement("video");
    document.body.appendChild(video);

    video.src = window.URL.createObjectURL(stream);
    video.play();

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);

    source.connect(analyser);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("is initiator " + process.env.IS_INITIATOR);

  const Peer = require("simple-peer");
  const wrtc = require("wrtc");

  // Peers are a JSON object of an Instantiated peer object and a username Field

  var peers = [];
  var username = "";

  function initializePeer(is_initiator) {
    navigator.mediaDevices
      .getUserMedia({
        video: false,
        audio: true,
      })
      .then((stream) => {
        var peer = new Peer({
          initiator: is_initiator,
          trickle: false,
          wrtc: wrtc,
          // stream : stream  
        });
        
        let peer_index = peers.length;
        peers.push({ peer });

        peer.on("signal", function (data) {
          data.username = username;

          let yourIdField = document.querySelector(
            `#connection-instance-outer-${peer_index} #yourId`
          );

          if (yourIdField !== null) {
            yourIdField.value = JSON.stringify(data);
          }
        });

        document
          .querySelector(`#connection-instance-outer-${peer_index} #connect`)
          .addEventListener("click", function (e) {
            let target = e.target;

            //get the otherId text of the relevent connection

            let otherId = document.querySelector(
              `#connection-instance-outer-${peer_index} #otherId`
            ).value;

            console.log("signal " + peer_index);
            peer.signal(otherId);

            peers[peer_index].username = JSON.parse(otherId).username;

            const div = document.createElement("div");
            div.innerText = `Connected to ${JSON.parse(otherId).username}`;
            div.id = `connection-text`
            target.parentNode.append(div);
            
            document.getElementById("finish-signaling").disabled = false;
          });

        peer.on("data", function (data) {
          let specific_peer = peers.find((given_peer) => {
            return given_peer.peer == peer;
          });

          document.getElementById("messages").textContent +=
            `${specific_peer.username}: ${data}` + "\n";
        });
      })
      .catch((e) => {
        console.log(e);
      });
  }

  // sending your message to each person
  document.getElementById("send").addEventListener("click", function () {
    var yourMessage = document.getElementById("yourMessage").value;
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

      let username_field = document.getElementById("username-field");

      if (username_field.value.length > 0) {
        username_field.disabled = true;
        document.getElementById("username-submit-btn").disabled = true;
        username = username_field.value;

        document.getElementById("init-connection").disabled = false;
        document.getElementById("respond-connection").disabled = false;
      }
    });

  document
    .getElementById("init-connection")
    .addEventListener("click", function (e) {
      let node = document
        .getElementById("connection-initiator-template")
        .content.cloneNode(true);

      const div = document.createElement("div");

      let connections = document.getElementById("connections");
      div.id = `connection-instance-outer-${connections.childNodes.length}`;
      div.appendChild(node);

      document.getElementById("connections").appendChild(div);

      initializePeer(true);
    });

  document
    .getElementById("respond-connection")
    .addEventListener("click", function (e) {
      let node = document
        .getElementById("connection-template")
        .content.cloneNode(true);

      const div = document.createElement("div");

      let connections = document.getElementById("connections");
      div.id = `connection-instance-outer-${connections.childNodes.length}`;
      div.appendChild(node);

      document.getElementById("connections").appendChild(div);
      initializePeer(false);
    });

  document
    .getElementById("finish-signaling")
    .addEventListener("click", function (e) {
      
      let messages = document.getElementById("messages")

      peers.forEach((peer, index) => {
        
        let connectionInstanceOuter =  document.querySelector(`#connection-instance-outer-${index}`)
        let is_valid_peer = document.querySelector(`#connection-instance-outer-${index} #connection-text`)
        

        // Connections that are not complete need to be destroyed
        if(is_valid_peer){
          is_valid_peer.textContent = is_valid_peer.textContent + '\n'
          messages.prepend(is_valid_peer)
          connectionInstanceOuter.remove()
        }else{
          peer.peer.destroy();
          connectionInstanceOuter.remove()
          peers = peers.filter((_, i) => index != i)
        }

      })


      document.getElementById("respond-connection").disabled = true;
      document.getElementById("init-connection").disabled = true;
      document.getElementById("finish-signaling").disabled = true;
      document.getElementById("yourMessage").disabled = false;
      document.getElementById("send").disabled = false;

    });
});
