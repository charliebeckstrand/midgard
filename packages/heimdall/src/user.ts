import { bifrost } from './fetch'

type SessionUser = {
	email: string
	name?: string
}

export async function getUser(): Promise<{ user?: SessionUser }> {
	try {
		const res = await bifrost('/auth/user')

		if (!res.ok) return { user: undefined }

		const data = await res.json()

		return { user: data }
	} catch {
		return { user: undefined }
	}
}
