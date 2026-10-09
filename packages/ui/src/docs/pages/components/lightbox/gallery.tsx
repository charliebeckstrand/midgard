import { Columns } from 'ui/columns'
import { Lightbox, LightboxTrigger } from 'ui/lightbox'
import { photos } from './photos.ts'

export default function Gallery() {
	return (
		<Lightbox photos={photos}>
			<Columns columns={3} gap="sm">
				{photos.map((photo, index) => (
					<LightboxTrigger key={photo.alt} index={index} className="aspect-square" />
				))}
			</Columns>
		</Lightbox>
	)
}
