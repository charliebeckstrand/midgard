'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SubmitEvent } from 'react'
import { useState } from 'react'
import { Button, Card, Form, Input, Label } from 'rune'

const errors = {
	email_exists: 'An account with that email already exists.',
	registeration_failed: 'Registration failed. Please try again.',
	password_mismatch: 'Passwords do not match.',
}

export default function RegisterPage() {
	const router = useRouter()

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()

		if (password !== confirmPassword) {
			setError(errors.password_mismatch)

			setSubmitting(false)

			return
		}

		try {
			const res = await fetch('/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, name }),
			})

			if (res.ok) {
				router.push('/login?registered=true')

				return
			}

			const data = (await res.json().catch(() => ({}))) as { code?: string }

			setError(data.code === 'email_exists' ? errors.email_exists : errors.registeration_failed)
		} catch {
			setError(errors.registeration_failed)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="w-full min-w-[18rem] space-y-4">
			<h1 className="text-2xl font-semibold text-center">Create account</h1>

			{error && <p className="text-sm text-red-500 text-center">{error}</p>}

			<Card padding="medium" shadow="small">
				<Form onSubmit={handleSubmit}>
					<div className="flex flex-col gap-2">
						<Label htmlFor="name">Name</Label>

						<Input
							inputType="text"
							name="name"
							id="name"
							placeholder="Jane Doe"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="email">Email</Label>

						<Input
							inputType="email"
							name="email"
							id="email"
							placeholder="you@example.com"
							required
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
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="confirmPassword">Confirm password</Label>

						<Input
							inputType="password"
							name="confirmPassword"
							id="confirmPassword"
							placeholder="Confirm password"
							required
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
					</div>

					<Button type="default" disabled={submitting}>
						Create account
					</Button>
				</Form>
			</Card>

			<p className="text-sm text-center text-gray-500">
				Already have an account?{' '}
				<Link href="/login" className="text-blue-500 hover:underline">
					Sign in
				</Link>
			</p>
		</div>
	)
}
