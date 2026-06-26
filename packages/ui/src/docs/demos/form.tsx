import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Field, Label, Message } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Form, type SubmitOutcome, useFormContext } from '../../components/form'
import { Input } from '../../components/input'
import { JsonTree } from '../../components/json-tree'
import { NumberInput } from '../../components/number-input'
import { PasswordInput } from '../../components/password-input'
import { Stack } from '../../components/stack'
import { SubmitButton } from '../../components/submit-button'
import { Switch, SwitchField } from '../../components/switch'
import { Textarea } from '../../components/textarea'
import { Example } from '../engine'

function ResetButton() {
	return (
		<Button type="reset" variant="soft" color="red">
			Reset
		</Button>
	)
}

function StatusDisplay() {
	const form = useFormContext()

	if (!form) return null

	return (
		<Flex gap="sm" align="start">
			<Badge variant="outline" color={form.dirty ? 'amber' : 'green'}>
				dirty: {form.dirty ? 'yes' : 'no'}
			</Badge>
			<Badge variant="outline" color={form.valid ? 'green' : 'red'}>
				valid: {form.valid ? 'yes' : 'no'}
			</Badge>
		</Flex>
	)
}

async function simulateAsyncSubmission() {
	return new Promise<void>((r) => setTimeout(r, 1000))
}

function DefaultExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Stack gap="lg">
			<Form
				defaultValues={{ name: '', email: '', age: 0 }}
				onSubmit={async (values) => {
					await simulateAsyncSubmission()

					setResult(JSON.stringify(values, null, 2))
				}}
				onReset={() => setResult('')}
			>
				<Stack gap="lg">
					<Field autoComplete="name">
						<Label>Name</Label>
						<Input name="name" placeholder="Jane Doe" />
					</Field>
					<Field autoComplete="email">
						<Label>Email</Label>
						<Input name="email" type="email" placeholder="jane@example.com" />
					</Field>
					<Field>
						<Label>Age</Label>
						<NumberInput name="age" min={0} max={150} />
					</Field>
					<Flex gap="sm">
						<SubmitButton color="blue">Submit</SubmitButton>
						{result && <ResetButton />}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Stack>
	)
}

function ValidationExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Stack gap="lg">
			<Form
				defaultValues={{ email: '', password: '', confirmPassword: '' }}
				validate={{
					email: (v) => {
						if (!v) return 'Email is required'

						if (!v.includes('@')) return 'Must be a valid email'

						return undefined
					},
					password: (v) => (v.length < 8 ? 'Password must be at least 8 characters' : undefined),
					confirmPassword: (_v, values) => {
						if (values.password !== _v) return 'Passwords do not match'

						return undefined
					},
				}}
				onSubmit={async (values) => {
					await simulateAsyncSubmission()

					setResult(JSON.stringify(values, null, 2))
				}}
				onReset={() => setResult('')}
			>
				<Stack gap="lg">
					<Field autoComplete="email">
						<Label>Email</Label>
						<Input name="email" type="email" placeholder="jane@example.com" />
						<Message name="email" />
					</Field>
					<Field autoComplete="new-password">
						<Label>Password</Label>
						<PasswordInput name="password" placeholder="Min 8 characters" />
						<Message name="password" />
					</Field>
					<Field autoComplete="new-password">
						<Label>Confirm password</Label>
						<PasswordInput name="confirmPassword" placeholder="Re-enter password" />
						<Message name="confirmPassword" />
					</Field>
					<Flex gap="sm">
						<SubmitButton color="green">Create account</SubmitButton>
						{result && <ResetButton />}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Stack>
	)
}

function DirtyTouchedExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Stack gap="lg">
			<Form
				defaultValues={{ username: 'admin', bio: '' }}
				validate={{
					username: (v) => (v.length < 3 ? 'At least 3 characters' : undefined),
					bio: (v) => (v.length > 200 ? 'Too long' : undefined),
				}}
				onSubmit={async (values) => {
					await simulateAsyncSubmission()

					setResult(JSON.stringify(values, null, 2))
				}}
				onReset={() => setResult('')}
			>
				<Stack gap="lg">
					<StatusDisplay />

					<Field autoComplete="username">
						<Label>Username</Label>
						<Input name="username" />
						<Message name="username" />
					</Field>
					<Field>
						<Label>Bio</Label>
						<Textarea name="bio" placeholder="Tell us about yourself" rows={3} autoResize />
						<Message name="bio" />
					</Field>

					<Flex gap="sm">
						<SubmitButton color="blue">Save</SubmitButton>
						{result && <ResetButton />}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Stack>
	)
}

