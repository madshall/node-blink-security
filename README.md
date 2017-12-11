![Build Status](https://img.shields.io/travis/madshall/node-blink-security.svg)
![Downloads](https://img.shields.io/npm/dm/.svg)
![Downloads](https://img.shields.io/npm/dt/node-blink-security.svg)
![npm version](https://img.shields.io/npm/v/node-blink-security.svg)
![dependencies](https://img.shields.io/david/madshall/node-blink-security.svg)
![dev dependencies](https://img.shields.io/david/dev/madshall/node-blink-security.svg)
![License](https://img.shields.io/npm/l/node-blink-security.svg)

# node-blink-security
This is a Node.js version of [this python library](https://github.com/fronzbot/blinkpy). It allows to communicate with Blink Home Security System from a Node.js application.
  
# Installation
```
npm install node-blink-security
```

# Usage
```javascript
const Blink = require('node-blink-security');

var blink = new Blink('YOUR_EMAIL', 'YOUR_PASSWORD');
blink.setupSystem()
  .then(() => {
    blink.setArmed()
      .then(() => {
        // see the object dump for details
        console.log(blink);
      });
  }, (error) => {
    console.log(error);
  });
```

# API

```javascript
class Blink
```

## Properties

* `blink.cameras` - the information about all available cameras
* `blink.idTable` - `{cameraId:cameraName}` map for further references
* `blink.networkId` - network id
* `blink.accountId` - account id
* `blink.region` - region (e.g. `prod`)
* `blink.regionId` - region (e.g. `United States`)

## Methods

* `blink.refresh` - get all blink cameras and pulls their most recent status
* `blink.getSummary` - get a full summary of device information
* `blink.getCameraThumbs` - refresh all cameras thumbnails
* `blink.getEvents` - get all events from Blink server (e.g. heartbeats, motion...)
* `blink.isOnline` - return boolean system online status
* `blink.getLastMotions` - refresh motion events data
* `blink.isArmed` - return boolean status of sync module: armed(true)/disarmed(false).
* `blink.setArmed(boolean)` - arm/disarm the system; `true` by default
* `blink.getCameras` - find and creates cameras; used for internal purposes
* `blink.getLinks` - set access links and required headers for each camera in system; used for internal purposes
* `blink.setupSystem([system name or id])` - logs in and sets auth token, urls, and ids for future requests. Specify a system identifier if you have more than one system setup.
* `blink.getIDs` - set the network ID and Account ID; used for internal purpose
* `blink.getClients` - get information about devices that have connected to the system

```javascript
class BlinkCamera
```

## Properties

* `blinkCamera.id` - camera id
* `blinkCamera.name` - camera name
* `blinkCamera.region_id` - region id
* `blinkCamera.armed` - camera arm status
* `blinkCamera.clip` - current clip
* `blinkCamera.thumbnail` - current thumbnail
* `blinkCamera.temperature` - camera temperature
* `blinkCamera.battery` - battery level
* `blinkCamera.notifications` - number of notifications
* `blinkCamera.image_link` - image link
* `blinkCamera.arm_link` - link to arm camera
* `blinkCamera.header` - request header
* `blinkCamera.motion` - last motion event detail
* `blinkCamera.updated_at` - last device update date

## Methods

* `blinkCamera.snapPicture` - take a picture with camera to create a new thumbnail
* `blinkCamera.setMotionDetect(boolean)` - set motion detection
* `blinkCamera.update` - update camera information; internal use
* `blinkCamera.imageRefresh` - refresh current thumbnail
* `blinkCamera.fetchImageData` - get the image data for the camera's current thumbnail

# License 
MIT