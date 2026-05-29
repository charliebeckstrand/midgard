'use client'

import { useRouter } from 'next/navigation'
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
import { chain, email, matches, minLength, required } from './use-form-validation'

type RegisterValues = {
	email: string
	name: string
	password: string
	confirmPassword: string
}

function RegisterForm() {
	const router = useRouter()

	const [serverError, setServerError] = useState('')

	const handleSubmit: FormSubmitHandler<RegisterValues> = async (values) => {
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
		}
	}

	return (
		<AuthLayout>
			<Form<RegisterValues>
				defaultValues={{ email: '', name: '', password: '', confirmPassword: '' }}
				validate={{
					email: chain(required(), email()),
					name: chain(required()),
					password: chain(required(), minLength(8)),
					confirmPassword: chain(required(), matches('password', 'password')),
				}}
				onSubmit={handleSubmit}
				className="grid gap-8 w-full sm:max-w-sm px-4"
			>
				<Heading className="text-center">Create your account</Heading>

				{serverError && <Text variant="error">{serverError}</Text>}

				<Field>
					<Label>Email</Label>
					<Input type="email" name="email" autoComplete="email" />
					<Message name="email" />
				</Field>

				<Field>
					<Label>Full name</Label>
					<Input name="name" />
					<Message name="name" />
				</Field>

				<Field>
					<Label>Password</Label>
					<PasswordInput name="password" autoComplete="new-password" />
					<Message name="password" />
				</Field>

				<Field>
					<Label>Confirm password</Label>
					<PasswordInput name="confirmPassword" />
					<Message name="confirmPassword" />
				</Field>

				<Button type="submit" className="w-full">
					Create account
				</Button>

				<div className="text-center">
					<Text>
						Already have an account?{' '}
						<Link href="/login" underline>
							Sign in
						</Link>
					</Text>
				</div>
			</Form>
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
