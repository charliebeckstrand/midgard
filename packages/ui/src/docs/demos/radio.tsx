import { Label } from '../../components/fieldset'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Forms' }

const plans = ['Starter', 'Business', 'Enterprise']
const colors = ['blue', 'green', 'red'] as const

export default function RadioDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Radio, RadioField, RadioGroup } from 'ui/radio'
					import { Label } from 'ui/fieldset'

					<RadioGroup>
					${plans.map((p) => `  <RadioField>\n    <Radio name="plan" value="${p.toLowerCase()}" />\n    <Label>${p}</Label>\n  </RadioField>`)}
					</RadioGroup>
				`}
			>
				<RadioGroup>
					{plans.map((plan) => (
						<RadioField key={plan}>
							<Radio
								id={`radio-${plan.toLowerCase()}`}
								name="plan"
								value={plan}
								defaultChecked={plan === 'Starter'}
							/>
							<Label htmlFor={`radio-${plan.toLowerCase()}`}>{plan}</Label>
						</RadioField>
					))}
				</RadioGroup>
			</Example>

			<Example
				title="Colors"
				code={code`
					import { Radio, RadioField, RadioGroup } from 'ui/radio'
					import { Label } from 'ui/fieldset'

					<RadioGroup>
					${colors.map((c) => `  <RadioField>\n    <Radio name="color" value="${c}" color="${c}" />\n    <Label>${c.charAt(0).toUpperCase() + c.slice(1)}</Label>\n  </RadioField>`)}
					</RadioGroup>
				`}
			>
				<RadioGroup>
					{colors.map((color) => (
						<RadioField key={color}>
							<Radio
								id={`radio-${color}`}
								name="color"
								value={color}
								color={color}
								defaultChecked={color === 'blue'}
							/>
							<Label htmlFor={`radio-${color}`}>{color}</Label>
						</RadioField>
					))}
				</RadioGroup>
			</Example>

			<Example
				title="Disabled"
				code={code`
					import { Radio, RadioField, RadioGroup } from 'ui/radio'
					import { Label } from 'ui/fieldset'

					<RadioGroup>
					  <RadioField>
					    <Radio name="option" value="enabled" defaultChecked />
					    <Label>Enabled option</Label>
					  </RadioField>
					  <RadioField>
					    <Radio name="option" value="disabled" disabled />
					    <Label>Disabled option</Label>
					  </RadioField>
					</RadioGroup>
				`}
			>
				<RadioGroup>
					<RadioField>
						<Radio id="radio-enabled" name="option" value="enabled" defaultChecked />
						<Label htmlFor="radio-enabled">Enabled option</Label>
					</RadioField>
					<RadioField>
						<Radio id="radio-disabled" name="option" value="disabled" disabled />
						<Label htmlFor="radio-disabled">Disabled option</Label>
					</RadioField>
				</RadioGroup>
			</Example>
		</div>
	)
}
