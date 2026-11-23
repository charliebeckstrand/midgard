import api from 'virtual:docs/api/components/address-input'
import { ApiTable, Example, FrameDefaults, Playground } from '../../../kit/index.ts'
import BusinessSearch from './business-search.tsx'
import Coordinates from './coordinates.tsx'
import CustomProvider from './custom-provider.tsx'
import AddressInputPlayground from './playground.tsx'
import SuggestionsOnFocus from './suggestions-on-focus.tsx'

export default function AddressInputPage() {
	return (
		<FrameDefaults box="column">
			<Playground
				of={AddressInputPlayground}
				api={api}
				ranges={{ debounce: { step: 100 }, minQueryLength: { min: 1 } }}
			/>
			<Example of={CustomProvider} />
			<Example of={Coordinates} />
			<Example of={SuggestionsOnFocus} />
			<Example of={BusinessSearch} />
			<ApiTable api={api} />
		</FrameDefaults>
	)
}
