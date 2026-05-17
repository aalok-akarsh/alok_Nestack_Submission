const WINDOW_SECONDS = 60;

const limits = {
  free: {
    ai: { limit: 5, windowSeconds: WINDOW_SECONDS },
    read: { limit: 30, windowSeconds: WINDOW_SECONDS },
  },
  paid: {
    ai: { limit: 30, windowSeconds: WINDOW_SECONDS },
    read: { limit: 120, windowSeconds: WINDOW_SECONDS },
  },
};

function normalizeTier(tier) {
  return tier === 'paid' || tier === 'free' ? tier : 'free';
}

function getRule(tier, endpointType) {
  const normalizedTier = normalizeTier(tier);
  return limits[normalizedTier][endpointType];
}

module.exports = {
  limits,
  normalizeTier,
  getRule,
};
