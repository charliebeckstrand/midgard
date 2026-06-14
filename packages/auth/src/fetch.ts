import { cookies } from 'next/headers'
import { BIFROST_URL } from './env'

export async function bifrost(path: string, init: RequestInit = {}): Promise<Response> {
	const cookieStore = await cookies()

	const headers = new Headers(init.headers)
	headers.set('cookie', cookieStore.toString())

	return fetch(`${BIFROST_URL}${path}`, { cache: 'no-store', ...init, headers })
}
