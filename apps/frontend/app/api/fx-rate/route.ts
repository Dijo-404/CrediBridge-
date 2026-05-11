export const revalidate = 300; // Cache 5 min at the Next.js edge

export async function GET() {
	const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
	try {
		const res = await fetch(`${backendUrl}/api/fx-rate`, {
			next: { revalidate: 300 },
		});
		if (!res.ok) throw new Error(`Backend FX rate ${res.status}`);
		const data = await res.json();
		return Response.json(data);
	} catch {
		return Response.json({ rate: 83.5, fetchedAt: Date.now(), source: 'fallback' });
	}
}
