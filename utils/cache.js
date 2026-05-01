const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: process.env.CACHE_TTL || 300 });

module.exports = {
  get: (key) => cache.get(key),
  /** @param {number} [ttl] segundos; si se omite, usa stdTTL de NodeCache */
  set: (key, value, ttl) =>
    ttl !== undefined && ttl !== null && Number.isFinite(ttl)
      ? cache.set(key, value, ttl)
      : cache.set(key, value),
};
