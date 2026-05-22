import { Divider } from '../../components/divider'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Divider />
			</Example>

			<Example title="Soft">
				<Divider soft />
			</Example>
		</>
	)
}
