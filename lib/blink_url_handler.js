/**
 * Created by madshall on 3/17/17.
 */

module.exports = class BlinkURLHandler {
  constructor(region_id, network_id) {
    this.base_url = 'https://rest.' + region_id + '.' + BLINK_URL;
    this.event_url = this.base_url + '/events/network/';
    this.network_url = this.base_url + '/network/';
    this.networks_url = this.base_url + '/networks';
    this.video_url = this.base_url + '/api/v2/videos';
    if (network_id) {
        this.home_url = this.network_url + network_id + '/homescreen';
    } else {
        this.home_url = this.base_url + '/homescreen';
    }
  }
};