const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

export async function POST(request: Request) {
	const payload = await request.json();
	const response = await fetch(`${BACKEND_URL}/api/vendors`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
	});
	const data = await response.json();
	return Response.json(data, { status: response.status });
}

export async function GET() {
	const response = await fetch(`${BACKEND_URL}/api/vendors`, {
		cache: 'no-store',
	});
	const data = await response.json();
	return Response.json(data, { status: response.status });
}
