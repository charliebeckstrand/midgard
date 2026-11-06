import { Example } from '../../../../kit/index.ts'
import RegisteredRenderer from './registered-renderer.tsx'
import UnregisteredName from './unregistered-name.tsx'

export default function EmbedsTab() {
	return (
		<>
			<Example of={RegisteredRenderer} surface />
			<Example of={UnregisteredName} surface />
		</>
	)
}
