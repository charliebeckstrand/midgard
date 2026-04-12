'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { OtpInput } from '../../components/otp-input'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function OtpInputDemo() {
	const [value, setValue] = useState('')
	const [completed, setCompleted] = useState('')

	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput />
				`}
			>
				<OtpInput />
			</Example>

			<Example
				title="Sizes"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput size="sm" length={4} />
					<OtpInput size="md" length={4} />
					<OtpInput size="lg" length={4} />
				`}
			>
				<div className="flex flex-col gap-4">
					<Field>
						<Label>Small</Label>
						<OtpInput size="sm" length={4} />
					</Field>
					<Field>
						<Label>Medium</Label>
						<OtpInput size="md" length={4} />
					</Field>
					<Field>
						<Label>Large</Label>
						<OtpInput size="lg" length={4} />
					</Field>
				</div>
			</Example>

			<Example
				title="Numeric only"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput type="number" length={6} />
				`}
			>
				<Field>
					<Label>Verification code</Label>
					<OtpInput type="number" length={6} />
				</Field>
			</Example>

			<Example
				title="Controlled"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput
						value={value}
						onChange={setValue}
						onComplete={(code) => alert(code)}
					/>
				`}
			>
				<div className="space-y-2">
					<OtpInput
						type="number"
						length={6}
						value={value}
						onChange={(v) => setValue(v ?? '')}
						onComplete={setCompleted}
					/>
					{completed && <Text>Completed: {completed}</Text>}
				</div>
			</Example>

			<Example
				title="Disabled"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput disabled defaultValue="1234" length={4} />
				`}
			>
				<OtpInput disabled defaultValue="1234" length={4} />
			</Example>

			<Example
				title="Invalid"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput invalid length={4} />
				`}
			>
				<Field>
					<Label>Invalid code</Label>
					<OtpInput invalid length={4} />
				</Field>
			</Example>
		</div>
	)
}
