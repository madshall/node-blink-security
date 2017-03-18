/**
 * Created by madshall on 3/17/17.
 */

const BlinkException = require('./blink_exception');

module.exports = class BlinkAuthenticationException extends BlinkException {
  constructor(message) {
    super(message);
  }
};