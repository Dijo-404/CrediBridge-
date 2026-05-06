const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

export async function POST(request: Request) {
	const payload = await request.json();
	const response = await fetch(`${BACKEND_URL}/api/sessions/create`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
	});
	const data = await response.json();
	return Response.json(data, { status: response.status });
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const vendorId = url.searchParams.get('vendorId');
	const upstream = vendorId
		? `${BACKEND_URL}/api/sessions?vendorId=${encodeURIComponent(vendorId)}`
		: `${BACKEND_URL}/api/sessions`;
	const response = await fetch(upstream, { cache: 'no-store' });
	const data = await response.json();
	return Response.json(data, { status: response.status });
}
