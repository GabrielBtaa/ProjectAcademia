const fs = require('fs');
const path = require('path');

// Simple Vercel serverless function
export default function handler(request, response) {
  const url = request.url;

  if (url === '/api/health') {
    response.status(200).json({ ok: true, message: 'Backend rodando' });
    return;
  }

  // Serve static files
  const publicPath = path.join(process.cwd(), 'public');
  let filePath = path.join(publicPath, url);

  // If requesting root, serve index.html
  if (url === '/' || url === '') {
    filePath = path.join(publicPath, 'index.html');
  }

  // Check if file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    let contentType = 'text/plain';

    switch (ext) {
      case '.html':
        contentType = 'text/html';
        break;
      case '.css':
        contentType = 'text/css';
        break;
      case '.js':
        contentType = 'application/javascript';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }

    const fileContent = fs.readFileSync(filePath);
    response.setHeader('Content-Type', contentType);
    response.status(200).send(fileContent);
    return;
  }

  // For SPA routing, serve index.html for any non-API, non-static routes
  if (!url.startsWith('/api/')) {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath);
      response.setHeader('Content-Type', 'text/html');
      response.status(200).send(indexContent);
      return;
    }
  }

  response.status(404).json({ error: 'Not found' });
}

