const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Tried in order. If the first model is overloaded (503) or missing (404),
// the next one is used. You can override with GEMINI_MODELS in .env
// (comma separated).
const MODELS = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-2.5-flash,gemini-flash-lite-latest')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (err) => String((err && err.message) || err || '');
const isMissing = (err) => /\b404\b/.test(text(err));
const isRetryable = (err) =>
  /\b(429|500|502|503|504)\b/.test(text(err)) || /overloaded|high demand|unavailable|quota/i.test(text(err));
// "fetch failed" and friends mean this computer could not reach Google at all (internet, DNS, firewall).
//const isNetwork = (err) => /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ENETUNREACH|socket hang up|timed out|timeout/i.test(text(err));
const isNetwork = (err) => /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ENETUNREACH|socket hang up|timed out|timeout|aborted|abort/i.test(text(err));
async function generate(parts, { json = false, temperature = 0.2 } = {}) {
  let lastErr;
  let netFails = 0;
  for (const name of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: name,
            generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) },
          },
          { timeout: 120000 } // never wait more than 120 seconds for one answer
        );
        const result = await model.generateContent(parts);
        return result.response.text();
      } catch (err) {
        lastErr = err;
        if (isNetwork(err)) {
          // Another model will not help when Google cannot be reached. Try once more, then stop.
          netFails += 1;
          if (netFails >= 4) throw err;
          await sleep(1500);
          //continue;
          break;
        }
        if (isMissing(err)) break; // this model name does not exist -> next model
        if (!isRetryable(err)) throw err; // bad key etc. -> stop right away
        await sleep(1500 * (attempt + 1)); // busy -> wait a little and retry
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
