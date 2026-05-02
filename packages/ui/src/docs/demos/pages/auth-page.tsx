'use client'

import { type ComponentProps, useState } from 'react'
import { Button } from '../../../components/button'
import { Field, Fieldset, Label } from '../../../components/fieldset'
import { Heading } from '../../../components/heading'
import { Input } from '../../../components/input'
import { PasswordInput } from '../../../components/password-input'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { AuthLayout } from '../../../layouts'
import { Example } from '../../components/example'

export const meta = { category: 'Pages' }

export default function AuthPageDemo() {
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit: ComponentProps<'form'>['onSubmit'] = (e) => {
		e.preventDefault()

		setSubmitting(true)

		setTimeout(() => setSubmitting(false), 2000)
	}

	return (
		<Example>
			<Tabs defaultValue="login" variant="segment">
				<TabList className="mb-4">
					<Tab value="login" disabled={submitting}>
						Login
					</Tab>
					<Tab value="register" disabled={submitting}>
						Register
					</Tab>
					<Tab value="forgot-password" disabled={submitting}>
						Forgot Password
					</Tab>
				</TabList>

				<TabContents>
					<TabContent value="login">
						<AuthLayout>
							<Heading className="text-center">Sign in to your account</Heading>

							<form onSubmit={handleSubmit} className="grid gap-8 w-full sm:max-w-sm px-4">
								<Fieldset disabled={submitting} className="grid gap-8">
									<Field>
										<Label>Email</Label>
										<Input type="email" placeholder="you@example.com" />
									</Field>
									<Field>
										<Label>Password</Label>
										<PasswordInput placeholder="•••••••••" />
									</Field>

									<Button type="submit" block disabled={submitting}>
										{submitting ? 'Signing in...' : 'Sign in'}
									</Button>
								</Fieldset>
							</form>
						</AuthLayout>
					</TabContent>
					<TabContent value="register">
						<AuthLayout>
							<Heading className="text-center">Create your account</Heading>

							<form onSubmit={handleSubmit} className="grid gap-8 w-full sm:max-w-sm px-4">
								<Fieldset disabled={submitting} className="grid gap-8">
									<Field>
										<Label>Name</Label>
										<Input placeholder="Jane Smith" />
									</Field>
									<Field>
										<Label>Email</Label>
										<Input type="email" placeholder="you@example.com" />
									</Field>
									<Field>
										<Label>Password</Label>
										<PasswordInput placeholder="•••••••••" />
									</Field>
									<Field>
										<Label>Confirm Password</Label>
										<PasswordInput placeholder="•••••••••" />
									</Field>

									<Button type="submit" block disabled={submitting}>
										{submitting ? 'Creating account...' : 'Create account'}
									</Button>
								</Fieldset>
							</form>
						</AuthLayout>
					</TabContent>
					<TabContent value="forgot-password">
						<AuthLayout>
							<Heading className="text-center">Reset your password</Heading>

							<form onSubmit={handleSubmit} className="grid gap-8 w-full sm:max-w-sm px-4">
								<Fieldset disabled={submitting} className="grid gap-8">
									<Field>
										<Label>Email</Label>
										<Input type="email" placeholder="you@example.com" />
									</Field>

									<Button type="submit" block disabled={submitting}>
										{submitting ? 'Sending reset link...' : 'Send reset link'}
									</Button>
								</Fieldset>
							</form>
						</AuthLayout>
					</TabContent>
				</TabContents>
			</Tabs>
		</Example>
	)
}
