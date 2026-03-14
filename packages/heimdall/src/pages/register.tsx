'use client'

import { AuthLayout, Button, Field, Heading, Input, Label, Strong, Text, TextLink } from 'catalyst'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

function RegisterForm() {
	const router = useRouter()

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()

		if (password !== confirmPassword) {
			setError('Passwords do not match')

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

			const data = await res.json()

			console.log('data', data)

			setError(data.message || 'Registration failed. Please check your details and try again.')
		} catch {
			setError('Registration failed. Please try again later.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
			<Heading>Create your account</Heading>

			{error && <p className="text-sm text-red-500">{error}</p>}

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
				<Label>Full name</Label>
				<Input name="name" required value={name} onChange={(e) => setName(e.target.value)} />
			</Field>

			<Field>
				<Label>Password</Label>
				<Input
					type="password"
					name="password"
					required
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</Field>

			<Field>
				<Label>Confirm password</Label>
				<Input
					type="password"
					name="confirmPassword"
					required
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
				/>
			</Field>

			<Button type="submit" className="w-full" disabled={submitting}>
				Create account
			</Button>

			<Text>
				Already have an account?{' '}
				<TextLink href="/login">
					<Strong>Sign in</Strong>
				</TextLink>
			</Text>
		</form>
	)
}

export function RegisterPage() {
	return (
		<AuthLayout>
			<Suspense>
				<RegisterForm />
			</Suspense>
		</AuthLayout>
	)
}
