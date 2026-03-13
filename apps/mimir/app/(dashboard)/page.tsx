import { LogoutButton } from './logout-button'

export default function DashboardPage() {
	return (
		<div className="text-center space-y-4">
			<h1 className="text-3xl font-semibold">Welcome</h1>

			<p className="text-gray-500">You are signed in.</p>

			<LogoutButton />
		</div>
	)
}
