'use strict';
const errorsFactory = require('./errorsFactory');
const Catbox = require('catbox');
module.exports = (params = {}) => {
    const Port = params.parent;
    class UtPortCache extends Port {
        constructor(params = {}) {
            super(params);
            this.config = this.merge({
                id: 'cache',
                type: 'cache',
                logLevel: 'debug',
                client: {// catbox extension
                    engine: null, // catbox engine
                    options: {} // catbox engine options
                },
                policy: [/* {options, segment}, {options, segment} */] // array of catbox policies
            }, params.config);
            Object.assign(this.errors, errorsFactory(this.bus.errors));
        }

        init(...params) {
            const {engine, options} = this.config.client;
            this.client = new Catbox.Client(engine, options);
            return super.init(...params);
        }
        async start(...params) {
            await this.client.start();
            const methods = {
                get: ({key}) => this.client.get(key),
                set: ({key, value, ttl = 0}) => this.client.set(key, value, ttl),
                drop: ({key}) => this.client.drop(key)
            };
            if (Array.isArray(this.config.policy)) {
                this.config.policy.forEach(policyConfig => {
                    const {options = {}, segment} = policyConfig;
                    const policy = new Catbox.Policy(options, this.client, segment);
                    methods[`${segment}.get`] = ({id}) => policy.get(id);
                    methods[`${segment}.set`] = ({id, value, ttl = 0}) => policy.set(id, value, ttl);
                    methods[`${segment}.drop`] = ({id}) => policy.drop(id);
                });
            }
            this.bus.registerLocal(methods, this.config.id);
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
                        throw this.errors.cache(e);
                    });
            });
            const superStartResult = await super.start(...params);
            this.log.info && this.log.info({
                message: 'Bus methods successfully registered',
                methods: Object.keys(methods).map(method => `${this.config.id}.${method}`),
                $meta: {
                    mtid: 'event',
                    opcode: 'port.started'
                }
            });
            return superStartResult;
        }

        stop(...params) {
            this.client && this.client.stop();
            return super.stop(...params);
        }
    }
    return UtPortCache;
};
