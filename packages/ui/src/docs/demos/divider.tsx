import { Divider } from '../../components/divider'
import { Example } from '../components/example'

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
