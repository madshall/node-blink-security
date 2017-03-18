/**
 * Created by madshall on 3/17/17.
 */

module.exports = class BlinkURLHandler {
  constructor(region_id) {
    this.base_url = 'https://' + region_id + '.' + BLINK_URL;
    this.home_url = this.base_url + '/homescreen';
    this.event_url = this.base_url + '/events/network/';
    this.network_url = this.base_url + '/network/';
    this.networks_url = this.base_url + '/networks';
  }
};