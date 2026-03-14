'use client'

import { AuthLayout, Button, Field, Heading, Input, Label, Strong, Text, TextLink } from 'catalyst'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

const errors = {
	invalid_credentials: 'Invalid email or password.',
	login_failed: 'Login failed. Please try again.',
}

function LoginForm() {
	const router = useRouter()

	const searchParams = useSearchParams()

	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	const registered = searchParams.get('registered') === 'true'

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()

		try {
			const res = await fetch('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			})

			if (res.ok) {
				router.push('/')

				return
			}

			const data = (await res.json().catch(() => ({}))) as { message?: string }

			setError(data.message || errors.invalid_credentials)
		} catch {
			setError(errors.login_failed)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
			<Heading>Sign in to your account</Heading>

			{registered && (
				<p className="text-sm text-green-500">Account created successfully. Please sign in.</p>
			)}

			{error && <p className="text-sm text-red-500 ">{error}</p>}

			<Field>
				<Label>Email</Label>
				<Input
					type="email"
					name="email"
					required
					autoComplete="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
			</Field>

			<Field>
				<Label>Password</Label>
				<Input
					type="password"
					name="password"
					required
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</Field>

			<Button type="submit" className="w-full" disabled={submitting}>
				Sign in
			</Button>

			<Text>
				Don't have an account?{' '}
				<TextLink href="/register">
					<Strong>Create one</Strong>
				</TextLink>
			</Text>
		</form>
	)
}

export function LoginPage() {
	return (
		<AuthLayout>
			<Suspense>
				<LoginForm />
			</Suspense>
		</AuthLayout>
	)
}
