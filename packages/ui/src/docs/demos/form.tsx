'use client'

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
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

async function simulateAsyncSubmission() {
	return new Promise<void>((r) => setTimeout(r, 1000))
}

function BoundFieldsFormExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Example
			title="Auto-bound fields"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { NumberInput } from 'ui/number-input'
				import { Button } from 'ui/button'

				const [result, setResult] = useState<string>('')

				<Form
					defaultValues={{ name: '', email: '', age: 0 }}
					onSubmit={async (values) => setResult(JSON.stringify(values, null, 2))}
				>
					<Field>
						<Label>Name</Label>
						<Input name="name" placeholder="Jane Doe" />
					</Field>
					<Field>
						<Label>Email</Label>
						<Input name="email" type="email" placeholder="jane@example.com" />
					</Field>
					<Field>
						<Label>Age</Label>
						<NumberInput name="age" min={0} max={150} />
					</Field>
					<Button type="submit">Submit</Button>
				</Form>
			`}
		>
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
							<Button type="submit">Submit</Button>
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
		</Example>
	)
}

function ValidationFormExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Example
			title="Validation"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label, Message } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { PasswordInput } from 'ui/password-input'
				import { Button } from 'ui/button'
				import { Stack } from 'ui/stack'

				const [result, setResult] = useState<string>('')

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
					onSubmit={async (values) => setResult(JSON.stringify(values, null, 2))}
				>
					<Stack gap="lg">
						<Field>
							<Label>Email</Label>
							<Input name="email" type="email" placeholder="jane@example.com" />
							<Message name="email" />
						</Field>
						<Field>
							<Label>Password</Label>
							<PasswordInput name="password" placeholder="Min 8 characters" />
							<Message name="password" />
						</Field>
						<Field>
							<Label>Confirm password</Label>
							<PasswordInput name="confirmPassword" placeholder="Re-enter password" />
							<Message name="confirmPassword" />
						</Field>
						<Button type="submit">Create account</Button>
					</Stack>
				</Form>
			`}
		>
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
						<Button type="submit">Create account</Button>
						{result && (
							<Button type="reset" variant="soft" color="red">
								Reset
							</Button>
						)}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Example>
	)
}

function FormStatusDisplay() {
	const form = useFormContext()

	if (!form) return null

	return (
		<Flex gap="sm" align="start">
			<Badge variant="outline" color={form.isDirty ? 'amber' : 'green'}>
				dirty: {form.isDirty ? 'yes' : 'no'}
			</Badge>
			<Badge variant="outline" color={form.isValid ? 'green' : 'red'}>
				valid: {form.isValid ? 'yes' : 'no'}
			</Badge>
		</Flex>
	)
}

function DirtyTouchedFormExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Example
			title="Dirty + touched tracking"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label, Message } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { Button } from 'ui/button'
				import { Stack } from 'ui/stack'

				const [result, setResult] = useState<string>('')

				<Form
					defaultValues={{ username: 'admin', bio: '' }}
					validate={{
						username: (v) => (v.length < 3 ? 'At least 3 characters' : undefined),
						bio: (v) => (v.length > 200 ? 'Too long' : undefined),
					}}
					onSubmit={async (values) => setResult(JSON.stringify(values, null, 2))}
				>
					<Field>
						<Label>Username</Label>
						<Input name="username" />
						<Message name="username" />
					</Field>
					<Field>
						<Label>Bio</Label>
						<Textarea name="bio" placeholder="Tell us about yourself" />
						<Message name="bio" />
					</Field>

					<Button type="submit">Save</Button>
				</Form>
			`}
		>
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

					<FormStatusDisplay />

					<Flex gap="sm">
						<Button type="submit">Save</Button>
						{result && (
							<Button type="reset" variant="soft" color="red">
								Reset
							</Button>
						)}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Example>
	)
}

function ServerErrorFormExample() {
	const [loading, setLoading] = useState(false)

	return (
		<Example
			title="Server error injection"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label, Message } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { Button } from 'ui/button'
				import { Stack } from 'ui/stack'

				const [loading, setLoading] = useState(false)

				<Form
					defaultValues={{ username: '' }}
					validate={{
						username: (v) => (!v ? 'Username is required' : undefined),
					}}
					onSubmit={async (_values, context) => {
						setLoading(true)

						// Simulate a server error response after an async submission
						await simulateAsyncSubmission()

						context.setErrors({ username: 'This username is already taken' })

						setLoading(false)
					}}
				>
					<Stack gap="lg">
						<Field>
							<Label>Username</Label>
							<Input name="username" placeholder="Pick a username" loading={loading} />
							<Message name="username" />
						</Field>
						<Button type="submit">Register</Button>
					</Stack>
				</Form>
			`}
		>
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
					<Button type="submit">Register</Button>
				</Stack>
			</Form>
		</Example>
	)
}

