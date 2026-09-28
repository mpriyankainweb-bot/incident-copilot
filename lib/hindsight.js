require('dotenv').config();
const { HindsightClient } = require('@vectorize-io/hindsight-client');

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_BASE_URL,
  apiKey: process.env.HINDSIGHT_API_KEY,
});

const BANK_ID = process.env.HINDSIGHT_BANK_ID || 'incident-copilot-demo';

module.exports = { client, BANK_ID };
