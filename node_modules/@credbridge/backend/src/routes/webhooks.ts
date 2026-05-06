import { FastifyInstance } from 'fastify';

export async function registerWebhookRoutes(app: FastifyInstance) {
	app.post('/webhooks/dodo', async (_request, reply) => {
		reply.code(501).send({ error: 'Not implemented' });
	});
}
