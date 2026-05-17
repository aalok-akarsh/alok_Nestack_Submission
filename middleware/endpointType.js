function endpointType(type) {
  return function tagEndpoint(req, res, next) {
    req.endpointType = type;
    next();
  };
}

module.exports = endpointType;
