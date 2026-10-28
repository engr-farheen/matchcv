// Turns raw errors (often from the AI service) into messages a user can act on.
// Technical details are only sent to the browser when NODE_ENV is not "production".
function friendlyMessage(err) {
  const m = String((err && err.message) || '');
  if (/API key not valid|API_KEY_INVALID|permission denied|403/i.test(m)) {
    return 'The AI service rejected the server key. Check GEMINI_API_KEY in the backend .env file.';
  }
  if (/\b429\b|quota|rate limit/i.test(m)) {
    return 'The AI service is at its free limit right now. Please try again in a few minutes.';
  }
  if (/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ENETUNREACH|socket hang up|timed out|timeout/i.test(m)) {
    return 'The server could not reach the AI service. This is usually your internet connection or DNS. Check your connection and try again.';
  }
  if (/\b(500|502|503|504)\b|overloaded|high demand|unavailable/i.test(m)) {
    return 'The AI service is busy right now. Please try again in a moment.';
  }
  return null;
}

function details(err) {
  return process.env.NODE_ENV === 'production' ? undefined : String((err && err.message) || err);
}

module.exports = { friendlyMessage, details };
