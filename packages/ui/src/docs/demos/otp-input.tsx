'use client'

import { useState } from 'react'
import { Field } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { OtpInput } from '../../components/otp-input'
import { Spinner } from '../../components/spinner'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function OtpInputDemo() {
	const [value, setValue] = useState('')
	const [verifying, setVerifying] = useState(false)
	const [valid, setValid] = useState(false)

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
				title="Glass"
				code={code`
					import { Glass } from 'ui/glass'
					import { OtpInput } from 'ui/otp-input'

					<Glass>
						<OtpInput />
					</Glass>
				`}
			>
				<Glass>
					<OtpInput />
				</Glass>
			</Example>

			<Example
				title="Numeric only"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput type="number" length={6} />
				`}
			>
				<Field>
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
				<div className="flex items-center gap-3">
					<OtpInput
						type="number"
						length={6}
						value={value}
						valid={valid}
						onChange={(v) => {
							setValue(v ?? '')

							setVerifying(false)

							setValid(false)
						}}
						onComplete={() => {
							setVerifying(true)

							setTimeout(() => {
								setVerifying(false)

								setValid(true)
							}, 3000)
						}}
					/>
				</div>
				{verifying && <Spinner color="blue" size="lg" />}
				{valid && <Text color="green">Code verified!</Text>}
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
					<OtpInput invalid length={4} />
				</Field>
			</Example>

			<Example
				title="Valid"
				code={code`
					import { OtpInput } from 'ui/otp-input'

					<OtpInput valid length={4} />
				`}
			>
				<Field>
					<OtpInput valid length={4} />
				</Field>
			</Example>
		</div>
	)
}
