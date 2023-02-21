// preload.js

// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

window.addEventListener("DOMContentLoaded", () => {
  console.log("is initiator " + process.env.IS_INITIATOR);

  const Peer = require("simple-peer");
  const wrtc = require("wrtc");

  var peer = new Peer({
    initiator: process.env.IS_INITIATOR === "TRUE",
    trickle: false,
    wrtc: wrtc,
  });

  peer.on("signal", function (data) {
    document.getElementById("yourId").value = JSON.stringify(data);
  });

  document.getElementById("connect").addEventListener("click", function () {
    var otherId = JSON.parse(document.getElementById("otherId").value);
    peer.signal(otherId);
  });

  document.getElementById("send").addEventListener("click", function () {
    var yourMessage = document.getElementById("yourMessage").value;
    peer.send(yourMessage);
  });

  peer.on("data", function (data) {
    document.getElementById("messages").textContent += data + "\n";
  });
});
