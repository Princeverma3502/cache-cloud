const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

let userConfigs = {};
let globalTraffic = [];

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json());

const allowedOrigins = ['http://localhost:3000', 'https://cloud-shield.vercel.app'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true
}));

const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.body.clientId || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  handler: (req, res) => res.status(429).json({ error: "Rate limit" })
});

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Error:", err.message);
    return res.status(401).json({ error: "Invalid token signature" });
  }
};

app.get('/shield.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const BACKEND_URL = `https://${req.get('host')}`;
  res.send(`
    (function() {
      const scriptTag = document.currentScript;
      const clientId = scriptTag.getAttribute('data-client-id');
      if(!clientId) return;
      fetch('${BACKEND_URL}/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({ clientId, origin: window.location.hostname, path: window.location.pathname })
      }).catch(() => {});
    })();
  `);
});

const telemetrySchema = z.object({
  clientId: z.string().min(10),
  origin: z.string().min(3),
  path: z.string().default('/')
}).strict();

app.post('/api/telemetry', telemetryLimiter, async (req, res) => {
  const validation = telemetrySchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: "Invalid data" });
  const { clientId, origin, path } = validation.data;
  if (!userConfigs[clientId]) {
    const { data } = await supabase.from('user_configs').select('ttl, domains').eq('user_id', clientId).single();
    userConfigs[clientId] = data || { ttl: 60, domains: [] };
  }
  const config = userConfigs[clientId];
  if (!config.domains.includes(origin) && !['localhost', '127.0.0.1'].includes(origin)) {
    return res.status(403).json({ error: "Unauthorized domain" });
  }
  const entry = {
    clientId, origin, path, timestamp: new Date(),
    status: Math.random() > 0.1 ? 'HIT' : 'MISS',
    latency: Math.floor(Math.random() * 50) + 10,
    geo: { lat: (Math.random() * 140 - 70), lon: (Math.random() * 360 - 180) }
  };
  globalTraffic.push(entry);
  if (globalTraffic.length > 500) globalTraffic.shift();
  res.status(202).json({ status: "recorded" });
});

app.get('/api/performance', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "Missing ID" });
  if (!userConfigs[clientId]) {
    const { data } = await supabase.from('user_configs').select('ttl, domains').eq('user_id', clientId).single();
    userConfigs[clientId] = data || { ttl: 60, domains: [] };
  }
  const data = globalTraffic.filter(t => t.clientId === clientId);
  const hits = data.filter(t => t.status === 'HIT').length;
  res.json({ hits, misses: data.length - hits, ttl: userConfigs[clientId].ttl, domains: userConfigs[clientId].domains });
});

app.get('/api/logs', (req, res) => {
  const { clientId } = req.query;
  res.json(globalTraffic.filter(t => t.clientId === clientId).slice(-20).reverse());
});

app.post('/api/settings', requireAuth, async (req, res) => {
  const userId = req.user.sub || req.user.id;
  const { ttl, domains } = req.body;
  const parsedDomains = Array.isArray(domains) ? domains.map(d => d.toLowerCase().trim()) : [];
  const { data, error } = await supabase.from('user_configs').upsert({
    user_id: userId, ttl: parseInt(ttl) || 60, domains: parsedDomains, updated_at: new Date()
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  userConfigs[userId] = { ttl: data.ttl, domains: data.domains };
  res.json({ success: true, config: userConfigs[userId] });
});

app.post('/api/purge', requireAuth, (req, res) => {
  const userId = req.user.sub || req.user.id;
  globalTraffic = globalTraffic.filter(t => t.clientId !== userId);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Live on ${PORT}`));