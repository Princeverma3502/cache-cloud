const redis = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

const client = redis.createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
    }
});

client.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async () => {
    if (!client.isOpen) await client.connect();
};

module.exports = {
    connectRedis,
    get: async (key) => {
        const val = await client.get(key);
        return val ? JSON.parse(val) : null;
    },
    set: async (key, value, ttl) => {
        await client.set(key, JSON.stringify(value), { EX: ttl });
    },
    client
};