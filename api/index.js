// Simple Vercel serverless function
export default function handler(request, response) {
  if (request.url === '/api/health') {
    response.status(200).json({ ok: true, message: 'Backend rodando' });
  } else {
    response.status(404).json({ error: 'Not found' });
  }
}

