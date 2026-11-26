import api from 'virtual:docs/api/layouts/auth'
import { ApiTable, Example } from '../../../kit/index.ts'
import SignIn from './sign-in.tsx'

export default function AuthLayoutPage() {
	return (
		<>
			<Example of={SignIn} viewport page />
			<ApiTable api={api} />
		</>
	)
}
