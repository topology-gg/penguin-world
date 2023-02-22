```
cd client
npm i
npm run start


For M1 MAC USERS

node-webrtc currently is inoperable with M1 Macs so we will need to ...

https://github.com/boblund/m1wrtc


When running `npm run start` you may recieve the message `"wrtc.node" can't be opened because Apple cannot check it for malicous software`
Go into system preferences->security->general and allow "wrtc.node". If upon running `npm run start` you recieve the same message you can allow apps downloaded from anywhere by running `sudo spctl –-master-disable` in the terminal. Return to the general tab in security and select `Anywhere` in Allow apps download from anywhere
