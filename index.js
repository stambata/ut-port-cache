'use strict';
const errorsFactory = require('./errorsFactory');
module.exports = (params = {}) => {
    const Port = params.parent;
    class UtPortCache extends Port {
        constructor(params = {}) {
            super(params);
            this.config = this.merge({
                id: 'cache',
                type: 'cache',
                logLevel: 'debug',
                client: {
                    type: 'redis',
                    config: {}
                }
            }, params.config);
            Object.assign(this.errors, errorsFactory(this.bus.errors));
        }

        init(...params) {
            if (!this.config.client || typeof this.config.client.type !== 'string') {
                throw this.errors['cache.client.notProvided']({config: this.config});
            }
            let Client;
            switch (this.config.client.type) {
                case 'redis':
                    Client = require('./client/redis');
                    break;
                default:
                    throw this.errors['cache.client.notSupported']({
                        params: {
                            client: this.config.client.type
                        }
                    });
            }
            try {
                this.client = new Client(this.config.client.config);
            } catch (e) {
                throw this.errors['cache.client']({
                    cause: e,
                    params: {
                        client: this.config.client.type
                    }
                });
            }
            this.client.on('error', e => {
                this.log.error && this.log.error(e);
            });
            this.bus.registerLocal(this.client.publicApi, this.config.id);
            return this.triggerLifecycleEvent('init', params);
        }
        start(...params) {
            this.bus.importMethods(this.config, [this.config.id], {request: true, response: true}, this);
            this.pull((msg = {}, $meta = {}) => {
                const method = $meta.method;
                if (!method) {
                    throw this.bus.errors.missingMethod();
                }
                if (typeof this.config[method] !== 'function') {
                    throw this.bus.errors.methodNotFound({params: {method}});
                }
                return this.config[method](msg, $meta)
                    .catch(e => {
                        throw this.errors[`cache.${method.pop()}`](e);
                    });
            });
            return this.triggerLifecycleEvent('start', params);
        }

        ready(...params) {
            return this.triggerLifecycleEvent('ready', params);
        }

        stop(...params) {
            return this.triggerLifecycleEvent('stop', params);
        }

        async triggerLifecycleEvent(event, params) {
            try {
                await this.client[event]();
            } catch (e) {
                throw this.errors[`cache.client.${event}`]({
                    cause: e,
                    params: {
                        client: this.config.client.type
                    }
                });
            }
            return super[event](...params);
        }
    }
    return UtPortCache;
};
