import { useEffect, useState } from 'react'

export function UserName({ id }: { id: string }) {
	const [user, setUser] = useState<{ name: string } | null>(null)

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			const res = await fetch(`/api/users/${id}`)

			const data = await res.json()

			if (!cancelled) setUser(data)
		}

		load()

		return () => {
			cancelled = true
		}
	}, [id])

	return <span>{user?.name}</span>
}
