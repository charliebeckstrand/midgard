import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Heading } from '../../components/heading'
import { Input } from '../../components/input'
import { PasswordInput } from '../../components/password-input'
import { AuthPage } from '../../pages'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

type Page = 'login' | 'register' | 'forgot-password'

export default function PagesDemo() {
	const [page, setPage] = useState<Page>('login')

	const [submitting, setSubmitting] = useState(false)

	const handleSubmit: React.ComponentProps<'form'>['onSubmit'] = (e) => {
		e.preventDefault()

		setSubmitting(true)

		setTimeout(() => setSubmitting(false), 2000)
	}

	return (
		<Example>
			<div className="flex gap-2">
				{(['login', 'register', 'forgot-password'] as const).map((p) => (
					<Button key={p} variant={page === p ? 'solid' : 'outline'} onClick={() => setPage(p)}>
						{p}
					</Button>
				))}
			</div>
			<div>
				{page === 'login' && (
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
				)}
				{page === 'register' && (
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
				)}
				{page === 'forgot-password' && (
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
				)}
			</div>
		</Example>
	)
}
