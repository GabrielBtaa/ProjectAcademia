import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from public directory (for Vercel)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Simple health check without database
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend rodando', db: false });
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Vercel serverless handler
export default function handler(req, res) {
  app(req, res);
}

