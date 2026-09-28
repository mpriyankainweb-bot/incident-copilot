// Seeds Hindsight with realistic past incidents so the demo has memory
// to recall from the very first live interaction.
const { client, BANK_ID } = require('./lib/hindsight');

const incidents = [
  {
    date: '2026-06-03',
    service: 'checkout-api',
    symptom: 'Redis connection timeouts under load, requests hanging for 30s then failing with ECONNREFUSED',
    rootCause: 'Redis connection pool max size (10) too small for traffic spike during flash sale',
    fix: 'Increased REDIS_POOL_MAX from 10 to 50 and added connection retry with exponential backoff',
    resolvedBy: 'Priya',
  },
  {
    date: '2026-06-18',
    service: 'checkout-api',
    symptom: 'Redis timeouts again, same ECONNREFUSED pattern, started right after a marketing push notification',
    rootCause: 'Connection pool still undersized for viral traffic bursts even after the June 3 bump',
    fix: 'Moved to Redis Cluster mode and added autoscaling on pool size based on active connections metric',
    resolvedBy: 'Priya',
  },
  {
    date: '2026-07-02',
    service: 'auth-service',
    symptom: 'Users randomly logged out mid-session, JWT verification failing with "invalid signature"',
    rootCause: 'Two auth-service pods were running different JWT_SECRET values after a partial rolling deploy',
    fix: 'Moved JWT_SECRET to a shared secrets manager instead of pod-local env vars, added deploy health check that verifies secret consistency across pods',
    resolvedBy: 'Marcus',
  },
  {
    date: '2026-07-15',
    service: 'payments-worker',
    symptom: 'Duplicate charge events processed twice, customers billed twice for the same order',
    rootCause: 'Kafka consumer group rebalance during deploy caused at-least-once delivery to double-process in-flight messages, no idempotency key check',
    fix: 'Added idempotency key check against order_id before processing payment webhook',
    resolvedBy: 'Priya',
  },
  {
    date: '2026-08-01',
    service: 'checkout-api',
    symptom: 'Third Redis-related outage this quarter, timeouts spiking during Saturday evening peak traffic',
    rootCause: 'Root cause across all three incidents: Redis cluster sized for average load, not peak load, and no autoscaling policy was actually enforced in prod despite the July change',
    fix: 'Set a hard floor on Redis cluster nodes based on p99 historical peak traffic, added PagerDuty alert on pool utilization > 70%',
    resolvedBy: 'Devansh',
  },
  {
    date: '2026-08-20',
    service: 'notification-service',
    symptom: 'Push notifications delayed by 10+ minutes during peak hours',
    rootCause: 'Single-threaded notification dispatcher queue backing up, no horizontal scaling configured',
    fix: 'Split dispatcher into a worker pool of 5 processes reading from the same queue, added queue depth metric',
    resolvedBy: 'Marcus',
  },
  {
    date: '2026-09-05',
    service: 'auth-service',
    symptom: 'Login failures spiking again with "invalid signature" errors after a hotfix deploy',
    rootCause: 'A hotfix rolled back to an image that predated the shared secrets manager migration, reintroducing pod-local JWT secrets',
    fix: 'Blocked deploys of any image older than the secrets-manager migration commit via a CI guardrail',
    resolvedBy: 'Marcus',
  },
];

async function seed() {
  console.log(`Seeding ${incidents.length} past incidents into bank "${BANK_ID}"...`);
  for (const inc of incidents) {
    const content = `[Incident - ${inc.date}] Service: ${inc.service}. ` +
      `Symptom: ${inc.symptom}. Root cause: ${inc.rootCause}. ` +
      `Fix applied: ${inc.fix}. Resolved by: ${inc.resolvedBy}.`;
    await client.retain(BANK_ID, content);
    console.log(`  retained: ${inc.date} - ${inc.service}`);
  }
  console.log('Done. Memory bank is now warm for the demo.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
