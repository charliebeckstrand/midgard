import { Badge } from '../../../components/badge'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<Axes of="Badge" omit={['href']} render={(props, label) => <Badge {...props}>{label}</Badge>} />
	)
}
