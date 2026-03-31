import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { ForgotPasswordPage, LoginPage, RegisterPage } from '../../pages'

export const meta = { category: 'Layout' }

type Page = 'login' | 'register' | 'forgot-password'

export default function PagesDemo() {
	const [page, setPage] = useState<Page>('login')

	const noop: React.ComponentProps<'form'>['onSubmit'] = (e) => e.preventDefault()

	return (
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
					<LoginPage onSubmit={noop} footer={<p className="text-sm text-zinc-500">Footer slot</p>}>
						<Field>
							<Label>Email</Label>
							<Input type="email" placeholder="you@example.com" />
						</Field>
						<Field>
							<Label>Password</Label>
							<Input type="password" />
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
							<Input type="password" />
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
	)
}
