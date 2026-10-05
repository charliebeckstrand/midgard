import api from 'virtual:docs/api/components/address-input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import BusinessSearch from './business-search.tsx'
import Coordinates from './coordinates.tsx'
import CustomProvider from './custom-provider.tsx'
import AddressInputPlayground from './playground.tsx'
import SuggestionsOnFocus from './suggestions-on-focus.tsx'

export default function AddressInputPage() {
	return (
		<>
			<Playground of={AddressInputPlayground} api={api} />
			<Example of={CustomProvider} />
			<Example of={Coordinates} />
			<Example of={SuggestionsOnFocus} />
			<Example of={BusinessSearch} />
			<ApiTable api={api} />
		</>
	)
}
