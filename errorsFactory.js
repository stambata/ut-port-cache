module.exports = ({defineError, getError, fetchErrors}) => {
    if (!getError('cache')) {
        const Cache = defineError('cache', null, 'cache error', 'error');
        defineError('get', Cache, 'cache get error', 'error');
        defineError('set', Cache, 'cache set error', 'error');
        defineError('del', Cache, 'cache del error', 'error');
        const Client = defineError('client', Cache, 'cache client error', 'error');
        defineError('notProvided', Client, 'cache client not provided', 'error');
        defineError('notSupported', Client, '{client} cache client not supported', 'error');
        defineError('initError', Client, '{client} cache client init error', 'error');
    }
    return fetchErrors('cache');
};
