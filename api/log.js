/**
 * Vercel Serverless Function: /api/log
 * Receives client-side log events (errors, sync status, etc.) and outputs them
 * to Vercel's server logs so they're visible in the Vercel Dashboard → Logs panel.
 */
export default function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { level, message, data, timestamp } = req.body || {};

  const logEntry = {
    timestamp: timestamp || new Date().toISOString(),
    level: level || 'info',
    message: message || 'No message',
    data: data || null
  };

  // Log to Vercel's server logs (visible in Dashboard → Logs)
  switch (logEntry.level) {
    case 'error':
      console.error(`[PARAMARA ERROR] ${logEntry.message}`, logEntry.data ? JSON.stringify(logEntry.data) : '');
      break;
    case 'warn':
      console.warn(`[PARAMARA WARN] ${logEntry.message}`, logEntry.data ? JSON.stringify(logEntry.data) : '');
      break;
    default:
      console.log(`[PARAMARA ${logEntry.level.toUpperCase()}] ${logEntry.message}`, logEntry.data ? JSON.stringify(logEntry.data) : '');
  }

  return res.status(200).json({ ok: true });
}
