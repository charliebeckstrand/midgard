'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { SubmitEvent } from 'react'
import { useState } from 'react'
import { Button, Card, Form, Input, Label, Link } from 'rune'

const errors = {
	invalid_credentials: 'Invalid email or password.',
	login_failed: 'Login failed. Please try again.',
}

export function LoginForm() {
	const router = useRouter()

	const searchParams = useSearchParams()

	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')

	const registered = searchParams.get('registered') === 'true'

	async function handleSubmit(e: SubmitEvent) {
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
		<div className="min-w-xs space-y-4">
			<h1 className="text-2xl font-semibold text-center">Sign in</h1>

			{registered && (
				<p className="text-sm text-green-500 text-center">
					Account created successfully. Please sign in.
				</p>
			)}

			{error && <p className="text-sm text-red-500 text-center">{error}</p>}

			<Card>
				<Form onSubmit={handleSubmit}>
					<div className="flex flex-col gap-2">
						<Label htmlFor="email">Email</Label>

						<Input
							inputType="email"
							name="email"
							id="email"
							placeholder="you@example.com"
							required
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="password">Password</Label>

						<Input
							inputType="password"
							name="password"
							id="password"
							placeholder="Password"
							required
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>

					<Button type="default" disabled={submitting}>
						Sign in
					</Button>
				</Form>
			</Card>

			<p className="text-sm text-center text-gray-500">
				Don't have an account? <Link href="/register">Create one</Link>
			</p>
		</div>
	)
}
