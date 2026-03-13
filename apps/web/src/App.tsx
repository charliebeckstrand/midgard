import type { JSX } from 'react'
import {
	createBrowserRouter,
	Navigate,
	Outlet,
	RouterProvider,
	useRouteLoaderData,
} from 'react-router-dom'

import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

type SessionResponse = {
	authenticated?: boolean
}

type AuthLoaderData = {
	authenticated: boolean
}

async function authLoader(): Promise<AuthLoaderData> {
	try {
		const response = await fetch('/auth/session')

		if (!response.ok) {
			throw new Error('Session check failed')
		}

		const data = (await response.json()) as SessionResponse

		return { authenticated: data.authenticated === true }
	} catch {
		return { authenticated: false }
	}
}

function useAuthLoaderData() {
	return useRouteLoaderData('root') as AuthLoaderData
}

function ProtectedRoute() {
	const { authenticated } = useAuthLoaderData()

	if (!authenticated) {
		return <Navigate to="/login" replace />
	}

	return <DashboardPage />
}

function GuestRoute({ children }: { children: JSX.Element }) {
	const { authenticated } = useAuthLoaderData()

	if (authenticated) {
		return <Navigate to="/" replace />
	}

	return children
}

const router = createBrowserRouter([
	{
		path: '/',
		id: 'root',
		loader: authLoader,
		element: <Outlet />,
		children: [
			{
				index: true,
				element: <ProtectedRoute />,
			},
			{
				path: 'login',
				element: (
					<GuestRoute>
						<LoginPage />
					</GuestRoute>
				),
			},
			{
				path: 'register',
				element: (
					<GuestRoute>
						<RegisterPage />
					</GuestRoute>
				),
			},
		],
	},
])

export function App() {
	return <RouterProvider router={router} />
}
