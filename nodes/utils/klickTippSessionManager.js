const makeRequest = require('./makeRequest');

function hasValidSession(session) {
	return Boolean(session?.sessionId && session?.sessionName);
}

function formatSession(session) {
	if (!hasValidSession(session)) {
		return 'none';
	}

	const sessionId = String(session.sessionId);
	const suffix = sessionId.slice(-6);

	return `${session.sessionName}=...${suffix}`;
}

function getOwnerLabel(owner) {
	return owner?.id ? `config:${owner.id}` : 'config:ad-hoc';
}

function authLog(message, meta = {}) {
	console.log('[klicktipp-auth]', message, meta);
}

function getAuthKey(username, password) {
	return `${username}\n${password}`;
}

function isAuthError(error) {
	const status = error?.response?.status ?? error?.statusCode;
	return status === 401 || status === 403;
}

async function login(username, password) {
	const loginResponse = await makeRequest('/account/login', 'POST', { username, password });

	const sessionId = loginResponse?.data?.sessid;
	const sessionName = loginResponse?.data?.session_name;

	if (!sessionId || !sessionName) {
		const error = new Error('Invalid credentials or session ID missing');
		error.statusCode = 401;
		throw error;
	}

	return { sessionId, sessionName };
}

async function createSession(owner, username, password, options = {}) {
	const { reason = 'initial' } = options;

	if (owner?._klickTippSessionPromise) {
		return owner._klickTippSessionPromise;
	}

	const authKey = getAuthKey(username, password);
	const sessionPromise = login(username, password)
		.then((sessionData) => {
			if (owner) {
				owner._klickTippSessionData = sessionData;
				owner._klickTippSessionAuthKey = authKey;
			}

			authLog(
				reason === 'reauth'
					? 'Created replacement session after auth failure'
					: 'Created initial session',
				{
					owner: getOwnerLabel(owner),
					session: formatSession(sessionData),
				},
			);

			return sessionData;
		})
		.finally(() => {
			if (owner) {
				owner._klickTippSessionPromise = null;
			}
		});

	if (owner) {
		owner._klickTippSessionPromise = sessionPromise;
	}

	return sessionPromise;
}

async function getSession(owner, username, password, options = {}) {
	const { forceRefresh = false, reason = 'initial' } = options;
	const authKey = getAuthKey(username, password);

	if (owner && owner._klickTippSessionAuthKey && owner._klickTippSessionAuthKey !== authKey) {
		authLog('Credentials changed, dropping cached session', {
			owner: getOwnerLabel(owner),
			session: formatSession(owner._klickTippSessionData),
		});
		owner._klickTippSessionData = null;
		owner._klickTippSessionAuthKey = null;
	}

	if (forceRefresh && owner) {
		owner._klickTippSessionData = null;
		owner._klickTippSessionAuthKey = null;
	}

	if (!forceRefresh && hasValidSession(owner?._klickTippSessionData)) {
		authLog('Reusing cached session', {
			owner: getOwnerLabel(owner),
			session: formatSession(owner._klickTippSessionData),
		});
		return owner._klickTippSessionData;
	}

	return createSession(owner, username, password, { reason });
}

function invalidateSession(owner, sessionData) {
	if (!owner) {
		return;
	}

	if (!sessionData || owner._klickTippSessionData === sessionData) {
		owner._klickTippSessionData = null;
		owner._klickTippSessionAuthKey = null;
	}
}

async function runWithSession(owner, username, password, requestFn) {
	let sessionData = await getSession(owner, username, password);

	try {
		return await requestFn(sessionData);
	} catch (error) {
		if (!isAuthError(error)) {
			throw error;
		}

			authLog('Received auth error, retrying with fresh session', {
				owner: getOwnerLabel(owner),
				session: formatSession(sessionData),
				status: error?.response?.status ?? error?.statusCode,
			});
			invalidateSession(owner, sessionData);
			sessionData = await getSession(owner, username, password, {
				forceRefresh: true,
				reason: 'reauth',
			});

		return await requestFn(sessionData);
	}
}

module.exports = {
	getSession,
	invalidateSession,
	isAuthError,
	runWithSession,
};
