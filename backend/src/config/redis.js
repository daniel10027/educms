const redis = require('redis');
require('dotenv').config();
const logger = require('../utils/logger');

let redisClient = null;
let isReady = false;

const enabled = process.env.REDIS_ENABLED === 'true' && !!process.env.REDIS_URL;

if (enabled) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });

  redisClient.on('connect', () => logger.info('Redis connecting...'));
  redisClient.on('ready', () => {
    isReady = true;
    logger.info('Redis client ready');
  });
  redisClient.on('error', (err) => {
    isReady = false;
    logger.error('Redis error', { error: err.message });
  });
  redisClient.on('end', () => {
    isReady = false;
  });

  redisClient.connect().catch((err) => {
    logger.error('Redis initial connection failed', { error: err.message });
  });
} else {
  logger.info('Redis disabled — running without cache layer.');
}

const cache = {
  get: async (key) => {
    if (!enabled || !isReady) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis GET error', { error: error.message });
      return null;
    }
  },

  set: async (key, value, expirationInSeconds = 3600) => {
    if (!enabled || !isReady) return false;
    try {
      await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error', { error: error.message });
      return false;
    }
  },

  del: async (key) => {
    if (!enabled || !isReady) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { error: error.message });
      return false;
    }
  },

  delPattern: async (pattern) => {
    if (!enabled || !isReady) return false;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(keys);
      return true;
    } catch (error) {
      logger.error('Redis DEL pattern error', { error: error.message });
      return false;
    }
  },

  isEnabled: () => enabled && isReady,
};

module.exports = { redisClient, cache };
