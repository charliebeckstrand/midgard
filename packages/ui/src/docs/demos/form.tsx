'use client'

import { useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Control } from '../../components/control'
import { ErrorMessage, Field, Label } from '../../components/fieldset'
import { Flex } from '../../components/flex'
import { Form, useFormContext } from '../../components/form'
import { Input } from '../../components/input'
import { NumberInput } from '../../components/number-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Switch, SwitchField } from '../../components/switch'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../components/example'
import { Pre } from '../components/pre'

export const meta = { category: 'Forms' }

async function simulateAsyncSubmission() {
	return new Promise<void>((r) => setTimeout(r, 1000))
}

function BoundFieldsForm() {
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
			<Sizer>
				<Stack gap={4}>
					<Form
						defaultValues={{ name: '', email: '', age: 0 }}
						onSubmit={async (values) => {
							await simulateAsyncSubmission()

							setResult(JSON.stringify(values, null, 2))
						}}
						onReset={() => setResult('')}
					>
						<Stack gap={4}>
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
							<Flex gap={2}>
								<Button type="submit">Submit</Button>
								{result && (
									<Button type="reset" variant="soft" color="red">
										Reset
									</Button>
								)}
							</Flex>
						</Stack>
					</Form>
					{result && <Pre>{result}</Pre>}
				</Stack>
			</Sizer>
		</Example>
	)
}

function ValidationForm() {
	return (
		<Example
			title="Validation"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label, ErrorMessage } from 'ui/fieldset'
				import { Input } from 'ui/input'
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
						confirmPassword: (v, vals) =>
							v !== vals.password ? 'Passwords must match' : undefined,
					}}
					onSubmit={async (values) => setResult(JSON.stringify(values, null, 2))}
				>
					<Stack gap={4}>
						<Field>
							<Label>Email</Label>
							<Input name="email" type="email" placeholder="jane@example.com" />
							<ErrorMessage name="email" />
						</Field>
						<Field>
							<Label>Password</Label>
							<Input name="password" type="password" placeholder="Min 8 characters" />
							<ErrorMessage name="password" />
						</Field>
						<Field>
							<Label>Confirm password</Label>
							<Input name="confirmPassword" type="password" placeholder="Re-enter password" />
							<ErrorMessage name="confirmPassword" />
						</Field>
						<Button type="submit">Create account</Button>
					</Stack>
				</Form>
			`}
		>
			<Sizer>
				<Form
					defaultValues={{ email: '', password: '', confirmPassword: '' }}
					validate={{
						email: (v) => {
							if (!v) return 'Email is required'

							if (!v.includes('@')) return 'Must be a valid email'

							return undefined
						},
						password: (v) => (v.length < 8 ? 'Password must be at least 8 characters' : undefined),
						confirmPassword: (v, vals) =>
							v !== vals.password ? 'Passwords must match' : undefined,
					}}
					onSubmit={async () => await simulateAsyncSubmission()}
				>
					<Stack gap={4}>
						<Field>
							<Label>Email</Label>
							<Input name="email" type="email" placeholder="jane@example.com" />
							<ErrorMessage name="email" />
						</Field>
						<Field>
							<Label>Password</Label>
							<Input name="password" type="password" placeholder="Min 8 characters" />
							<ErrorMessage name="password" />
						</Field>
						<Field>
							<Label>Confirm password</Label>
							<Input name="confirmPassword" type="password" placeholder="Re-enter password" />
							<ErrorMessage name="confirmPassword" />
						</Field>
						<Button type="submit">Create account</Button>
					</Stack>
				</Form>
			</Sizer>
		</Example>
	)
}

function FormStatusDisplay() {
	const form = useFormContext()

	if (!form) return null

	return (
		<Flex gap={2} align="start">
			<Badge variant="outline" color={form.isDirty ? 'green' : 'red'}>
				dirty: {form.isDirty ? 'yes' : 'no'}
			</Badge>
			<Badge variant="outline" color={form.isValid ? 'green' : 'red'}>
				valid: {form.isValid ? 'yes' : 'no'}
			</Badge>
		</Flex>
	)
}

function DirtyTouchedForm() {
	return (
		<Example
			title="Dirty + touched tracking"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label, ErrorMessage } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { Button } from 'ui/button'
				import { Stack } from 'ui/stack'
				import { useFormContext } from 'ui/form'

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
						<ErrorMessage name="username" />
					</Field>
					<Field>
						<Label>Bio</Label>
						<Textarea name="bio" placeholder="Tell us about yourself" />
						<ErrorMessage name="bio" />
					</Field>

					<Button type="submit">Save</Button>
				</Form>
			`}
		>
			<Sizer>
				<Form
					defaultValues={{ username: 'admin', bio: '' }}
					validate={{
						username: (v) => (v.length < 3 ? 'At least 3 characters' : undefined),
						bio: (v) => (v.length > 200 ? 'Too long' : undefined),
					}}
					onSubmit={async () => await simulateAsyncSubmission()}
				>
					<Stack gap={4}>
						<Field>
							<Label>Username</Label>
							<Input name="username" />
							<ErrorMessage name="username" />
						</Field>
						<Field>
							<Label>Bio</Label>
							<Textarea name="bio" placeholder="Tell us about yourself" />
							<ErrorMessage name="bio" />
						</Field>

						<FormStatusDisplay />

						<Button type="submit">Save</Button>
					</Stack>
				</Form>
			</Sizer>
		</Example>
	)
}

