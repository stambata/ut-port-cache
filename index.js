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

        async init(params) {
            if (!this.config.client || typeof this.config.client.type !== 'string') {
                throw this.errors['cache.client.notProvided']();
            }
            let Client;
            switch (this.config.client.type) {
                case 'redis':
                    Client = require('./client/redis');
                    break;
                default:
                    throw this.errors['cache.client.notSupported']({params: {client: this.config.client.type}});
            }
            try {
                this.client = new Client(this.config.client.config);
            } catch (e) {
                throw this.errors['cache.client.initError']({
                    cause: e,
                    params: {
                        client: this.config.client.type
                    }
                });
            }
            this.bus.registerLocal(this.client.publicApi, this.config.id);
            await this.client.init();
            return await super.init(params);
        }
        async start(params) {
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
                        throw this.errors[method](e);
                    });
            });
            await this.client.start();
            return await super.start(params);
        }

        async ready(params) {
            await this.client.ready();
            return super.ready(params);
        }

        async stop(params) {
            await this.client.stop();
            return super.stop(params);
        }
    }
    return UtPortCache;
};
