import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { PasswordInput } from '../../components/input/password'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../../pages'
import { Example } from '../example'

export const meta = { category: 'Layout' }

type Page = 'login' | 'register' | 'forgot-password'

export default function PagesDemo() {
	const [page, setPage] = useState<Page>('login')

	const noop: React.ComponentProps<'form'>['onSubmit'] = (e) => e.preventDefault()

	return (
		<Example
			code={`import { LoginPage } from 'ui/pages'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Input, PasswordInput } from 'ui/input'

<LoginPage onSubmit={onSubmit} submit={<Button type="submit">Sign in</Button>}>
	<Field>
		<Label>Email</Label>
		<Input type="email" placeholder="you@example.com" />
	</Field>
	<Field>
		<Label>Password</Label>
		<PasswordInput placeholder="•••••••••" />
	</Field>
</LoginPage>`}
		>
			<div className="space-y-6">
				<div className="flex gap-2">
					{(['login', 'register', 'forgot-password'] as const).map((p) => (
						<Button key={p} variant={page === p ? 'solid' : 'outline'} onClick={() => setPage(p)}>
							{p}
						</Button>
					))}
				</div>
				<div className="">
					{page === 'login' && (
						<LoginPage onSubmit={noop} submit={<Button type="submit">Sign in</Button>}>
							<Field>
								<Label>Email</Label>
								<Input type="email" placeholder="you@example.com" />
							</Field>
							<Field>
								<Label>Password</Label>
								<PasswordInput placeholder="•••••••••" />
							</Field>
						</LoginPage>
					)}
					{page === 'register' && (
						<RegisterPage onSubmit={noop}>
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
						</RegisterPage>
					)}
					{page === 'forgot-password' && (
						<ForgotPasswordPage onSubmit={noop}>
							<Field>
								<Label>Email</Label>
								<Input type="email" placeholder="you@example.com" />
							</Field>
						</ForgotPasswordPage>
					)}
				</div>
			</div>
		</Example>
	)
}
