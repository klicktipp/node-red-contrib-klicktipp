function getSessionHeaders(msg) {
	return {
		sessionId: msg.klicktipp.sessionId,
		sessionName: msg.klicktipp.sessionName,
	};
}

module.exports = getSessionHeaders;
