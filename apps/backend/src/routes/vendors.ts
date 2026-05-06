import { FastifyInstance } from 'fastify';

export async function registerVendorRoutes(app: FastifyInstance) {
	app.post('/api/vendors', async (_request, reply) => {
		reply.code(501).send({ error: 'Not implemented' });
	});
}
