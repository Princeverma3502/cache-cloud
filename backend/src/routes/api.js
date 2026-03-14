const express = require('express');
const router = express.Router();
const proxyController = require('../controllers/proxyController');

const checkAdmin = (req, res, next) => {
    const auth = req.headers['x-admin-auth'];

    if (!process.env.ADMIN_PASSPHRASE) {
        console.error("CRITICAL: ADMIN_PASSPHRASE is not set in environment variables.");
        return res.status(500).json({ error: "Server configuration error" });
    }

    if (auth === process.env.ADMIN_PASSPHRASE) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Invalid Admin Passphrase" });
    }
};

// PUBLIC/USER ROUTES
router.get('/fetch', proxyController.handleProxy);
router.get('/performance', proxyController.getStats);
router.get('/logs', proxyController.getLogs);

//  PROTECTED ADMIN ROUTES
router.post('/ttl', checkAdmin, proxyController.updateTTL);
router.post('/key', checkAdmin, proxyController.generateKey);
router.delete('/purge', checkAdmin, proxyController.purgeCache);

module.exports = router;