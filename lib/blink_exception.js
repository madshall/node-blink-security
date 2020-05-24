/**
 * Created by madshall on 3/17/17.
 */

module.exports = class BlinkException extends Error {
  constructor(message, response = {}) {
    message = `${message}: ${response.body}`;
    super(message);
  }
};
