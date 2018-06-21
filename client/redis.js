const CacheClient = require('./client');
const redis = require('redis');
class RedisClient extends CacheClient {
    constructor(options = {}) {
        super();
        this.client = null;
        this.options = options;
    }
    init() {
        // not implemented
    }
    start() {
        return new Promise((resolve, reject) => {
            let proceeded = false;
            const proceed = result => {
                if (!proceeded) {
                    proceeded = true;
                    return result && result instanceof Error ? reject(result) : resolve(result);
                } else if (result instanceof Error) {
                    this.emit('error', result);
                }
            };
            const retryStrategy = this.options.retry_strategy;
            this.options.retry_strategy = options => {
                let result;
                if (typeof retryStrategy === 'function') {
                    result = retryStrategy(options);
                    if (typeof result === 'number') {
                        return result;
                    }
                }
                if (result instanceof Error) {
                    proceed(result);
                } else if (options.error) {
                    proceed(options.error);
                } else {
                    proceed(new Error('redis cache client failed to reconnect!'));
                }
                return result;
            };
            this.client = redis.createClient(this.options);
            this.client.on('ready', proceed);
        });
    }
    ready() {
        // not implemented
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
    stop(flush) {
        if (this.client) {
            this.client.end(flush); // maybe this.client.quit();
            this.client.unref();
        }
    }
};

module.exports = RedisClient;
