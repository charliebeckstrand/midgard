'use client'

import { useRouter } from 'next/navigation'
import { Button } from 'rune'

export function LogoutButton() {
	const router = useRouter()

	async function logout() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		router.push('/login')
	}

	return <Button onClick={logout}>Sign out</Button>
}
