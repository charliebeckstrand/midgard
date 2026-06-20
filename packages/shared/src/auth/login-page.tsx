'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type FormSubmitHandler } from 'ui/form'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { Link } from 'ui/link'
import { PasswordInput } from 'ui/password-input'
import { Text } from 'ui/text'
import { chain, email, required } from './form-validators'

type LoginValues = { email: string; password: string }

function LoginForm({ showRegisterLink }: { showRegisterLink: boolean }) {
	const router = useRouter()

	const searchParams = useSearchParams()

	const [serverError, setServerError] = useState('')

	const registered = searchParams.get('registered') === 'true'

	const handleSubmit: FormSubmitHandler<LoginValues> = async (values) => {
		try {
			const res = await fetch('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: values.email, password: values.password }),
			})

			if (res.ok) {
				router.push('/')

				return
			}

			const data = await res.json()

			setServerError(data.message || 'Login failed. Please check your credentials and try again.')
		} catch {
			setServerError('An unexpected error occurred. Please try again later.')
		}
	}

	return (
		<AuthLayout>
			<Form<LoginValues>
				defaultValues={{ email: '', password: '' }}
				validate={{
					email: chain(required(), email()),
					password: chain(required()),
				}}
				onSubmit={handleSubmit}
				className="grid gap-6 w-full sm:max-w-sm p-6"
			>
				<Heading className="text-center">Sign in to your account</Heading>

				{serverError && <Text variant="error">{serverError}</Text>}

				{registered && <Text variant="success">Account created successfully. Please sign in.</Text>}

				<Field>
					<Label>Email</Label>
					<Input type="email" name="email" autoComplete="email" />
					<Message name="email" />
				</Field>

				<Field>
					<Label>Password</Label>
					<PasswordInput name="password" autoComplete="current-password" />
					<Message name="password" />
				</Field>

				<Button type="submit" className="w-full">
					Sign in
				</Button>

				{showRegisterLink && (
					<div className="text-center">
						<Text>
							Don't have an account?{' '}
							<Link href="/register" underline>
								Create one
							</Link>
						</Text>
					</div>
				)}
			</Form>
		</AuthLayout>
	)
}

export function LoginPage({ showRegisterLink = true }: { showRegisterLink?: boolean }) {
	return (
		<Suspense>
			<LoginForm showRegisterLink={showRegisterLink} />
		</Suspense>
	)
}
