'use strict';

const Module = require('module');

function loadModuleWithMocks(modulePath, mocks = {}) {
	const resolvedModulePath = require.resolve(modulePath);
	delete require.cache[resolvedModulePath];

	const originalLoad = Module._load;

	Module._load = function patchedLoad(request, parent, isMain) {
		if (Object.prototype.hasOwnProperty.call(mocks, request)) {
			return mocks[request];
		}

		try {
			const resolvedRequest = Module._resolveFilename(request, parent);
			if (Object.prototype.hasOwnProperty.call(mocks, resolvedRequest)) {
				return mocks[resolvedRequest];
			}
		} catch (error) {}

		return originalLoad.call(this, request, parent, isMain);
	};

	try {
		return require(resolvedModulePath);
	} finally {
		Module._load = originalLoad;
	}
}

module.exports = loadModuleWithMocks;
