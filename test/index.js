/* eslint-env node, mocha */
require('dotenv').config();
var chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-as-promised'));
chai.should();
require('replay');
var Blink = require('../index.js');

describe('Auth Token Login', () => {
  let blink;
  before(() => {
    blink = new Blink('', '', {_token: process.env.BLINK_AUTH_TOKEN, _region_id: process.env.BLINK_REGION_ID, _network_id:process.env.BLINK_NETWORK_ID});
    return blink.setupSystem().should.be.fulfilled;
  });
  after(() => {
    blink = null;
  });
  it('should get clients', () => {
    return blink.getClients().should.eventually.have.deep.property('clients');
  });
  it('should get cameras', () => {
    return blink.getIDs().should.eventually.have.deep.property('_cameras');
  });
});

describe('Password Login', () => {
  let blink;
  before(() => {
    blink = new Blink('username', 'password');
    return blink.setupSystem().should.be.fulfilled;
  });
  after(() => {
    blink = null;
  });
  it('should get clients', () => {
    return blink.getClients().should.eventually.have.deep.property('clients');
  });
  it('should get cameras', () => {
    return blink.getIDs().should.eventually.have.deep.property('_cameras');
  });
  it('should setupSystem properly', () => {
    return blink.should.have.deep.property('_cameras');
  });
});
