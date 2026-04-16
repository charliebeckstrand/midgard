'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from 'ui/button'
import { ErrorMessage, Field, Fieldset, Label } from 'ui/fieldset'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { PasswordInput } from 'ui/password-input'
import { Text } from 'ui/text'
import { useForm } from './use-form'
import { email, required } from './use-form-validation'

function LoginForm({ showRegisterLink }: { showRegisterLink: boolean }) {
	const router = useRouter()

	const searchParams = useSearchParams()

	const [submitting, setSubmitting] = useState(false)

	const [serverError, setServerError] = useState('')

	const registered = searchParams.get('registered') === 'true'

	const { register, errors, submit } = useForm({
		email: { validators: [required(), email()] },
		password: { validators: [required()] },
	})

	const handleSubmit = submit(async (values) => {
		setSubmitting(true)

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
		} finally {
			setSubmitting(false)
		}
	})

	return (
		<AuthLayout>
			<form onSubmit={handleSubmit} className="grid gap-8 w-full lg:max-w-sm">
				<Heading className="text-center">Sign in to your account</Heading>

				{serverError && <Text className="text-red-600 dark:text-red-600">{serverError}</Text>}

				{registered && (
					<Text className="text-green-600 dark:text-green-600">
						Account created successfully. Please sign in.
					</Text>
				)}

				<Fieldset disabled={submitting} className="grid gap-8">
					<Field>
						<Label>Email</Label>
						<Input type="email" name="email" autoComplete="email" {...register('email')} />
						{errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
					</Field>

					<Field>
						<Label>Password</Label>
						<PasswordInput
							name="password"
							autoComplete="current-password"
							{...register('password')}
						/>
						{errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
					</Field>

					<Button
						type="submit"
						className={`w-full ${submitting ? 'cursor-not-allowed pointer-events-none' : ''}`}
					>
						Sign in
					</Button>
				</Fieldset>

				{showRegisterLink && (
					<div className="text-center">
						<Text>
							Don't have an account?{' '}
							<Link href="/register" className="font-medium hover:underline underline-offset-6">
								Create one
							</Link>
						</Text>
					</div>
				)}
			</form>
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
