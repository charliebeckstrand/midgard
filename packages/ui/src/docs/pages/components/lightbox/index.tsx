import api from 'virtual:docs/api/components/lightbox'
import { ApiTable, Example } from '../../../kit/index.ts'
import Gallery from './gallery.tsx'
import SinglePhoto from './single-photo.tsx'
import Thumbnails from './thumbnails.tsx'

export default function LightboxPage() {
	return (
		<>
			<Example of={SinglePhoto} />
			<Example of={Gallery} />
			<Example of={Thumbnails} />
			<ApiTable api={api} />
		</>
	)
}
