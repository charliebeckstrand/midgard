'use client'

import { Button } from 'catalyst'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
	const router = useRouter()

	async function logout() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.push('/login')
	}

	return <Button onClick={logout}>Sign out</Button>
}
