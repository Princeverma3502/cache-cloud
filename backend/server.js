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

app.use(helmet());
app.use(express.json());

const whitelist = ['http://localhost:3000', process.env.FRONTEND_URL];
const strictCors = cors({
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
});

const telemetryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return req.body.clientId || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests, slow down.",
      retryAfter: "60 seconds"
    });
  }
});

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

app.get('/shield.js', cors(), (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const BACKEND_URL = process.env.BACKEND_URL || `https://${req.get('host')}`;

  const scriptContent = `
    (function() {
      const scriptTag = document.currentScript;
      const clientId = scriptTag.getAttribute('data-client-id');
      if(!clientId || clientId.length < 10) return;

      fetch('${BACKEND_URL}/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        body: JSON.stringify({ 
          clientId, 
          origin: window.location.hostname,
          path: window.location.pathname
        })
      }).catch(err => {});
    })();
  `;
  res.send(scriptContent);
});

const telemetrySchema = z.object({
  clientId: z.string().min(10).max(100),
  origin: z.string().min(3).max(200),
  path: z.string().max(500).default('/')
}).strict();

app.options('/api/telemetry', cors());
app.post('/api/telemetry', cors(), telemetryLimiter, async (req, res) => {
  const validation = telemetrySchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({ 
      error: "Malformed telemetry data", 
      details: validation.error.issues 
    });
  }

  const { clientId, origin, path } = validation.data;
  const safeClientId = sanitizeHtml(clientId, { allowedTags: [] });
  const safeOrigin = sanitizeHtml(origin, { allowedTags: [] });
  const safePath = sanitizeHtml(path, { allowedTags: [] });

  if (!userConfigs[safeClientId]) {
    const { data, error } = await supabase
      .from('user_configs')
      .select('ttl, domains')
      .eq('user_id', safeClientId)
      .single();
      
    if (data) {
      userConfigs[safeClientId] = { ttl: data.ttl, domains: data.domains };
    } else {
      userConfigs[safeClientId] = { ttl: 60, domains: [] };
    }
  }

  const clientConfig = userConfigs[safeClientId];
  const whitelist = clientConfig.domains || [];

  if (whitelist.length === 0) {
    return res.status(403).json({ error: "Zero-Trust enforced: No domains whitelisted." });
  }

  const isAllowed = whitelist.includes(safeOrigin) || safeOrigin.includes('localhost') || safeOrigin === '127.0.0.1';
  
  if (!isAllowed) {
    return res.status(403).json({ error: "Origin domain not whitelisted." });
  }
  
  const entry = {
    clientId: safeClientId,
    origin: safeOrigin,
    path: safePath,
    timestamp: new Date(),
    status: Math.random() > 0.1 ? 'HIT' : 'MISS',
    latency: Math.floor(Math.random() * 50) + 10,
    geo: { lat: (Math.random() * 140 - 70), lon: (Math.random() * 360 - 180) }
  };

  globalTraffic.push(entry);
  if (globalTraffic.length > 500) globalTraffic.shift(); 
  
  res.status(202).json({ status: "recorded" });
});

app.get('/api/performance', strictCors, async (req, res) => {
  const { clientId } = req.query;
  const data = clientId ? globalTraffic.filter(t => t.clientId === clientId) : globalTraffic;
  const hits = data.filter(t => t.status === 'HIT').length;
  const misses = data.filter(t => t.status === 'MISS').length;
  
  if (clientId && !userConfigs[clientId]) {
    const { data: dbData } = await supabase
      .from('user_configs')
      .select('ttl, domains')
      .eq('user_id', clientId)
      .single();
    
    if (dbData) {
      userConfigs[clientId] = { ttl: dbData.ttl, domains: dbData.domains };
    } else {
      userConfigs[clientId] = { ttl: 60, domains: [] };
    }
  }

  const clientConfig = userConfigs[clientId] || { ttl: 60, domains: [] };

  res.json({ 
    hits, misses, totalSavedMs: hits * 45,
    ttl: clientConfig.ttl, 
    domains: clientConfig.domains 
  });
});

app.get('/api/logs', strictCors, (req, res) => {
  const { clientId } = req.query;
  const data = clientId ? globalTraffic.filter(t => t.clientId === clientId) : globalTraffic;
  res.json(data.slice(-20).reverse());
});

app.post('/api/settings', strictCors, requireAuth, async (req, res) => {
  const userId = req.user.sub; 
  
  const newTtl = parseInt(req.body.ttl);
  const newDomains = req.body.domains || [];
  
  let parsedDomains = [];
  if (Array.isArray(newDomains)) {
    parsedDomains = newDomains.map(d => 
      d.toLowerCase().replace(/^https?:\/\//, '').trim()
    );
  }

  const { data, error } = await supabase
    .from('user_configs')
    .upsert({
      user_id: userId,
      ttl: isNaN(newTtl) ? 60 : newTtl,
      domains: parsedDomains,
      updated_at: new Date()
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: "Database error" });
  }

  userConfigs[userId] = { ttl: data.ttl, domains: data.domains };
  
  res.json({ success: true, message: "Settings updated securely", config: userConfigs[userId] });
});

app.post('/api/purge', strictCors, requireAuth, (req, res) => {
  const userId = req.user.sub;
  globalTraffic = globalTraffic.filter(t => t.clientId !== userId);
  res.json({ success: true, message: "Your cache purged securely" });
});

app.listen(PORT, () => console.log(`Backend Live on port ${PORT}`));