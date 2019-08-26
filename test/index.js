/* eslint-env node, mocha */
require('dotenv').config();
var chai = require('chai');
chai.use(require('chai-http'));
chai.use(require('chai-as-promised'));
chai.should();
var replay = require('replay')
  , Blink = require('../index.js')
  , debug = require('debug')('test:index');

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
  const username = process.env.BLINK_USERNAME || 'username';
  const password = process.env.BLINK_PASSWORD || 'password';
  before(() => {
    blink = new Blink(username, password);
    return blink.setupSystem().should.be.fulfilled;
  });
  after(() => {
    blink = null;
  });
  it('should get clients', () => {
    return blink.getClients().should.eventually.have.deep.property('clients');
  });
  it('should get cameras', () => {
    blink.getIDs().then(_ => {
      console.log(blink.networks);
    })
    return blink.getIDs().should.eventually.have.deep.property('_cameras');
  });
  it('should setupSystem properly', () => {
    return blink.should.have.deep.property('_cameras');
  });
});

describe('expired auth token', () => {
  let blink;
  before(() => {
    replay.fixtures = './fixtures-failure/';
    debug('replay.fixtures:', replay.fixtures);
    blink = new Blink('', '', {
      _token: process.env.BLINK_AUTH_TOKEN,
      _region_id: process.env.BLINK_REGION_ID,
      _network_id:process.env.BLINK_NETWORK_ID}
    );
    return blink.setupSystem().should.be.rejected;
  });
  after(() => {
    blink = null;
  });
  it('should should reject due to failure', () => {
    return blink.getClients().should.be.rejected;
  });
  it('getIDs should reject', () => {
    return blink.getIDs().should.be.rejectedWith('Can\'t retrieve system status');
  });
});
