import { useNavigate } from 'react-router-dom'
import { Button } from 'rune'

export function DashboardPage() {
	const navigate = useNavigate()

	async function logout() {
		await fetch('/auth/logout', { method: 'POST' }).catch(() => {})

		navigate('/login')
	}

	return (
		<div className="text-center space-y-4">
			<h1 className="text-3xl font-semibold">Welcome</h1>

			<p className="text-gray-500">You are signed in.</p>

			<Button onClick={logout}>Sign out</Button>
		</div>
	)
}
