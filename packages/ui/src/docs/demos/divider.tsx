import { Example } from 'docs'
import { Divider } from '../../components/divider'

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
