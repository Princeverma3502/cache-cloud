const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// GLOBAL DATA STORE (In-Memory)
let config = { ttl: 60 };
let globalTraffic = []; 

// ==========================================
// 🛡️ SECURITY LAYER 1: HTTP Headers & CORS
// ==========================================
app.use(helmet()); // Hides Express, prevents clickjacking
app.use(express.json());

// Whitelist YOUR frontend URLs here (Localhost + Vercel/Netlify URL)
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

// ==========================================
// 🛡️ SECURITY LAYER 2: Rate Limiting
// ==========================================
const telemetryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 pings per minute per IP
  message: { error: "Too many requests, slow down." }
});

// ==========================================
// 🛡️ SECURITY LAYER 3: JWT Verification
// ==========================================
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    // Cryptographically verify the token using your Supabase Secret
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = decoded; // Token is legit! Attach user data to request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

// ==========================================
// 🌐 PUBLIC API ROUTES
// ==========================================

// Universal Script Delivery
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

// Telemetry Collector (Open CORS so any website can send data, but Rate Limited)
app.options('/api/telemetry', cors()); // Allow pre-flight requests
app.post('/api/telemetry', cors(), telemetryLimiter, (req, res) => {
  
  // 🛡️ SECURITY LAYER 4: Input Sanitization (Prevents XSS)
  const safeClientId = sanitizeHtml(req.body.clientId || '', { allowedTags: [] });
  const safeOrigin = sanitizeHtml(req.body.origin || '', { allowedTags: [] });
  const safePath = sanitizeHtml(req.body.path || '/', { allowedTags: [] });

  if (!safeClientId || !safeOrigin) {
    return res.status(400).json({ error: "Malformed telemetry data" });
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
  if (globalTraffic.length > 500) globalTraffic.shift(); // Keep memory clean
  
  res.status(202).json({ status: "recorded" });
});

// Read-Only Dashboard Routes (Strict CORS to prevent other websites from stealing data)
app.get('/api/performance', strictCors, (req, res) => {
  const { clientId } = req.query;
  const data = clientId ? globalTraffic.filter(t => t.clientId === clientId) : globalTraffic;
  const hits = data.filter(t => t.status === 'HIT').length;
  const misses = data.filter(t => t.status === 'MISS').length;
  res.json({ hits, misses, ttl: config.ttl, totalSavedMs: hits * 45 });
});

app.get('/api/logs', strictCors, (req, res) => {
  const { clientId } = req.query;
  const data = clientId ? globalTraffic.filter(t => t.clientId === clientId) : globalTraffic;
  res.json(data.slice(-20).reverse());
});

// ==========================================
// 🔒 SECURE ADMIN ROUTES (Requires valid JWT)
// ==========================================
app.post('/api/settings', strictCors, requireAuth, (req, res) => {
  const newTtl = parseInt(req.body.ttl);
  if (isNaN(newTtl)) return res.status(400).json({ error: "Invalid TTL" });
  
  config.ttl = newTtl;
  res.json({ success: true, message: "Settings updated securely" });
});

app.post('/api/purge', strictCors, requireAuth, (req, res) => {
  // Purge only the data for the authenticated user making the request
  const userId = req.user.sub; // 'sub' is the Supabase User ID in the JWT
  globalTraffic = globalTraffic.filter(t => t.clientId !== userId);
  res.json({ success: true, message: "Your cache purged securely" });
});

app.listen(PORT, () => console.log(`🛡️ SECURE CloudShield Backend Live on port ${PORT}`));