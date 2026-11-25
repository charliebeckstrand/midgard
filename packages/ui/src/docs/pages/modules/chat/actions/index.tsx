import { Example } from '../../../../kit/index.ts'
import ARevisedMessage from './a-revised-message.tsx'
import BookAPickup from './book-a-pickup.tsx'
import PickACarrier from './pick-a-carrier.tsx'

export default function ActionsTab() {
	return (
		<>
			<Example of={PickACarrier} box="surface" />
			<Example of={BookAPickup} box="surface" />
			<Example of={ARevisedMessage} box="surface" />
		</>
	)
}
