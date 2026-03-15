const express = require('express');
const cors = require('cors');
const responseTime = require('response-time');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CLOUDSHIELD CONFIGURATION ---
let config = {
  ttl: 60,
  cacheEnabled: true,
  healthStatus: 'stable'
};

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Latency Tracking Header: Captures processing time for the Health Pulse
app.use(responseTime((req, res, time) => {
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

// --- 3. SYSTEM UTILITIES ---

// Keep-Alive Function: Pings itself every 14 minutes to prevent Render sleep
const startKeepAlive = () => {
  const URL = process.env.BACKEND_URL || `http://localhost:${PORT}/health`;
  setInterval(async () => {
    try {
      await axios.get(URL);
      console.log(`[STABILITY] Self-ping successful at ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      console.error("[STABILITY] Self-ping failed.");
    }
  }, 14 * 60 * 1000); 
};

// --- 4. API ENDPOINTS ---

// Performance Telemetry
app.get('/api/performance', (req, res) => {
  // Simulating dynamic infrastructure metrics
  res.json({
    hits: Math.floor(Math.random() * 500) + 1500,
    misses: Math.floor(Math.random() * 200) + 100,
    coalesced: Math.floor(Math.random() * 150) + 50,
    totalSavedMs: 125400,
    ttl: config.ttl
  });
});

// Live Traffic Logs with Geo-Coordinates
app.get('/api/logs', (req, res) => {
  const mockLogs = [
    { status: 'HIT', url: '/api/v1/users', latency: 14, geo: { lat: 40.7128, lon: -74.0060 } },
    { status: 'MISS', url: '/api/v1/search', latency: 450, geo: { lat: 35.6762, lon: 139.6503 } },
    { status: 'HIT', url: '/api/v1/auth', latency: 9, geo: { lat: 51.5074, lon: -0.1278 } },
    { status: 'HIT', url: '/api/v1/data', latency: 22, geo: { lat: -33.8688, lon: 151.2093 } },
    { status: 'MISS', url: '/images/hero.png', latency: 890, geo: { lat: 48.8566, lon: 2.3522 } }
  ];
  res.json(mockLogs);
});

// Update System TTL from Dashboard Slider
app.post('/api/settings', (req, res) => {
  const { ttl } = req.body;
  if (ttl) {
    config.ttl = ttl;
    console.log(`[CONTROL] Global TTL set to ${ttl}s`);
    return res.json({ success: true, ttl: config.ttl });
  }
  res.status(400).json({ error: "Invalid TTL" });
});

// Global Cache Purge Trigger
app.post('/api/purge', (req, res) => {
  console.log("[CONTROL] Global Cache Purge Executed");
  res.json({ success: true, message: "All edge nodes invalidated" });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- 5. INITIALIZATION ---
app.listen(PORT, () => {
  console.log(`
  🛡️  CloudShield Infrastructure Online
  🌐 Port: ${PORT}
  📡 Monitoring: Latency / Cache / Geo-Traffic
  `);
  
  startKeepAlive();
});