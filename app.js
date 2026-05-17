const express = require('express');
const endpointType = require('./middleware/endpointType');
const { createRateLimiter } = require('./middleware/rateLimiter');

function okHandler(req, res) {
  res.status(200).json({ ok: true });
}

function createApp(options = {}) {
  const app = express();
  const rateLimiter = createRateLimiter(options.store);

  app.use(express.json());

  app.get('/', (req, res) => {
    res.status(200).json({
      ok: true,
      service: 'context-aware-rate-limiter',
      routes: [
        'POST /ai/generate',
        'POST /ai/summarise',
        'GET /data/list',
        'GET /data/export',
      ],
    });
  });

  app.post('/ai/generate', endpointType('ai'), rateLimiter, okHandler);
  app.post('/ai/summarise', endpointType('ai'), rateLimiter, okHandler);
  app.get('/data/list', endpointType('read'), rateLimiter, okHandler);
  app.get('/data/export', endpointType('read'), rateLimiter, okHandler);

  return app;
}

module.exports = createApp;
