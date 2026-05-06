const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

export async function GET(
	_request: Request,
	{ params }: { params: { id: string } }
) {
	const response = await fetch(
		`${BACKEND_URL}/api/sessions/${encodeURIComponent(params.id)}/efirc`,
		{ cache: 'no-store' }
	);
	if (!response.ok) {
		return Response.json(await response.json(), { status: response.status });
	}
	const arrayBuffer = await response.arrayBuffer();
	return new Response(arrayBuffer, {
		status: 200,
		headers: {
			'content-type': 'application/pdf',
			'content-disposition':
				response.headers.get('content-disposition') ??
				`attachment; filename="efirc-${params.id}.pdf"`,
		},
	});
}
