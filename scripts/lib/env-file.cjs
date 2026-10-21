const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Same rules as the former bash reader: NAME=value lines only, the value is everything after the first '='.
function parseEnvFile(text) {
  return text.split(/\r?\n/).flatMap(line => {
    const separator = line.indexOf('=');
    if (separator < 0) return [];
    const name = line.slice(0, separator);
    return NAME.test(name) ? [[name, line.slice(separator + 1)]] : [];
  });
}

module.exports = { parseEnvFile };
