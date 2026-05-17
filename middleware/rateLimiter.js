const { getRule, normalizeTier } = require('../config/limits');
const MemoryStore = require('../config/store/memoryStore');

const defaultStore = new MemoryStore();

function getUserIdentifier(req) {
  return req.get('X-User-Id') || req.ip || req.socket.remoteAddress || 'anonymous';
}

function createRateLimiter(store = defaultStore) {
  return function rateLimiter(req, res, next) {
    const tier = normalizeTier(req.get('X-User-Tier'));
    const endpointType = req.endpointType;
    const rule = getRule(tier, endpointType);

    if (!rule) {
      return res.status(500).json({
        error: 'rate_limit_rule_not_found',
      });
    }

    const userIdentifier = getUserIdentifier(req);
    const key = `${userIdentifier}:${tier}:${endpointType}`;
    const result = store.checkAndIncrement(key, rule);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        limit: rule.limit,
        window_seconds: rule.windowSeconds,
        retry_after_seconds: result.retryAfterSeconds,
      });
    }

    return next();
  };
}

module.exports = {
  createRateLimiter,
  defaultStore,
};
