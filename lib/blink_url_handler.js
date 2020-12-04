/**
 * Created by madshall on 3/17/17.
 */

module.exports = class BlinkURLHandler {
  constructor(account_id, region_id) {
    this.base_url = 'https://rest-' + region_id + '.' + BLINK_URL;
    this.network_url = this.base_url + '/network/';
    this.arm_url = this.base_url + `/api/v1/accounts/${account_id}/networks/`;
    this.video_url = this.base_url + `/api/v1/accounts/${account_id}/media/changed`;
    this.home_url = this.base_url + '/api/v3/accounts/' + account_id + '/homescreen';
  }
};
