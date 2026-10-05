import api from 'virtual:docs/api/providers/headless'
import { ApiTable, Example } from '../../../kit/index.ts'
import HeadlessButton from './button.tsx'
import HeadlessInput from './input.tsx'

export default function HeadlessPage() {
	return (
		<>
			<Example of={HeadlessInput} />
			<Example of={HeadlessButton} />
			<ApiTable api={api} />
		</>
	)
}