function ServerErrorExample() {
	const [loading, setLoading] = useState(false)

	return (
		<Form
			defaultValues={{ username: '' }}
			validate={{
				username: (v) => (!v ? 'Username is required' : undefined),
			}}
			onSubmit={async (_values, context) => {
				setLoading(true)

				await simulateAsyncSubmission()

				context.setErrors({ username: 'This username is already taken' })

				setLoading(false)
			}}
		>
			<Stack gap="lg">
				<Field autoComplete="username">
					<Label>Username</Label>
					<Input name="username" placeholder="Pick a username" loading={loading} />
					<Message name="username" />
				</Field>
				<SubmitButton color="green">Register</SubmitButton>
			</Stack>
		</Form>
	)
}

function ControlledValuesExample() {
	const [user, setUser] = useState<{ email: string; name: string } | undefined>(undefined)

	const [loading, setLoading] = useState(false)

	async function loadUser() {
		setLoading(true)

		await simulateAsyncSubmission()

		setUser({ email: 'ada@example.com', name: 'Ada Lovelace' })

		setLoading(false)
	}

	return (
		<Stack gap="lg">
			{user ? (
				<Button variant="soft" color="red" onClick={() => setUser(undefined)}>
					Reset
				</Button>
			) : (
				<Button onClick={loadUser} loading={loading}>
					Load user
				</Button>
			)}
			<Form defaultValues={{ email: '', name: '' }} values={user} disabled={loading}>
				<Stack gap="lg">
					<Field autoComplete="email">
						<Label>Email</Label>
						<Input name="email" type="email" />
					</Field>
					<Field autoComplete="name">
						<Label>Name</Label>
						<Input name="name" />
					</Field>
				</Stack>
			</Form>
		</Stack>
	)
}

function OnSettledExample() {
	const [outcome, setOutcome] = useState<SubmitOutcome<{ email: string }> | null>(null)

	const [failNext, setFailNext] = useState(false)

	return (
		<Stack gap="lg">
			<Control>
				<SwitchField>
					<Switch checked={failNext} onChange={(event) => setFailNext(event.target.checked)} />
					<Label>Simulate server failure</Label>
				</SwitchField>
			</Control>
			<Form
				defaultValues={{ email: '' }}
				onSubmit={async (_values) => {
					await simulateAsyncSubmission()

					if (failNext) throw new Error('Rate limited — try again in 30s')
				}}
				onSettled={setOutcome}
				onReset={() => setOutcome(null)}
			>
				<Stack gap="lg">
					<Field autoComplete="email">
						<Label>Email</Label>
						<Input name="email" type="email" placeholder="you@example.com" />
					</Field>
					<Flex gap="sm">
						<SubmitButton color="blue">Save</SubmitButton>
						{outcome && <ResetButton />}
					</Flex>
				</Stack>
			</Form>
			{outcome && (
				<Badge color={outcome.ok ? 'green' : 'red'}>
					{outcome.ok
						? `ok · submitted ${JSON.stringify(outcome.values)}`
						: `failed · ${outcome.error.message}`}
				</Badge>
			)}
		</Stack>
	)
}

function OptInExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Stack gap="lg">
			<Form
				defaultValues={{ terms: false, newsletter: false, darkMode: false }}
				validate={{
					terms: (v) => (!v ? 'You must accept the terms and conditions' : undefined),
				}}
				onSubmit={async (values) => {
					await simulateAsyncSubmission()

					setResult(JSON.stringify(values, null, 2))
				}}
				onReset={() => setResult('')}
			>
				<Stack gap="lg">
					<Control>
						<CheckboxField>
							<Checkbox name="terms" />
							<Label>Accept terms and conditions</Label>
						</CheckboxField>
						<Message name="terms" />
					</Control>
					<Control>
						<CheckboxField>
							<Checkbox name="newsletter" />
							<Label>Subscribe to newsletter</Label>
						</CheckboxField>
					</Control>
					<Flex gap="sm">
						<SubmitButton color="blue">Submit</SubmitButton>
						{result && (
							<Button type="reset" variant="soft" color="red">
								Reset
							</Button>
						)}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Stack>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<DefaultExample />
			</Example>
			<Example title="Validation">
				<ValidationExample />
			</Example>
			<Example title="Dirty and touched state">
				<DirtyTouchedExample />
			</Example>
			<Example title="Server error">
				<ServerErrorExample />
			</Example>
			<Example title="Controlled values">
				<ControlledValuesExample />
			</Example>
			<Example title="onSettled">
				<OnSettledExample />
			</Example>
			<Example title="Opt-in">
				<OptInExample />
			</Example>
		</>
	)
}
