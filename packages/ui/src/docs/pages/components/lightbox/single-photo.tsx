import { Lightbox, LightboxTrigger } from 'ui/lightbox'
import { photos } from './photos.ts'

const photo = photos.slice(0, 1)

export default function SinglePhoto() {
	return (
		<Lightbox photos={photo}>
			<LightboxTrigger />
		</Lightbox>
	)
}
