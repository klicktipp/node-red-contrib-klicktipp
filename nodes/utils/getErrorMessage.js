/**
 * Extracts a user-friendly error message from various HTTP or KlickTipp API error formats.
 *
 * Supports:
 * - KlickTipp array errors (e.g. `["Wrong username or password."]`)
 * - Error objects with `message` or `error` fields
 * - HTTP client errors with `response.data` / `response.body`
 *
 * @param {any} err - The error object returned from an API request or thrown internally.
 *
 * @returns {string} A normalized error message suitable for display in the UI.
 */
function getErrorMessage(err) {
	const body = err?.response?.data ?? err?.response?.body ?? err?.body;

	if (Array.isArray(body) && body[0]) return String(body[0]);
	if (body?.message) return String(body.message);
	if (body?.error) return String(body.error);

	return err?.message ? String(err.message) : 'Connection test failed';
}

module.exports = getErrorMessage;
