import api from 'virtual:docs/api/components/password-strength'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomRules from './custom-rules.tsx'
import MinimumStrength from './minimum-strength.tsx'
import PasswordStrengthPlayground from './playground.tsx'
import WithInput from './with-input.tsx'

export default function PasswordStrengthPage() {
	return (
		<>
			<Playground of={PasswordStrengthPlayground} api={api} />
			<Example of={WithInput} />
			<Example of={CustomRules} />
			<Example of={MinimumStrength} />
			<ApiTable api={api} />
		</>
	)
}
