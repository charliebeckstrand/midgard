import { Badge } from '../../../components/badge'
import { Axes } from '../../engine'

export default function Demo() {
	return (
		<Axes
			of="Badge"
			captions={false}
			omit={['href']}
			render={(props, label) => <Badge {...props}>{label}</Badge>}
		/>
	)
}
