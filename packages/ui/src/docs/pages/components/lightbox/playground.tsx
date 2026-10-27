import { Columns } from 'ui/columns'
import { Lightbox, type LightboxProps, LightboxTrigger } from 'ui/lightbox'
import { photos } from './photos.ts'

export default function LightboxPlayground(props: LightboxProps) {
	return (
		<Lightbox {...props} photos={photos}>
			<Columns columns={3} gap="sm">
				{photos.map((photo, index) => (
					<LightboxTrigger key={photo.alt} index={index} className="aspect-square" />
				))}
			</Columns>
		</Lightbox>
	)
}
