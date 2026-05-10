const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from public directory (for Vercel)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend rodando', db: false });
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Vercel serverless handler
module.exports = (req, res) => {
  app(req, res);
};

