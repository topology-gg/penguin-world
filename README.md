
<b>Running</b>
```
cd client && npm i && IS_INITIATOR=TRUE npm run start
```

<b>For M1 MAC USERS</b>

node-webrtc currently is inoperable with M1 Macs so we will need to use the following repo to get a working compiled version of node-wrtc for mac

https://github.com/boblund/m1wrtc


When running `npm run start` you may recieve the message `"wrtc.node" can't be opened because Apple cannot check it for malicous software`
Go into system preferences->security->general and allow "wrtc.node". If upon running `npm run start` you recieve the same message you can allow apps downloaded from anywhere by running `sudo spctl –-master-disable` in the terminal. Return to the general tab in security and select `Anywhere` in Allow apps download from anywhere
