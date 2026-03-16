'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ErrorMessage, Field, Label } from 'ui/fieldset'
import { Input } from 'ui/input'
import { RegisterPage as RegisterPageLayout } from 'ui/pages'
import { Strong, Text, TextLink } from 'ui/text'
import { PasswordInput } from './password-input'
import { useForm } from './use-form'
import { email, matches, minLength, required } from './use-form-validation'

function RegisterForm() {
	const router = useRouter()

	const [serverError, setServerError] = useState('')

	const [submitting, setSubmitting] = useState(false)

	const { register, errors, submit } = useForm({
		email: { validators: [required(), email()] },
		name: { validators: [required()] },
		password: { validators: [required(), minLength(8)] },
		confirmPassword: { validators: [required(), matches('password', 'password')] },
	})

	const handleSubmit = submit(async (values) => {
		setSubmitting(true)

		try {
			const res = await fetch('/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: values.email, password: values.password, name: values.name }),
			})

			if (res.ok) {
				router.push('/login?registered=true')

				return
			}

			const data = await res.json()

			setServerError(
				data.message || 'Registration failed. Please check your details and try again.',
			)
		} catch {
			setServerError('Registration failed. Please try again later.')
		} finally {
			setSubmitting(false)
		}
	})

	return (
		<RegisterPageLayout
			onSubmit={handleSubmit}
			serverError={serverError}
			submitting={submitting}
			footer={
				<Text>
					Already have an account?{' '}
					<TextLink href="/login">
						<Strong>Sign in</Strong>
					</TextLink>
				</Text>
			}
		>
			<Field>
				<Label>Email</Label>
				<Input type="email" name="email" autoComplete="email" {...register('email')} />
				{errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
			</Field>

			<Field>
				<Label>Full name</Label>
				<Input name="name" {...register('name')} />
				{errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
			</Field>

			<Field>
				<Label>Password</Label>
				<PasswordInput name="password" autoComplete="new-password" {...register('password')} />
				{errors.password && <ErrorMessage>{errors.password}</ErrorMessage>}
			</Field>

			<Field>
				<Label>Confirm password</Label>
				<PasswordInput name="confirmPassword" {...register('confirmPassword')} />
				{errors.confirmPassword && <ErrorMessage>{errors.confirmPassword}</ErrorMessage>}
			</Field>
		</RegisterPageLayout>
	)
}

export function RegisterPage() {
	return (
		<Suspense>
			<RegisterForm />
		</Suspense>
	)
}
