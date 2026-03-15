import { cookies } from 'next/headers'

export async function bifrost(path: string, init: RequestInit = {}): Promise<Response> {
	const base = process.env.BIFROST_URL || 'http://localhost:4000'

	const cookieStore = await cookies()

	return fetch(`${base}${path}`, {
		...init,
		headers: {
			...init.headers,
			cookie: cookieStore.toString(),
		},
	})
}
