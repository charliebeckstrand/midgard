import { cookies } from 'next/headers'

export async function getSession(): Promise<{ authenticated: boolean }> {
	const cookieStore = await cookies()
	const cookieHeader = cookieStore.toString()

	try {
		const res = await fetch(`${process.env.BIFROST_URL || 'http://localhost:4000'}/auth/session`, {
			headers: { cookie: cookieHeader },
		})

		if (!res.ok) return { authenticated: false }

		const data = (await res.json()) as { authenticated?: boolean }
		return { authenticated: data.authenticated === true }
	} catch {
		return { authenticated: false }
	}
}