function ServerErrorForm() {
	const [loading, setLoading] = useState(false)

	return (
		<Example
			title="Server error injection"
			code={code`
				import { Form } from 'ui/form'
				import { Field, Label, ErrorMessage } from 'ui/fieldset'
				import { Input } from 'ui/input'
				import { Button } from 'ui/button'
				import { Stack } from 'ui/stack'

				const [loading, setLoading] = useState(false)

				<Form
					defaultValues={{ username: '' }}
					validate={{
						username: (v) => (!v ? 'Username is required' : undefined),
					}}
					onSubmit={async (_values, ctx) => {
						setLoading(true)

						// Simulate a server error response after an async submission
						await simulateAsyncSubmission()

						ctx.setErrors({ username: 'This username is already taken' })

						setLoading(false)
					}}
				>
					<Stack gap={4}>
						<Field>
							<Label>Username</Label>
							<Input name="username" placeholder="Pick a username" loading={loading} />
							<ErrorMessage name="username" />
						</Field>
						<Button type="submit">Register</Button>
					</Stack>
				</Form>
			`}
		>
			<Sizer>
				<Form
					defaultValues={{ username: '' }}
					validate={{
						username: (v) => (!v ? 'Username is required' : undefined),
					}}
					onSubmit={async (_values, ctx) => {
						setLoading(true)

						await simulateAsyncSubmission()

						ctx.setErrors({ username: 'This username is already taken' })

						setLoading(false)
					}}
				>
					<Stack gap={4}>
						<Field>
							<Label>Username</Label>
							<Input name="username" placeholder="Pick a username" loading={loading} />
							<ErrorMessage name="username" />
						</Field>
						<Button type="submit">Register</Button>
					</Stack>
				</Form>
			</Sizer>
		</Example>
	)
}

function ToggleForm() {
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
					<Stack gap={4}>
						<Control>
							<CheckboxField>
								<Checkbox name="terms" />
								<Label>Accept terms and conditions</Label>
							</CheckboxField>
						</Control>
						<ErrorMessage name="terms" />
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
			<Sizer>
				<Form
					defaultValues={{ terms: false, newsletter: false, darkMode: false }}
					validate={{
						terms: (v) => (!v ? 'You must accept the terms and conditions' : undefined),
					}}
					onSubmit={(values) => setResult(JSON.stringify(values, null, 2))}
					onReset={() => setResult('')}
				>
					<Stack gap={4}>
						<Control>
							<CheckboxField>
								<Checkbox name="terms" />
								<Label>Accept terms and conditions</Label>
							</CheckboxField>
							<ErrorMessage name="terms" />
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
						<Flex gap={2}>
							<Button type="submit">Submit</Button>
							{result && (
								<Button type="reset" variant="soft" color="red">
									Reset
								</Button>
							)}
						</Flex>
					</Stack>
				</Form>
				{result && <Pre>{result}</Pre>}
			</Sizer>
		</Example>
	)
}

export default function FormDemo() {
	return (
		<Stack gap={6}>
			<BoundFieldsForm />
			<ValidationForm />
			<DirtyTouchedForm />
			<ServerErrorForm />
			<ToggleForm />
		</Stack>
	)
}
