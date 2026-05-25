/**
 * Creates a Node-RED admin endpoint that always fetches fresh data.
 *
 * @param {object} RED - The Node-RED runtime object used to register HTTP routes and manage credentials.
 * @param {object} options - Endpoint configuration.
 * @param {string} options.endpoint - The HTTP admin route to register.
 * @param {function} options.fetchFunction - Async function that fetches data using stored credentials.
 * @returns {void}
 */
function createApiEndpoint(RED, options) {
	RED.httpAdmin.get(options.endpoint, async (req, res) => {
		try {
			const configId = req.headers['config-id'];

			if (!configId) {
				return res.status(400).json({ error: 'Configuration is missing' });
			}

			const credentials = RED.nodes.getCredentials(configId);
			if (!credentials || !credentials.username || !credentials.password) {
				return res.status(400).json({ error: 'Credentials are missing' });
			}

			const { username, password } = credentials;
			const data = await options.fetchFunction(username, password);

			return res.json(data);
		} catch (error) {
			console.error('Error fetching data:', error);
			return res.status(500).json({
				error: 'Failed to fetch data',
				message: error?.response?.data || error?.message,
			});
		}
	});
}

module.exports = createApiEndpoint;
