import { Lock } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { PasswordInput } from '../../components/password-input'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function PasswordInputDemo() {
	return (
		<div className="space-y-8">
			<Example title="Variants">
				<Field className="lg:max-w-sm">
					<Label htmlFor="password-default">Password</Label>
					<PasswordInput id="password-default" placeholder="Enter password" />
				</Field>
				<Field className="lg:max-w-sm">
					<Label htmlFor="password-outline">Outline</Label>
					<PasswordInput id="password-outline" variant="outline" placeholder="Enter password" />
				</Field>
				{/* <Glass>
					<Field className="lg:max-w-sm">
						<Label>Glass</Label>
						<PasswordInput placeholder="Enter password" />
					</Field>
				</Glass> */}
			</Example>

			<Example title="Sizes">
				<div className="lg:max-w-xs">
					<Field>
						<Label>Small</Label>
						<PasswordInput size="sm" placeholder="Small input" />
					</Field>
				</div>
				<div className="lg:max-w-sm">
					<Field>
						<Label>Medium</Label>
						<PasswordInput size="md" placeholder="Medium input" />
					</Field>
				</div>
				<div className="lg:max-w-md">
					<Field>
						<Label>Large</Label>
						<PasswordInput size="lg" placeholder="Large input" />
					</Field>
				</div>
			</Example>

			<Example title="Prefix">
				<Field className="lg:max-w-sm">
					<Label htmlFor="password-prefix">Password</Label>
					<PasswordInput
						id="password-prefix"
						prefix={<Icon icon={<Lock />} />}
						placeholder="Enter password"
					/>
				</Field>
			</Example>

			<Example title="Disabled">
				<Field className="lg:max-w-sm">
					<Label htmlFor="password-disabled">Disabled</Label>
					<PasswordInput id="password-disabled" disabled placeholder="Disabled" />
				</Field>
			</Example>

			<Example title="Readonly">
				<Field className="lg:max-w-sm">
					<Label>Readonly</Label>
					<PasswordInput readOnly defaultValue="hunter2" />
				</Field>
			</Example>

			<Example title="Invalid">
				<Field className="lg:max-w-sm">
					<Label>Invalid</Label>
					<PasswordInput data-invalid placeholder="Invalid input" />
				</Field>
			</Example>

			<Example title="Valid">
				<Field className="lg:max-w-sm">
					<Label>Valid</Label>
					<PasswordInput data-valid placeholder="Valid input" />
				</Field>
			</Example>
		</div>
	)
}
