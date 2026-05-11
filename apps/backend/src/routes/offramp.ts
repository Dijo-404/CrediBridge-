import { FastifyInstance } from 'fastify';
import { getSession, getVendor } from '../db/store.js';
import { executeOfframp } from '../services/offramp.js';

export async function registerOfframpRoutes(app: FastifyInstance) {
	app.post('/api/offramp/mock', async (request, reply) => {
		const body = request.body as { sessionId?: string };
		if (!body?.sessionId) {
			reply.code(400).send({ error: 'sessionId is required' });
			return;
		}

		const session = await getSession(body.sessionId);
		if (!session) {
			reply.code(404).send({ error: 'Session not found' });
			return;
		}

		const vendor = await getVendor(session.vendor_id);
		if (!vendor) {
			reply.code(404).send({ error: 'Vendor not found' });
			return;
		}

		const offramp = await executeOfframp(session, vendor);
		reply.send({ offramp });
	});

	app.get('/api/fx-rate', async (_request, reply) => {
		const { getUsdToInrRate } = await import('../services/fx.js');
		const data = await getUsdToInrRate();
		reply.send(data);
	});
}
