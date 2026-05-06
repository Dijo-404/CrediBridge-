const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

export async function POST(
	_request: Request,
	{ params }: { params: { id: string } }
) {
	const response = await fetch(
		`${BACKEND_URL}/api/sessions/${encodeURIComponent(params.id)}/settle`,
		{ method: 'POST' }
	);
	const data = await response.json();
	return Response.json(data, { status: response.status });
}
