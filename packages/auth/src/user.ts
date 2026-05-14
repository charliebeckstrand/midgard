import { bifrost } from './fetch'

export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	created_at: string
	updated_at: string
}

export async function getUser(): Promise<User | undefined> {
	try {
		const res = await bifrost('/auth/user')

		if (!res.ok) return undefined

		return (await res.json()) as User
	} catch {
		return undefined
	}
}
