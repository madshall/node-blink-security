/**
 * Created by madshall on 3/17/17.
 */
const readline = require('readline');
require('./constants');
const BlinkCamera = require('./blink_camera');
const BlinkException = require('./blink_exception');
const BlinkAuthenticationException = require('./blink_auth_exception');
const BlinkURLHandler = require('./blink_url_handler');
const { guid } = require('./util');

const request = require('request');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function _statusCodeIsError(response){
  return response.statusCode < 200 || response.statusCode > 299
}
module.exports = class Blink {
  constructor(username, password, device_id, options) {
    this._username = username;
    this._password = password;
    this._token = null;
    this._auth_header = null;
    this._networks = [];
    this._account_id = null;
    this._region = null;
    this._region_id = null;
    this._host = null;
    this._events = [];
    this._cameras = {};
    this._idlookup = {};
    this._device_id = device_id;
    this.auth_2FA = false;
    this.verification_timeout = 1e3 * 60;
    this.device_name = "node-blink-security";
    this.urls = null;
    Object.assign(this, options);
  }

  get cameras() {
    return this._cameras;
  }

  get idTable() {
    return this._idlookup;
  }

  get networks() {
    return this._networks;
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
    var promises = [];
    for (var id in this._cameras) {
      if (this._cameras.hasOwnProperty(id)) {
        let camera = this._cameras[id];
        promises.push(camera.statusRefresh());
      }
    }

    return Promise
      .all(promises)
      .then(() => this.getSummary())
      .then(summary => {
        for (var id in this._cameras) {
          if (this._cameras.hasOwnProperty(id)) {
            let camera = this._cameras[id];
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
    const promises = [];
    const networks = this.networks.map(_ => _.id);

    networks.forEach(networkId => {
      promises.push(new Promise((resolve, reject) => {
        if (!this._auth_header) {
          reject(new BlinkException("Authentication token must be set"));
        }

        request({
          url: this.urls.network_url + networkId + "/homescreen",
          headers: this._auth_header,
          json: true
        }, (err, response, body) => {
          if (err || _statusCodeIsError(response)) {
            reject(new BlinkException(`Can't retrieve system summary`));
          } else {
            resolve(body);
          }
        });
      }));
    });

    return Promise.all(promises)
      .then(results => {
        return results.reduce((acc, result, index) => {
          acc[networks[index]] = result;
          return acc;
        }, {});

      });
  }

  getCameraThumbs() {
    return this.refresh()
      .then(() => {
        var result = {};
        for (var id in this._cameras) {
          if (this._cameras.hasOwnProperty(id)) {
            result[id] = this._cameras.thumbnail;
          }
        }
        return result;
      });
  }

  getEvents(networkIds = []) {
    const promises = [];
    const networks = networkIds.length ? networkIds : this.networks.map(_ => _.id);

    networks.forEach(networkId => {
      promises.push(new Promise((resolve, reject) => {
        request({
          url: this.urls.event_url + networkId,
          headers: this._auth_header,
          json: true
        }, (err, response, body) => {
          if (err || _statusCodeIsError(response)) {
            reject(new BlinkException(`Can't retrieve system events`));
          } else {
            this._events = body.event;
            resolve(this._events);
          }
        });
      }));
    });

    return Promise.all(promises)
      .then(results => {
        return results.reduce((acc, result, index) => {
          acc[networks[index]] = result;
          return acc;
        }, {});
      });
  }

  isOnline(networkIds = []) {
    const promises = [];
    const networks = networkIds.length ? networkIds : this.networks.map(_ => _.id);

    networks.forEach(networkId => {
      promises.push(new Promise((resolve, reject) => {
        request({
          url: this.urls.network_url + networkId + '/syncmodules',
          headers: this._auth_header,
          json: true
        }, (err, response, body) => {
          if (err || _statusCodeIsError(response)) {
            reject(new BlinkException(`Can't retrieve system status`));
          } else {
            resolve(body.syncmodule.status === 'online');
          }
        });
      }));
    });

    return Promise.all(promises)
      .then(results => {
        return results.reduce((acc, result, index) => {
          acc[networks[index]] = result;
          return acc;
        }, {});
      });
  }

  getClients() {
    return new Promise((resolve, reject) => {
      request({
        url: this.urls.base_url + '/account/clients',
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err || _statusCodeIsError(response)) {
          reject(new BlinkException(`Can't retrieve connected clients`));
        } else {
          resolve(body);
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
          let camera = this._cameras[camera_id];

          if (event.type === 'motion') {
            let url = this.urls.base_url + event.video_url;
            result[camera_id] = camera.motion = {
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
      .then(summaries => {
        return Object.keys(summaries).reduce((acc, key) => {
          acc[key] = summaries[key].network.armed;
          return acc;
        }, {});
      });
  }

  setArmed(value = true, networkIds = []) {
    const promises = [];
    const networksToArm = networkIds.length ? networkIds : this.networks.map(_ => _.id);

    networksToArm.forEach(networkId => {
      promises.push(new Promise((resolve, reject) => {
        let state = value ? 'arm' : 'disarm';
        request.post({
          url: this.urls.network_url + networkId + '/' + state,
          json: true,
          headers: this._auth_header,
          body: {}
        }, (err, response, body) => {
          if (err || _statusCodeIsError(response)) {
            reject(new BlinkException(`Can't ${state} the network: ${networkId}`));
          } else {
            resolve(body);
          }
        });
      }));
    });

    return Promise.all(promises)
      .then(results => {
        return results.reduce((acc, result, index) => {
          acc[networksToArm[index]] = result;
          return acc;
        }, {});
      });
  }

  getVideos() {
    return new Promise((resolve, reject) => {
      request({
        url: this.urls.video_url,
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err || _statusCodeIsError(response)) {
          reject(new BlinkException(`Can't fetch videos`));
        } else {
          resolve(body);
        }
      });
    });
  }

  getCameras() {
    return this.getSummary()
      .then(summaries => {
        Object.keys(summaries).forEach(networkId => {
          summaries[networkId].devices.forEach(device => {
            if (device.device_type === 'camera') {
              device.region_id = this._region_id;
              device.network_id = networkId;
              let newDevice = new BlinkCamera(device, this.urls);
              this._cameras[newDevice.id] = newDevice;
              this._idlookup[newDevice.id] = newDevice.name;
            }
          });
        });
        return this._cameras;
      });
  }

  getLinks() {
    for (var id in this._cameras) {
      if (this._cameras.hasOwnProperty(id)) {
        let camera = this._cameras[id];
        let network_id_url = this.urls.network_url + camera.network_id;
        let image_url = network_id_url + '/camera/' + camera.id + '/thumbnail';
        let arm_url = network_id_url + '/camera/' + camera.id + '/';
        camera.image_link = image_url;
        camera.arm_link = arm_url;
        camera.header = this._auth_header;
      }
    }
  }

  setupSystem(name_or_id) {
    if ( !((this._username && this._password) || (this._token && this._region_id ))) {
      throw new BlinkAuthenticationException("(_username, _password) or (_token, _region_id) are required for system setup");
    }
    if(this._token){
      this._setupWithToken()
      return this.getIDs(name_or_id)
        .then(this.getCameras.bind(this))
        .then(this.getLinks.bind(this));
    }
    else{
      return this._getAuthToken()
        .then(() => this.getIDs.bind(this)(name_or_id))
        .then(this.getCameras.bind(this))
        .then(this.getLinks.bind(this));
    }
  }
  _setupWithToken(){
      this._host = this._region_id + '.' + BLINK_URL;
      this._auth_header = {
        'Host': this._host,
        'TOKEN_AUTH': this._token
      };
      this.urls = new BlinkURLHandler(this._region_id);
  }
  _getAuthToken(repeats = 0) {
    return new Promise((resolve, reject) => {
      if (typeof this._username != 'string') {
        return reject(new BlinkAuthenticationException("Username must be a string"));
      }
      if (typeof this._password != 'string') {
        return reject(new BlinkAuthenticationException("Password must be a string"));
      }
      if (typeof this._device_id != 'string') {
        return reject(new BlinkAuthenticationException("Device ID must be a string"));
      }

      let headers = {
        'Host': DEFAULT_URL,
        'Content-Type': 'application/json'
      };
      const notification_key = guid(SIZE_NOTIFICATION_KEY);
      let data = {
        "email": this._username,
        "password": this._password,
        "notification_key": notification_key,
        "unique_id": this._device_id,
        "app_version": "6.0.7 (520300) #afb0be72a",
        "client_name": this.device_name,
        "client_type": "android",
        "device_identifier": this._device_id,
        "device_name": this.device_name,
        "os_version": "5.1.1",
        "reauth": "true",
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
        url: this.auth_2FA ? LOGIN_URL_2FA : LOGIN_URL,
        json: true,
        headers: headers,
        body: data
      }, (err, response, body) => {
        if (err || _statusCodeIsError(response)) {
          return reject(new BlinkAuthenticationException(`Authentication problem: ${body.message}`));
        } else {
          if ((body.client || {}).verification_required) {
            if (!this.auth_2FA) {
              if (repeats === 1) return reject(new BlinkAuthenticationException(`Authentication problem: verification timeout`));
              return new Promise((resolve, reject) => {
                setTimeout(() => { 
                  this._getAuthToken(repeats + 1).then(resolve, reject);
                }, this.verification_timeout);
              }).then(resolve, reject);
            }
            return rl.question(`Enter the verification code sent to ${this._username}: `, pin => {
              request.post({
                url: `${BASE_URL}/api/v4/account/${body.account.id}/client/${body.client.id}/pin/verify`,
                json: true,
                headers: headers,
                body: {
                  pin: `${pin}`,
                }
              }, (err, response, body) => {
                if (err || _statusCodeIsError(response)) {
                  return reject(new BlinkAuthenticationException(`Authentication problem: ${body.message}`));
                }
                if (!body.region) {
                  return reject(new BlinkAuthenticationException(`Authentication problem: ${body.message}`));
                }
                for (var key in body.region) {
                  this._region_id = key;
                  this._region = body.region[key];
                }
                authenticate(body);
              });
              rl.close();
            });
          }
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

  getIDs(name_or_id) {
    var that = this;
    return new Promise((resolve, reject) => {
      if (!this._auth_header) {
        reject(new BlinkException("You have to be authenticated before calling this method"));
      }
      request({
        url: this.urls.networks_url,
        headers: this._auth_header,
        json: true
      }, (err, response, body) => {
        if (err || _statusCodeIsError(response)) {
          reject(new BlinkException(`Can't retrieve system status`));
        } else {
          var network = false;
          if (typeof name_or_id != 'undefined') {
            body.networks.forEach(function(n){
              if (n.id == name_or_id || n.name == name_or_id) {
                network = n;
                that._networks.push(network);
              }
            });

            if (!network) {
              reject(new BlinkException("No network found for " + name_or_id));
            }
          } else {
            if (!body.networks.length) {
              reject(new BlinkException("No networks found"));
            }
            body.networks.forEach(network => {
              that._networks.push(network);
            });
          }

          that._account_id = that._networks[0].account_id;
          that.urls = new BlinkURLHandler(that.regionId);
          resolve(that);
        }
      });
    });
  }
};
