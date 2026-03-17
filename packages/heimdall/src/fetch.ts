import { cookies } from 'next/headers'
import { BIFROST_URL } from './env'

export async function bifrost(path: string, init: RequestInit = {}): Promise<Response> {
	const cookieStore = await cookies()

	return fetch(`${BIFROST_URL}${path}`, {
		...init,
		headers: {
			...init.headers,
			cookie: cookieStore.toString(),
		},
	})
}
