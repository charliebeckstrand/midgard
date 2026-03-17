import { bifrost } from './fetch'

export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	created_at: string
	updated_at: string
}

export async function getUser(): Promise<{ user?: User }> {
	try {
		const res = await bifrost('/auth/user')

		if (!res.ok) return { user: undefined }

		const data = await res.json()

		return { user: data }
	} catch {
		return { user: undefined }
	}
}
