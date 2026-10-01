import { Heading } from '../../../components/heading'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<Axes
			of="Heading"
			captions={false}
			render={(props, label) => <Heading {...props}>{label}</Heading>}
		/>
	)
}
