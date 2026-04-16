'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from 'ui/button'
import { ErrorMessage, Field, Fieldset, Label } from 'ui/fieldset'
import { Heading } from 'ui/heading'
import { Input } from 'ui/input'
import { AuthLayout } from 'ui/layouts'
import { PasswordInput } from 'ui/password-input'
import { Text } from 'ui/text'
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
		<AuthLayout>
			<form onSubmit={handleSubmit} className="grid gap-8 w-full lg:max-w-sm">
				<Heading className="text-center">Create your account</Heading>

				{serverError && <Text className="text-red-600 dark:text-red-600">{serverError}</Text>}

				<Fieldset disabled={submitting} className="grid gap-8">
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

					<Button type="submit" disabled={submitting} size="lg" className="w-full">
						Create account
					</Button>
				</Fieldset>

				<div className="text-center">
					<Text>
						Already have an account?{' '}
						<Link href="/login" className="font-medium hover:underline underline-offset-6">
							Sign in
						</Link>
					</Text>
				</div>
			</form>
		</AuthLayout>
	)
}

export function RegisterPage() {
	return (
		<Suspense>
			<RegisterForm />
		</Suspense>
	)
}
