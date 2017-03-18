/**
 * Created by madshall on 3/17/17.
 */

require('./constants');
const BlinkCamera = require('./blink_camera');
const BlinkException = require('./blink_exception');
const BlinkAuthenticationException = require('./blink_auth_exception');
const BlinkURLHandler = require('./blink_url_handler');

const request = require('request');

module.exports = class Blink {
  constructor(username, password) {
    this._username = username;
    this._password = password;
    this._token = null;
    this._auth_header = null;
    this._network_id = null;
    this._account_id = null;
    this._region = null;
    this._region_id = null;
    this._host = null;
    this._events = [];
    this._cameras = {};
    this._idlookup = {};
    this.urls = null;
  }

  get cameras() {
    return this._cameras;
  }

  get idTable() {
    return this._idlookup;
  }

  get networkId() {
    return this._network_id;
  }

  get accountId() {
    return this._account_id;
  }

  get region() {
    return this._region;
  }

  get regionId() {
    return this._region_id;
  }

  refresh() {
    return this.getSummary()
      .then(summary => {
        for (var name in this._cameras) {
          if (this._cameras.hasOwnProperty(name)) {
            let camera = this._cameras[name];
            summary.devices.forEach(device => {
              if (device.device_id === camera.id) {
                camera.update(device);
              }
            });
          }
        }
      });
  }

  getSummary() {
    return new Promise((resolve, reject) => {
      if (!this._auth_header) {
        reject(new BlinkException("Authentication token must be set"));
      }

      request({
        url: this.urls.home_url,
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't retrieve system summary`));
        } else {
          resolve(body);
        }
      });
    });
  }

  getCameraThumbs() {
    return this.refresh()
      .then(() => {
        var result = {};
        for (var name in this._cameras) {
          if (this._cameras.hasOwnProperty(name)) {
            result[name] = this._cameras.thumbnail;
          }
        }
        return result;
      });
  }

  getEvents() {
    return new Promise((resolve, reject) => {
      request({
        url: this.urls.event_url + this._network_id,
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't retrieve system events`));
        } else {
          this._events = body.event;
          resolve(this._events);
        }
      });
    });
  }

  isOnline() {
    return new Promise((resolve, reject) => {
      request({
        url: this.urls.network_url + this._network_id + '/syncmodules',
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't retrieve system status`));
        } else {
          resolve(body.syncmodule.status === 'online');
        }
      });
    });
  }

  getLastMotions() {
    return this.getEvents()
      .then(events => {
        var result = {};
        events.forEach(event => {
          let camera_id = event.camera_id;
          let camera_name = event.camera_name;
          let camera = this._cameras[camera_name];

          if (event.type === 'motion') {
            let url = this.urls.base_url + event.video_url;
            result[camera_name] = camera.motion = {
              'video': url,
              'image': url.replace(/\.[^.]+$]/, '.jpg'),
              'time': event.created_at
            };
          }
        });
        return result;
      });
  }

  isArmed() {
    return this.getSummary()
      .then(summary => {
        return summary.network.armed;
      });
  }

  setArmed(value = true) {
    return new Promise((resolve, reject) => {
      let state = value ? 'arm' : 'disarm';
      request.post({
        url: this.urls.network_url + this._network_id + '/' + state,
        json: true,
        headers: this._auth_header,
        body: {}
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't ${state} the system`));
        } else {
          resolve(body);
        }
      });
    });
  }

  getCameras() {
    return this.getSummary()
      .then(summary => {
        summary.devices.forEach(device => {
          if (device.device_type === 'camera') {
            device.region_id = this._region_id;
            let newDevice = new BlinkCamera(device, this.urls);
            this._cameras[device.name] = newDevice;
            this._idlookup[newDevice.id] = newDevice.name;
          }
        });
        return this._cameras;
      });
  }

  getLinks() {
    for (var name in this._cameras) {
      if (this._cameras.hasOwnProperty(name)) {
        let camera = this._cameras[name];
        let network_id_url = this.urls.network_url + this._network_id;
        let image_url = network_id_url + '/camera/' + camera.id + '/thumbnail';
        let arm_url = network_id_url + '/camera/' + camera.id + '/';
        camera.image_link = image_url;
        camera.arm_link = arm_url;
        camera.header = this._auth_header;
      }
    }
  }

  setupSystem() {
    if (!this._username || !this._password) {
      throw new BlinkAuthenticationException("Username and password are required for system setup");

    }

    return this._getAuthToken()
      .then(this.getIDs.bind(this))
      .then(this.getCameras.bind(this))
      .then(this.getLinks.bind(this));
  }

  _getAuthToken() {
    return new Promise((resolve, reject) => {
      if (typeof this._username != 'string') {
        reject(new BlinkAuthenticationException("Username must be a string"));
      }
      if (typeof this._password != 'string') {
        reject(new BlinkAuthenticationException("Password must be a string"));
      }

      let headers = {
        'Host': DEFAULT_URL,
        'Content-Type': 'application/json'
      };
      let data = {
        "email": this._username,
        "password": this._password,
        "client_specifier": "iPhone 9.2 | 2.2 | 222"
      };

      let authenticate = (response) => {
        this._host = this._region_id + '.' + BLINK_URL;
        this._token = response.authtoken.authtoken;

        this._auth_header = {
          'Host': this._host,
          'TOKEN_AUTH': this._token
        };

        this.urls = new BlinkURLHandler(this._region_id);
        resolve(true);
      };

      request.post({
        url: LOGIN_URL,
        json: true,
        headers: headers,
        body: data
      }, (err, response, body) => {
        if (err) {
          request.post({
            url: LOGIN_BACKUP_URL,
            json: true,
            headers: headers,
            body: data
          }, (err, response, body) => {
            if (err) {
              reject(BlinkAuthenticationException("Authentication problem: second attempt"));
            } else {
              if (body.message) {
                return reject(new BlinkAuthenticationException(body.message));
              }
              this._region_id = 'rest.piri';
              this._region = 'UNKNOWN';
              authenticate(body);
            }
          })
        } else {
          if (!body.region) {
            return reject(new BlinkAuthenticationException(body.message));
          }
          for (var key in body.region) {
            this._region_id = key;
            this._region = body.region[key];
          }
          authenticate(body);
        }
      });
    });
  }

  getIDs() {
    return new Promise((resolve, reject) => {
      if (!this._auth_header) {
        reject(BlinkException("You have to be authenticated before calling this method"));
      }
      request({
        url: this.urls.networks_url,
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err) {
          reject(new BlinkException(`Can't retrieve system status`));
        } else {
          this._network_id = body.networks[0].id;
          this._account_id = body.networks[0].account_id;
          resolve(this);
        }
      });
    });
  }
};