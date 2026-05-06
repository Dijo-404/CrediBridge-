import { FastifyInstance } from 'fastify';

export async function registerSessionRoutes(app: FastifyInstance) {
	app.post('/api/sessions/create', async (_request, reply) => {
		reply.code(501).send({ error: 'Not implemented' });
	});
}
