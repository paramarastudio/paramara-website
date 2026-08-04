/**
 * Remote Logger — sends important events to /api/log so they appear in Vercel Dashboard Logs.
 * Also logs to browser console as usual.
 * 
 * Usage:
 *   import { remoteLog } from './services/remoteLogger';
 *   remoteLog.error('Firebase sync failed', { error: err.message });
 *   remoteLog.info('Screenshot scanned', { sessionId: '123' });
 */

const LOG_ENDPOINT = '/api/log';

async function sendLog(level, message, data = null) {
  // Always log to browser console
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[consoleMethod](`[Paramara] ${message}`, data || '');

  // Send to Vercel serverless function (fire-and-forget, non-blocking)
  try {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {}); // Silently ignore network errors
  } catch (e) {
    // Ignore — logging should never break the app
  }
}

export const remoteLog = {
  info: (message, data) => sendLog('info', message, data),
  warn: (message, data) => sendLog('warn', message, data),
  error: (message, data) => sendLog('error', message, data),
  sync: (message, data) => sendLog('sync', message, data),
};
