'use client'

import { useState } from 'react'
import { Button } from '../../../components/button'
import { Field, Label } from '../../../components/fieldset'
import { Heading } from '../../../components/heading'
import { Input } from '../../../components/input'
import { PasswordInput } from '../../../components/password-input'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { AuthPage } from '../../../pages'
import { Example } from '../../components/example'

export const meta = { category: 'Pages' }

export default function AuthPageDemo() {
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit: React.ComponentProps<'form'>['onSubmit'] = (e) => {
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
						<AuthPage
							heading={<Heading>Sign in to your account</Heading>}
							onSubmit={handleSubmit}
							submitting={submitting}
							actions={
								<Button type="submit" disabled={submitting}>
									{submitting ? 'Signing in...' : 'Sign in'}
								</Button>
							}
						>
							<Field>
								<Label>Email</Label>
								<Input type="email" placeholder="you@example.com" />
							</Field>
							<Field>
								<Label>Password</Label>
								<PasswordInput placeholder="•••••••••" />
							</Field>
						</AuthPage>
					</TabContent>
					<TabContent value="register">
						<AuthPage
							heading={<Heading>Create your account</Heading>}
							onSubmit={handleSubmit}
							submitting={submitting}
							actions={
								<Button type="submit" disabled={submitting}>
									{submitting ? 'Creating account...' : 'Create account'}
								</Button>
							}
						>
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
						</AuthPage>
					</TabContent>
					<TabContent value="forgot-password">
						<AuthPage
							heading={<Heading>Reset your password</Heading>}
							onSubmit={handleSubmit}
							submitting={submitting}
							actions={
								<Button type="submit" disabled={submitting}>
									{submitting ? 'Sending reset link...' : 'Send reset link'}
								</Button>
							}
						>
							<Field>
								<Label>Email</Label>
								<Input type="email" placeholder="you@example.com" />
							</Field>
						</AuthPage>
					</TabContent>
				</TabContents>
			</Tabs>
		</Example>
	)
}
