export async function POST(request: Request) {
	const payload = await request.json();
	const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

	const response = await fetch(`${backendUrl}/api/sessions/create`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
	});

	const data = await response.json();
	return Response.json(data, { status: response.status });
}
