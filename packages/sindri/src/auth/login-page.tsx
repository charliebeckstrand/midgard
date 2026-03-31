'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from 'ui/button'
import { ErrorMessage, Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'
import { LoginPage as LoginPageLayout } from 'ui/pages'
import { ShinyText } from 'ui/react-bits/shiny-text'
import { Text } from 'ui/text'
import { PasswordInput } from './password-input'
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
		<LoginPageLayout
			onSubmit={handleSubmit}
			serverError={serverError}
			submit={
				<Button
					type="submit"
					className={`w-full ${submitting ? 'cursor-not-allowed pointer-events-none' : ''}`}
				>
					Sign in
				</Button>
			}
			footer={
				showRegisterLink ? (
					<Text>
						Don't have an account? <Link href="/register">Create one</Link>
					</Text>
				) : undefined
			}
		>
			{registered && (
				<ShinyText
					text="Account created successfully. Please sign in."
					color="green"
					shineColor="lime"
					delay={5}
				/>
			)}

			<Field>
				<Label>Email</Label>
				<Input type="email" name="email" autoComplete="email" {...register('email')} />
				{errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
			</Field>

			<Field>
				<Label>Password</Label>
				<PasswordInput name="password" autoComplete="current-password" {...register('password')} />
				{errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
			</Field>
		</LoginPageLayout>
	)
}

export function LoginPage({ showRegisterLink = true }: { showRegisterLink?: boolean }) {
	return (
		<Suspense>
			<LoginForm showRegisterLink={showRegisterLink} />
		</Suspense>
	)
}
