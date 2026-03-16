'use client'

import {
	AuthLayout,
	Button,
	ErrorMessage,
	Field,
	Heading,
	Input,
	Label,
	Strong,
	Text,
	TextLink,
} from 'catalyst'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ShinyText } from 'reactbits/shiny-text'
import { PasswordInput } from './password-input'
import { email, required, useForm } from './use-form'

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
		<form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
			<Heading>Sign in to your account</Heading>

			{registered && (
				<ShinyText
					text="Account created successfully. Please sign in."
					color="green"
					shineColor="lime"
					delay={5}
				/>
			)}

			{serverError && <p className="text-sm text-red-500">{serverError}</p>}

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

			<Button
				type="submit"
				className={`w-full ${submitting ? 'cursor-not-allowed pointer-events-none' : ''}`}
			>
				Sign in
			</Button>

			{showRegisterLink && (
				<Text>
					Don't have an account?{' '}
					<TextLink href="/register">
						<Strong>Create one</Strong>
					</TextLink>
				</Text>
			)}
		</form>
	)
}

export function LoginPage({ showRegisterLink = true }: { showRegisterLink?: boolean }) {
	return (
		<AuthLayout>
			<Suspense>
				<LoginForm showRegisterLink={showRegisterLink} />
			</Suspense>
		</AuthLayout>
	)
}
