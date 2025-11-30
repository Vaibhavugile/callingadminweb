// functions/index.js
// Node 20/24 + firebase-functions v2 API
// npm install @google-cloud/tasks

const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { CloudTasksClient } = require('@google-cloud/tasks');

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

// CONFIG via env vars (set these on deploy)
const PROJECT = process.env.TASKS_PROJECT || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
const LOCATION = process.env.TASKS_LOCATION || 'us-central1';
const QUEUE = process.env.TASKS_QUEUE || 'recalc-tenant-queue';
const TASK_WORKER_URL = process.env.TASK_WORKER_URL || process.env.TASK_WORKER || null; // must point to recalc worker URL
const TASK_SA_EMAIL = process.env.TASK_SA_EMAIL || null; // optional, recommended for OIDC auth
const DELAY_MINUTES = Number(process.env.RECALC_DELAY_MINUTES || '5'); // default 5 minutes
const WORKER_SECRET = process.env.WORKER_SECRET || null; // optional simple secret header for worker

if (!PROJECT) console.warn('PROJECT not set (TASKS_PROJECT)');
if (!TASK_WORKER_URL) console.warn('TASK_WORKER_URL not set - Cloud Tasks will not be able to call worker.');

// -------------------- helpers --------------------
const safeNum = (v) => {
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isInbound = (c) => !!(c && c.direction && String(c.direction).toLowerCase() === 'inbound');
const isOutbound = (c) => !!(c && c.direction && String(c.direction).toLowerCase() === 'outbound');
const isMissed = (c) => isInbound(c) && safeNum(c.durationInSeconds) === 0;
const isRejected = (c) => isOutbound(c) && safeNum(c.durationInSeconds) === 0;

async function recalcTenant(tid) {
  const leadsSnap = await db.collection(`tenants/${tid}/leads`).get();
  const leadIds = leadsSnap.docs.map((d) => d.id);

  const totals = {
    leadsCount: leadIds.length,
    callsCount: 0,
    inboundCount: 0,
    outboundCount: 0,
    missedCount: 0,
    rejectedCount: 0,
    totalDurationSeconds: 0,
    lastRecalcAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  for (const lid of leadIds) {
    const callsSnap = await db.collection(`tenants/${tid}/leads/${lid}/calls`).get();
    totals.callsCount += callsSnap.size;
    for (const cdoc of callsSnap.docs) {
      const c = cdoc.data() || {};
      const dur = safeNum(c.durationInSeconds);
      totals.totalDurationSeconds += dur;
      if (isInbound(c)) totals.inboundCount++;
      if (isOutbound(c)) totals.outboundCount++;
      if (isMissed(c)) totals.missedCount++;
      if (isRejected(c)) totals.rejectedCount++;
    }
  }

  await db.doc(`tenants/${tid}`).set(totals, { merge: true });
  return totals;
}

// -------------------- Cloud Tasks timestamp helper --------------------
function buildScheduleTimestamp(delayMinutes) {
  const nowMs = Date.now();
  const targetMs = nowMs + Math.max(0, Number(delayMinutes || 0)) * 60 * 1000;
  const seconds = Math.floor(targetMs / 1000);
  const nanos = Math.floor((targetMs % 1000) * 1e6);
  return { seconds, nanos };
}

// -------------------- Firestore trigger: schedule a delayed task --------------------
exports.onCallCreatedScheduleRecalc = onDocumentCreated('tenants/{tenant}/leads/{lead}/calls/{callId}', async (event) => {
  const tenantId = event.params && event.params.tenant;
  const callId = event.params && event.params.callId;
  if (!tenantId) {
    console.warn('onCallCreatedScheduleRecalc: missing tenant param', event.params);
    return;
  }

  // Quick optimistic counters (safe at creation)
  try {
    await db.doc(`tenants/${tenantId}`).set({ callsCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
  } catch (e) {
    console.warn('onCallCreatedScheduleRecalc: quick increment failed', e);
  }

  if (!PROJECT || !LOCATION || !QUEUE) {
    console.warn('onCallCreatedScheduleRecalc: TASKS config missing, skipping enqueue', { PROJECT, LOCATION, QUEUE });
    return;
  }
  if (!TASK_WORKER_URL) {
    console.warn('onCallCreatedScheduleRecalc: TASK_WORKER_URL not set; skipping task enqueue');
    return;
  }

  const client = new CloudTasksClient();
  const parent = client.queuePath(PROJECT, LOCATION, QUEUE);
  const payload = { tenantIds: [tenantId] };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  const scheduleTime = buildScheduleTimestamp(DELAY_MINUTES);

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: TASK_WORKER_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    },
    scheduleTime,
  };

  // oidc if configured, otherwise secret header fallback
  if (TASK_SA_EMAIL) {
    task.httpRequest.oidcToken = { serviceAccountEmail: TASK_SA_EMAIL };
  } else if (WORKER_SECRET) {
    task.httpRequest.headers['X-RECALC-SECRET'] = WORKER_SECRET;
  }

  try {
    const [response] = await client.createTask({ parent, task });
    console.log('onCallCreatedScheduleRecalc: enqueued task', response.name, 'tenantId=', tenantId, 'callId=', callId, 'scheduleTime=', scheduleTime);
  } catch (err) {
    console.error('onCallCreatedScheduleRecalc: createTask error', err, 'tenantId=', tenantId, 'callId=', callId);
  }
});

// -------------------- Worker: HTTP function that recalculates for tenant(s) --------------------
/**
 * Accepts either:
 * - Authorization: Bearer <OIDC token>  (Cloud Tasks with oidcToken)
 * - OR header X-RECALC-SECRET: <WORKER_SECRET> (fallback)
 */
exports.recalculateTenantWorker = onRequest(async (req, res) => {
  try {
    // AUTH: accept OIDC Bearer tokens OR the shared secret header (if set)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const providedSecret = req.headers['x-recalc-secret'] || req.headers['X-RECALC-SECRET'];

    const hasBearer = typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ');
    const hasValidSecret = WORKER_SECRET && providedSecret && providedSecret === WORKER_SECRET;

    if (WORKER_SECRET) {
      // If WORKER_SECRET is configured, accept either the secret OR a bearer token
      if (!hasValidSecret && !hasBearer) {
        console.warn('recalculateTenantWorker: invalid secret and no bearer token present');
        return res.status(403).send('forbidden');
      }
    } else {
      // If no secret configured, require bearer token (OIDC)
      if (!hasBearer) {
        console.warn('recalculateTenantWorker: no authentication provided');
        return res.status(403).send('forbidden');
      }
    }

    // Parse tenantIds
    let tenantIds = [];
    if (req.method === 'GET' && req.query && req.query.tenantId) {
      tenantIds = [req.query.tenantId];
    } else if (req.method === 'POST') {
      const body = req.body || {};
      if (Array.isArray(body.tenantIds)) tenantIds = body.tenantIds;
      else if (typeof body.tenantIds === 'string') tenantIds = [body.tenantIds];
    }

    if (!tenantIds || tenantIds.length === 0) {
      return res.status(400).send('missing tenantIds');
    }

    for (const tid of tenantIds) {
      try {
        const totals = await recalcTenant(tid);
        console.log('recalculateTenantWorker: processed', tid, totals);
      } catch (err) {
        console.error('recalculateTenantWorker: error processing tenant', tid, err);
      }
    }

    return res.status(200).send('ok');
  } catch (err) {
    console.error('recalculateTenantWorker error', err);
    return res.status(500).send(String(err));
  }
});
