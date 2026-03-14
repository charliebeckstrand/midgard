import { cookies } from 'next/headers'

type SessionUser = {
	email: string
	name?: string
}

export async function getUser(): Promise<{ user?: SessionUser }> {
	const cookieStore = await cookies()

	const cookieHeader = cookieStore.toString()

	try {
		const res = await fetch(`${process.env.BIFROST_URL || 'http://localhost:4000'}/auth/user`, {
			headers: { cookie: cookieHeader },
		})

		if (!res.ok) return { user: undefined }

		const data = await res.json()

		return { user: data }
	} catch {
		return { user: undefined }
	}
}
