const guid = (len = 32) => {
  let buf = [],
    chars = 'abcdef0123456789',
    charlen = chars.length;

  for (var i = 0; i < len; i++) {
    buf[i] = chars.charAt(Math.floor(Math.random() * charlen));
  }

  return buf.join('');
}

module.exports = {
  guid,
};