const EventEmitter = require('events');
const publicMethods = ['get', 'set', 'del'];
const lifecycleMethods = ['init', 'start', 'ready', 'stop'];
class CacheClient extends EventEmitter {
    constructor() {
        super();
        const notImplemented = publicMethods.concat(lifecycleMethods).filter(x => typeof this[x] !== 'function');
        if (notImplemented.length) {
            throw new Error(`Methods ${notImplemented} must be implemented`);
        }
    }
    get publicApi() {
        let client = this;
        return publicMethods.reduce((methods, method) => {
            methods[method] = async function(msg, $meta) {
                // this === port;
                return await client[method](msg, $meta);
            };
            return methods;
        }, {});
    }
};

module.exports = CacheClient;