function SubmitOutcomeFormExample() {
	const [outcome, setOutcome] = useState<SubmitOutcome<{ email: string }> | null>(null)
	const [failNext, setFailNext] = useState(false)

	return (
		<Example
			title="onSettled + SubmitButton"
			code={code`
				import { Form, type SubmitOutcome } from 'ui/form'
				import { SubmitButton } from 'ui/submit-button'
				import { Field, Label } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { Switch } from 'ui/switch'

				const [outcome, setOutcome] = useState<SubmitOutcome<{ email: string }> | null>(null)
				const [failNext, setFailNext] = useState(false)

				<Form
					defaultValues={{ email: '' }}
					onSubmit={async (_values) => {
						await simulateAsyncSubmission()

						if (failNext) throw new Error('Rate limited — try again in 30s')
					}}
					onSettled={setOutcome}
				>
					<Field>
						<Label>Email</Label>
						<Input name="email" type="email" placeholder="you@example.com" />
					</Field>
					<SubmitButton>Save</SubmitButton>
				</Form>
			`}
		>
			<Stack gap="lg">
				<Flex gap="sm" align="center">
					<Switch checked={failNext} onChange={(e) => setFailNext(e.target.checked)} />
					<span>Fail next submit</span>
				</Flex>
				<Form
					defaultValues={{ email: '' }}
					onSubmit={async (_values) => {
						await simulateAsyncSubmission()

						if (failNext) throw new Error('Rate limited — try again in 30s')
					}}
					onSettled={setOutcome}
				>
					<Stack gap="lg">
						<Field autoComplete="email">
							<Label>Email</Label>
							<Input name="email" type="email" placeholder="you@example.com" />
						</Field>
						<SubmitButton>Save</SubmitButton>
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
		</Example>
	)
}

function ToggleFormExample() {
	const [result, setResult] = useState<string>('')

	return (
		<Example
			title="Checkbox + switch"
			code={code`
				import { Form } from 'ui/form'
				import { Control } from 'ui/control'
				import { Checkbox, CheckboxField } from 'ui/checkbox'
				import { Switch, SwitchField } from 'ui/switch'
				import { Label } from 'ui/fieldset'
				import { Button } from 'ui/button'
				import { Stack } from 'ui/stack'

				const [result, setResult] = useState<string>('')

				<Form
					defaultValues={{ terms: false, newsletter: false, darkMode: false }}
					validate={{
						terms: (v) => (!v ? 'You must accept the terms and conditions' : undefined),
					}}
					onSubmit={(values) => setResult(JSON.stringify(values, null, 2))}
				>
					<Stack gap="lg">
						<Control>
							<CheckboxField>
								<Checkbox name="terms" />
								<Label>Accept terms and conditions</Label>
							</CheckboxField>
						</Control>
						<Message name="terms" />
						<Control>
							<CheckboxField>
								<Checkbox name="newsletter" />
								<Label>Subscribe to newsletter</Label>
							</CheckboxField>
						</Control>
						<Control>
							<SwitchField>
								<Switch name="darkMode" />
								<Label>Dark mode</Label>
							</SwitchField>
						</Control>
						<Button type="submit">Submit</Button>
					</Stack>
				</Form>
			`}
		>
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
					<Control>
						<SwitchField>
							<Switch name="darkMode" />
							<Label>Dark mode</Label>
						</SwitchField>
					</Control>
					<Flex gap="sm">
						<Button type="submit">Submit</Button>
						{result && (
							<Button type="reset" variant="soft" color="red">
								Reset
							</Button>
						)}
					</Flex>
				</Stack>
			</Form>
			{result && <JsonTree data={JSON.parse(result)} />}
		</Example>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<BoundFieldsFormExample />
			<ValidationFormExample />
			<DirtyTouchedFormExample />
			<ServerErrorFormExample />
			<SubmitOutcomeFormExample />
			<ToggleFormExample />
		</Stack>
	)
}
