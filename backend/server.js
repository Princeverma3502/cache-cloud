require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectRedis } = require('./src/services/redisService');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-admin-auth']
}));

app.use(express.json());

app.get('/health', (req, res) => res.status(200).json({ status: 'active', timestamp: new Date() }));

app.use('/api', apiRoutes);

const start = async () => {
    try {
        await connectRedis();
        // Use '0.0.0.0' so the cloud provider's network can route traffic to the app
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 CloudShield Engine running on port ${PORT}`);
            console.log(`🛡️ Admin Protection: ${process.env.ADMIN_PASSPHRASE ? 'ENABLED' : 'DISABLED (Warning!)'}`);
            console.log(`🌐 Allowed Origins: ${allowedOrigins.join(', ')}`);
        });
    } catch (err) {
        console.error("❌ Failed to start server:", err);
        process.exit(1);
    }
};

start();