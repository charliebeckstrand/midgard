import api from 'virtual:docs/api/components/password-confirm'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import InAForm from './in-a-form.tsx'
import PasswordConfirmPlayground from './playground.tsx'
import WithStrengthMeter from './with-strength-meter.tsx'

export default function PasswordConfirmPage() {
	return (
		<>
			<Playground of={PasswordConfirmPlayground} api={api} />
			<Example of={WithStrengthMeter} />
			<Example of={InAForm} />
			<ApiTable api={api} />
		</>
	)
}
