import { cache } from 'react'
import { bifrost } from './fetch'

export type User = {
	id: string
	email: string
	is_active: boolean
	is_verified: boolean
	created_at: string
	updated_at: string
}

export const getUser = cache(async (): Promise<User | undefined> => {
	try {
		const res = await bifrost('/auth/user')

		if (res.status === 401) return undefined

		if (!res.ok) {
			console.error(`auth: GET /auth/user failed (${res.status})`)

			return undefined
		}

		return (await res.json()) as User
	} catch (error) {
		console.error('auth: GET /auth/user threw', error)

		return undefined
	}
})
