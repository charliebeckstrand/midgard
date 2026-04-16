'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Description, ErrorMessage, Field, Label } from '../../components/fieldset'
import { Form, useFormContext } from '../../components/form'
import { Input } from '../../components/input'
import { NumberInput } from '../../components/number-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Switch, SwitchField } from '../../components/switch'
import { Text } from '../../components/text'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

function BasicForm() {
	const [result, setResult] = useState<string>('')

	return (
		<Example title="Basic — auto-bound fields">
			<Sizer>
				<Form
					defaultValues={{ name: '', email: '', age: 0 }}
					onSubmit={(values) => setResult(JSON.stringify(values, null, 2))}
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
						<div className="flex gap-2">
							<Button type="submit">Submit</Button>
							<Button type="reset" variant="outline">
								Reset
							</Button>
						</div>
					</Stack>
				</Form>
				{result && (
					<pre className="mt-4 rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-800">{result}</pre>
				)}
			</Sizer>
		</Example>
	)
}

function ValidationForm() {
	return (
		<Example title="Validation + error messages">
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
					onSubmit={() =>
						new Promise<void>((r) => {
							setTimeout(r, 1500)
						})
					}
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
						<Text size="sm" muted>
							Submit is disabled while the async handler runs (try it).
						</Text>
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
		<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
			<span>
				dirty: <strong>{form.isDirty ? 'yes' : 'no'}</strong>
			</span>
			<span>
				valid: <strong>{form.isValid ? 'yes' : 'no'}</strong>
			</span>
			<span>
				submitting: <strong>{form.submitting ? 'yes' : 'no'}</strong>
			</span>
			<span>
				values: <code>{JSON.stringify(form.values)}</code>
			</span>
		</div>
	)
}

function DirtyTouchedForm() {
	return (
		<Example title="Dirty + touched tracking">
			<Sizer>
				<Form
					defaultValues={{ username: 'admin', bio: '' }}
					validate={{
						username: (v) => (v.length < 3 ? 'At least 3 characters' : undefined),
						bio: (v) => (v.length > 200 ? 'Too long' : undefined),
					}}
					onSubmit={() => {}}
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
	return (
		<Example title="Server error injection">
			<Sizer>
				<Form
					defaultValues={{ username: '' }}
					validate={{
						username: (v) => (!v ? 'Username is required' : undefined),
					}}
					onSubmit={(_values, ctx) => {
						// Simulate a server error
						ctx.setErrors({ username: 'This username is already taken' })
					}}
				>
					<Stack gap={4}>
						<Field>
							<Label>Username</Label>
							<Input name="username" placeholder="Pick a username" />
							<Description>Try submitting — the server will reject it.</Description>
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
		<Example title="Checkbox + switch">
			<Sizer>
				<Form
					defaultValues={{ terms: false, newsletter: false, darkMode: false }}
					validate={{
						terms: (v) => (!v ? 'You must accept the terms' : undefined),
					}}
					onSubmit={(values) => setResult(JSON.stringify(values, null, 2))}
				>
					<Stack gap={4}>
						<CheckboxField>
							<Checkbox name="terms" />
							<Label>Accept terms and conditions</Label>
						</CheckboxField>
						<ErrorMessage name="terms" />
						<CheckboxField>
							<Checkbox name="newsletter" />
							<Label>Subscribe to newsletter</Label>
						</CheckboxField>
						<SwitchField>
							<Switch name="darkMode" />
							<Label>Dark mode</Label>
						</SwitchField>
						<Button type="submit">Submit</Button>
					</Stack>
				</Form>
				{result && (
					<pre className="mt-4 rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-800">{result}</pre>
				)}
			</Sizer>
		</Example>
	)
}

export default function FormDemo() {
	return (
		<Stack gap={6}>
			<BasicForm />
			<ValidationForm />
			<DirtyTouchedForm />
			<ServerErrorForm />
			<ToggleForm />
		</Stack>
	)
}
