require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { client: hindsight, BANK_ID } = require('./lib/hindsight');
const groq = require('./lib/groq');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DIAGNOSE_SYSTEM_PROMPT = `You are an on-call incident response copilot.
You will be given a new incident description, plus relevant memories of past
incidents (which may be empty if nothing similar has happened before).

Rules:
- If past incidents are relevant, ground your diagnosis in them explicitly
  ("This matches the incident from <date>...").
- If there are no relevant past incidents, say so plainly and give your best
  general diagnosis - do not fabricate a past incident.
- Be concise and concrete: likely root cause, then a suggested next step.
- Never invent incident dates or people that were not given to you.`;

const PATTERN_SYSTEM_PROMPT = `You detect recurring patterns across incidents.
Given a set of memories, say in 1-2 sentences whether they reveal a systemic,
recurring issue (e.g. the same root cause showing up more than once), and if
so, name it plainly. If there's no real pattern, say "No recurring pattern
detected yet."`;

// Step 1: report a new incident -> recall similar past ones -> ask Groq
app.post('/api/diagnose', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const recall = await hindsight.recall(BANK_ID, description);
    const memories = (recall.results || recall.memories || [])
      .map((m) => m.content || m.text || JSON.stringify(m))
      .slice(0, 8);

    const memoryBlock = memories.length
      ? memories.map((m, i) => `${i + 1}. ${m}`).join('\n')
      : '(no relevant past incidents found in memory)';

    const diagnosis = await groq.ask(
      DIAGNOSE_SYSTEM_PROMPT,
      `New incident:\n${description}\n\nRelevant memories:\n${memoryBlock}`
    );

    // Reflect: is this part of a recurring pattern?
    let pattern = null;
    if (memories.length >= 2) {
      try {
        const reflection = await hindsight.reflect(
          BANK_ID,
          `Recurring patterns related to: ${description}`
        );
        pattern = reflection.text || reflection.response || null;
      } catch (e) {
        pattern = null; // reflect is a bonus signal, never block the main response on it
      }
    }

    res.json({
      diagnosis,
      pattern,
      matchedMemoryCount: memories.length,
      memories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: once resolved, retain the full incident + fix back into memory
app.post('/api/resolve', async (req, res) => {
  try {
    const { service, symptom, rootCause, fix, resolvedBy } = req.body;
    if (!symptom || !fix) {
      return res.status(400).json({ error: 'symptom and fix are required' });
    }
    const date = new Date().toISOString().slice(0, 10);
    const content = `[Incident - ${date}] Service: ${service || 'unspecified'}. ` +
      `Symptom: ${symptom}. Root cause: ${rootCause || 'not specified'}. ` +
      `Fix applied: ${fix}. Resolved by: ${resolvedBy || 'demo user'}.`;

    await hindsight.retain(BANK_ID, content);
    res.json({ ok: true, retained: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Incident Copilot running on http://localhost:${PORT}`));
