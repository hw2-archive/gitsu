var path = require('path');
var md5 = require('./md5');
var readJson = require('./readJson');

function Utils () {
}

/**
 * 
 * @param {type} decEndpoint
 * @param {type} name if not specified, will be used that one from decEndpoint
 * @returns {unresolved}
 */
Utils.uniqueId = function (decEndpoint, name) {
    name = (name != "" && name) || decEndpoint.name;

    // add a custom prefix to avoid collisions
    return md5(name + ':') + Utils.fetchingId(decEndpoint);
};

Utils.fetchingId = function (decEndpoint) {
    return (decEndpoint._originalSource || decEndpoint.source) + '#' + decEndpoint.target;
};

Utils.resolvedId = function (decEndpoint) {
    var name = decEndpoint.name;

    return name;
};

/**
 * 
 * @param {type} decEndpoint
 * @param {type} name if not specified, will be used that one from decEndpoint for uniqueid
 * @returns {unresolved}
 */
Utils.getGuid = function (decEndpoint, name) {
    return {
        id: Utils.uniqueId(decEndpoint, name),
        fId: Utils.fetchingId(decEndpoint),
        rId: Utils.resolvedId(decEndpoint)
    };
};

Utils.readPkgMeta = function (dir) {
    var filename = path.join(dir, '.gitsu.json');

    return readJson(filename)
            .spread(function (json) {
                return json;
            });
};

module.exports = Utils;

