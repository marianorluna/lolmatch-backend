const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 300 });

module.exports = {
  get: (key) => cache.get(key),
  set: (key, value) => cache.set(key, value),
};
