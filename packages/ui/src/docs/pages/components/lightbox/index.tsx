import api from 'virtual:docs/api/components/lightbox'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import LightboxPlayground from './playground.tsx'
import SinglePhoto from './single-photo.tsx'
import Thumbnails from './thumbnails.tsx'

export default function LightboxPage() {
	return (
		<>
			<Playground of={LightboxPlayground} api={api} ratio />
			<Example of={SinglePhoto} ratio />
			<Example of={Thumbnails} ratio />
			<ApiTable api={api} />
		</>
	)
}
