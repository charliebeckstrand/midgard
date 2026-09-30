import { Heading } from '../../../components/heading'
import { Axes } from '../../engine'

export function Demo() {
	return <Axes of="Heading" render={(props, label) => <Heading {...props}>{label}</Heading>} />
}
