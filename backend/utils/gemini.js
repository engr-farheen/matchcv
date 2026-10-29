const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-lite-latest,gemini-flash-latest')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (err) => String((err && err.message) || err || '');
const isMissing = (err) => /\b404\b/.test(text(err));
const isRetryable = (err) =>
  /\b(429|500|502|503|504)\b/.test(text(err)) || /overloaded|high demand|unavailable|quota/i.test(text(err));
const isNetwork = (err) =>
  /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ENETUNREACH|socket hang up|timed out|timeout|aborted|abort/i.test(text(err));

async function generate(parts, { json = false, temperature = 0.2 } = {}) {
  let lastErr;
  for (const name of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: name,
            generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) },
          },
          { timeout: 40000 }
        );
        const result = await model.generateContent(parts);
        return result.response.text();
      } catch (err) {
        lastErr = err;
        console.error('Gemini failed:', name, 'attempt', attempt, text(err));
        if (isMissing(err)) break; // model nahi mila -> agla model
        if (isNetwork(err)) break; // der lagi -> agla model
        if (!isRetryable(err)) throw err; // galat key waghera -> ruk jao
        await sleep(1500 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

function parseJSON(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function generateJSON(parts, opts) {
  const raw = await generate(parts, { ...opts, json: true });
  return parseJSON(raw);
}

module.exports = { generate, generateJSON };
