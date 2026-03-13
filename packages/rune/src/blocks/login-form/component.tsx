import { Button } from '../../button/index.js'
import { Card } from '../../card/index.js'
import { Form } from '../../form/index.js'
import { Input } from '../../input/index.js'
import { Label } from '../../label/index.js'

export type LoginFormProps = {
	action?: string
	method?: 'get' | 'post' | 'dialog'
	className?: string
}

export function LoginForm({ action, method, className }: LoginFormProps) {
	return (
		<Card className={className}>
			<Form action={action} method={method ?? 'post'}>
				<div className="flex flex-col gap-2">
					<Label htmlFor="email">Email</Label>

					<Input inputType="email" name="email" id="email" placeholder="you@example.com" required />
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="password">Password</Label>

					<Input
						inputType="password"
						name="password"
						id="password"
						placeholder="Password"
						required
					/>
				</div>

				<Button type="default" size="medium">
					Sign in
				</Button>
			</Form>
		</Card>
	)
}
