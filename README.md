# Incident Copilot

An on-call agent that **remembers every past incident** — its symptom, root
cause, and fix — and uses that memory to diagnose new incidents faster, and
to spot recurring/systemic problems before a human would notice the pattern.

Built with:
- [Hindsight](https://github.com/vectorize-io/hindsight) for persistent agent memory (`retain`, `recall`, `reflect`)
- [Groq](https://groq.com) for LLM inference (`openai/gpt-oss-120b`)
- Node.js + Express, plain HTML/JS frontend (no build step)

## Why memory matters here

Without memory, an LLM given an error log gives generic, textbook advice.
With Hindsight, this agent:
1. **Recalls** similar past incidents before answering, and grounds its
   diagnosis in what actually happened last time (dates, root causes, fixes).
2. **Reflects** across incidents to catch recurring/systemic issues a human
   might miss buried in ticket history (e.g. "this is the 3rd Redis timeout
   this quarter, same underlying cause").
3. **Retains** every newly resolved incident, so the agent gets measurably
   smarter with every use — the core loop the whole project demonstrates.

## Setup

```bash
npm install
cp .env.example .env
# fill in GROQ_API_KEY and HINDSIGHT_API_KEY in .env
```

Seed the memory bank with realistic past incidents so the demo has history
to recall from the first live query:

```bash
npm run seed
```

Run the app:

```bash
npm start
```

Open http://localhost:3000

## Demo script (for the video)

1. Report a **brand-new** kind of incident → show it's a "cold start," no
   memory match, generic diagnosis.
2. Report something close to a seeded incident (e.g. "Redis timeouts on
   checkout-api again") → show it recalling the exact past incident and
   grounding the diagnosis in it.
3. Report a 3rd Redis-flavored incident → show the **pattern detection**
   panel firing, calling out the recurring root cause.
4. Resolve a new incident live → show it get retained → ask a similar
   question again → show the agent already knows about it.
