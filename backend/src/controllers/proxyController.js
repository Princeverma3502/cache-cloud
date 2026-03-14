const axios = require('axios');
const redisService = require('../services/redisService');
const dns = require('dns').promises;

let validApiKeys = new Set(['demo-key-123']); 
let stats = { hits: 0, misses: 0, coalesced: 0, totalSavedMs: 0 };
let logs = [];
let globalTTL = 60;
const pendingRequests = new Map();

const handleProxy = async (req, res) => {
    const targetUrl = req.query.url;
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || !validApiKeys.has(apiKey)) {
        return res.status(401).json({ error: "Invalid or missing API Key" });
    }

    if (!targetUrl) return res.status(400).json({ error: "URL is required" });

    try {
        const cached = await redisService.get(targetUrl);
        if (cached) {
            stats.hits++;
            stats.totalSavedMs += 150; 
            await addLog(targetUrl, 'HIT');
            return res.json(cached);
        }

        if (pendingRequests.has(targetUrl)) {
            stats.coalesced++;
            stats.totalSavedMs += 200; 
            await addLog(targetUrl, 'COALESCED');
            const data = await pendingRequests.get(targetUrl);
            return res.json(data);
        }

        stats.misses++;
        const fetchPromise = axios.get(targetUrl).then(r => r.data);
        pendingRequests.set(targetUrl, fetchPromise);
        
        const data = await fetchPromise;
        await redisService.set(targetUrl, data, globalTTL);
        pendingRequests.delete(targetUrl);
        
        await addLog(targetUrl, 'MISS');
        res.json(data);
    } catch (error) {
        pendingRequests.delete(targetUrl);
        res.status(500).json({ error: "Fetch failed" });
    }
};

const addLog = async (url, status) => {
    let lat = 0, lon = 0, country = "Unknown";
    try {
        const domain = new URL(url).hostname;
        const address = await dns.lookup(domain);
        const geoRes = await axios.get(`http://ip-api.com/json/${address.address}`);
        if(geoRes.data.status === 'success') {
            lat = geoRes.data.lat;
            lon = geoRes.data.lon;
            country = geoRes.data.country;
        }
    } catch (e) {}

    const newLog = {
        id: Math.random(),
        url: url.substring(0, 40),
        status,
        geo: { lat, lon, country },
        time: new Date().toLocaleTimeString()
    };
    logs = [newLog, ...logs].slice(0, 10);
};

const generateKey = (req, res) => {
    const newKey = `key_${Math.random().toString(36).substring(7)}`;
    validApiKeys.add(newKey);
    res.json({ apiKey: newKey });
};

module.exports = { 
    handleProxy, 
    getStats: (req, res) => res.json({ ...stats, ttl: globalTTL }), 
    getLogs: (req, res) => res.json(logs),
    generateKey,
    updateTTL: (req, res) => { globalTTL = req.body.ttl; res.json({ success: true }); },
    purgeCache: async (req, res) => {
        await redisService.client.flushAll();
        stats = { hits: 0, misses: 0, coalesced: 0, totalSavedMs: 0 };
        res.json({ success: true });
    }
};