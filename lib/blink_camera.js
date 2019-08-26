/**
 * Created by madshall on 3/17/17.
 */
const BlinkException = require('./blink_exception');

const request = require('request');

module.exports = class BlinkCamera {
  constructor(config, urls) {
    this.urls = urls;
    this._id = config.device_id;
    this._name = config.name;
    this._status = config.armed;
    this._enabled = config.enabled;
    this._thumb = this.urls.base_url + config.thumbnail + '.jpg';
    this._clip = this.urls.base_url + config.thumbnail + '.mp4';
    this._temperature = config.temp;
    this._battery = config.battery;
    this._notifications = config.notifications;
    this._motion = {};
    this._header = null;
    this._image_link = null;
    this._arm_link = null;
    this._updated_at = config.updated_at;
    this._region_id = config.region_id;
    this._wifi = null;
    this._lfr = null;
    this._network_id = config.network_id;
  }

  get id() {
    return this._id;
  }

  get wifi() {
    return this._wifi;
  }

  get lfr() {
    return this._lfr;
  }

  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  get region_id() {
    return this._region_id;
  }

  get armed() {
    return this._status;
  }

  get enabled() {
    return this._enabled;
  }

  get clip() {
    return this._clip;
  }

  set clip(value) {
    this._clip = value;
  }

  get thumbnail() {
    return this._thumb;
  }

  set thumbnail(value) {
    this._thumb = value;
  }

  get temperature() {
    return this._temperature;
  }

  set temperature(value) {
    this._temperature = value;
  }

  get battery() {
    return this._battery;
  }

  set battery(value) {
    this._battery = value;
  }

  get notifications() {
    return this._notifications;
  }

  set notifications(value) {
    this._notifications = value;
  }

  get image_link() {
    return this._image_link;
  }

  set image_link(value) {
    this._image_link = value;
  }

  get arm_link() {
    return this._arm_link;
  }

  set arm_link(value) {
    this._arm_link = value;
  }

  get header() {
    return this._header;
  }

  set header(value) {
    this._header = value;
  }

  get motion() {
    return this._motion;
  }

  set motion(value) {
    this._motion = value;
  }

  get updated_at() {
    return this._updated_at;
  }

  get network_id() {
    return this._network_id;
  }

  set network_id(value) {
    this._network_id = value;
  }

  snapPicture() {
    return new Promise((resolve, reject) => {
      request.post({
        url: this._image_link,
        json: true,
        headers: this._header,
        body: {}
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't get snapshot from camera ${this._id}:${this._name}`));
        } else {
          resolve(body);
        }
      })
    });
  }

  setMotionDetect(enable) {
    return new Promise((resolve, reject) => {
      request.post({
        url: this._arm_link + (enable ? 'enable' : 'disable'),
        json: true,
        headers: this._header,
        body: {}
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't set motion detect for camera ${this._id}:${this._name}`));
        } else {
          resolve(body);
        }
      })
    });
  }

  update(values) {
    this._name = values['name'];
    this._status = values['armed'];
    this._enabled = values['enabled'];
    this._thumb = this.urls.base_url + values['thumbnail'] + '.jpg';
    this._clip = this.urls.base_url + values['thumbnail'] + '.mp4';
    this._temperature = values['temp'];
    this._battery = values['battery'];
    this._notifications = values['notifications'];
    this._updated_at = values['updated_at'];
  }

  imageRefresh() {
    return new Promise((resolve, reject) => {
      request({
        url: this.urls.home_url,
        headers: this._header,
        json: true
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't refresh thumbnail for camera ${this._id}:${this._name}`));
        } else {
          let devices = body.devices;
          devices.forEach((device) => {
            if (device.device_id === this._id) {
              this._thumb = this.urls.base_url + device['thumbnail'] + '.jpg';
              this._updated_at = device['updated_at'];
              resolve(this._thumb);
            }
          });
          resolve(null);
        }
      })
    });
  }

  statusRefresh() {
    return new Promise((resolve, reject) => {
      request.post({
        url: this._arm_link + 'status',
        json: true,
        headers: this._header,
        body: {}
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't refresh status for camera ${this._id}:${this._name}`));
        } else {
          let status = body;
          resolve(status);
        }
      })
    });
  }

  fetchImageData() {
    return new Promise((resolve, reject) => {
      request({
        url: this.thumbnail,
        headers: this._header,
        encoding: null
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't refresh thumbnail for camera ${this._id}:${this._name}`));
        } else {
          resolve(body);
        }
      })
    });
  }

  fetchVideoData() {
    return new Promise((resolve, reject) => {
      request({
        url: this.thumbnail,
        headers: this._header,
        encoding: null
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't refresh thumbnail for camera ${this._id}:${this._name}`));
        } else {
          resolve(body);
        }
      })
    });
  }
};
