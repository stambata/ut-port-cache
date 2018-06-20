const CacheClient = require('./client');
const redis = require('redis');
class RedisClient extends CacheClient {
    constructor(options = {}) {
        super();
        this.client = null;
        this.options = options;
    }
    init() {

    }
    start() {
        return new Promise((resolve, reject) => {
            const retryStrategy = this.options.retry_strategy;
            this.options.retry_strategy = options => {

            };
            this.client = redis.createClient(this.options);
            this.client.on('ready', () => {
                return resolve();
            });
        });
    }
    ready() {

    }
    get({key}) {
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, result) => {
                return err ? reject(err) : resolve(result);
            });
        });
    }
    set({key, value}) {
        return new Promise((resolve, reject) => {
            this.client.set(key, value, err => {
                return err ? reject(err) : resolve(true);
            });
        });
    }
    del({key}) {
        return new Promise((resolve, reject) => {
            this.client.del(key, (err, result) => {
                return err ? reject(err) : resolve(true);
            });
        });
    }
    stop() {
        this.client && this.client.quit();
    }
};

module.exports = RedisClient;
