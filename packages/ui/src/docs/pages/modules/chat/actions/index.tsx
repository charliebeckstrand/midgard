import { Example } from '../../../../kit/index.ts'
import BookAPickup from './book-a-pickup.tsx'
import SelectACarrier from './select-a-carrier.tsx'

export default function ActionsTab() {
	return (
		<>
			<Example of={SelectACarrier} box="surface" />
			<Example of={BookAPickup} box="surface" />
		</>
	)
}
