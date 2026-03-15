import { bifrost } from './fetch'

export async function getSession(): Promise<{ authenticated: boolean }> {
	try {
		const res = await bifrost('/auth/session')

		if (!res.ok) return { authenticated: false }

		const data = (await res.json()) as { authenticated?: boolean }

		return { authenticated: data.authenticated === true }
	} catch {
		return { authenticated: false }
	}
}
