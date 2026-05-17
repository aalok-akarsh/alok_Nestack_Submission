class MemoryStore {
  constructor() {
    this.records = new Map();
  }

  checkAndIncrement(key, rule, now = Date.now()) {
    const windowMs = rule.windowSeconds * 1000;
    const existing = this.records.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      const record = { count: 1, windowStart: now };
      this.records.set(key, record);

      return {
        allowed: true,
        count: record.count,
        retryAfterSeconds: 0,
      };
    }

    const elapsedMs = now - existing.windowStart;
    const retryAfterSeconds = Math.max(0, Math.ceil((windowMs - elapsedMs) / 1000));

    if (existing.count >= rule.limit) {
      return {
        allowed: false,
        count: existing.count,
        retryAfterSeconds,
      };
    }

    existing.count += 1;

    return {
      allowed: true,
      count: existing.count,
      retryAfterSeconds,
    };
  }

  clear() {
    this.records.clear();
  }
}

module.exports = MemoryStore;
