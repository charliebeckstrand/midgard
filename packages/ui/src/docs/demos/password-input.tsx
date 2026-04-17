import { Lock } from 'lucide-react'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { PasswordInput } from '../../components/password-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Inputs' }

export default function PasswordInputDemo() {
	return (
		<Stack gap={6}>
			<Example title="Variants">
				<Sizer>
					<Field>
						<Label htmlFor="password-default">Password</Label>
						<PasswordInput id="password-default" placeholder="Enter password" />
					</Field>
				</Sizer>
				<Sizer>
					<Field>
						<Label htmlFor="password-outline">Outline</Label>
						<PasswordInput id="password-outline" variant="outline" placeholder="Enter password" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Sizes">
				<Sizer size="sm">
					<Field>
						<Label>Small</Label>
						<PasswordInput size="sm" placeholder="Small input" />
					</Field>
				</Sizer>
				<Sizer size="md">
					<Field>
						<Label>Medium</Label>
						<PasswordInput size="md" placeholder="Medium input" />
					</Field>
				</Sizer>
				<Sizer size="lg">
					<Field>
						<Label>Large</Label>
						<PasswordInput size="lg" placeholder="Large input" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Prefix">
				<Sizer>
					<Field>
						<Label htmlFor="password-prefix">Password</Label>
						<PasswordInput
							id="password-prefix"
							prefix={<Icon icon={<Lock />} />}
							placeholder="Enter password"
						/>
					</Field>
				</Sizer>
			</Example>

			<Example title="Disabled">
				<Sizer>
					<Field>
						<Label htmlFor="password-disabled">Disabled</Label>
						<PasswordInput id="password-disabled" disabled placeholder="Disabled" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Readonly">
				<Sizer>
					<Field>
						<Label>Readonly</Label>
						<PasswordInput readOnly defaultValue="hunter2" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label>Invalid</Label>
						<PasswordInput data-invalid placeholder="Invalid input" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Valid">
				<Sizer>
					<Field>
						<Label>Valid</Label>
						<PasswordInput data-valid placeholder="Valid input" />
					</Field>
				</Sizer>
			</Example>
		</Stack>
	)
}
