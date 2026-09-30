import { StatusDot } from '../../../components/status'
import { Axes } from '../../engine'

export function Demo() {
	return <Axes of="StatusDot" render={(props) => <StatusDot {...props} />} />
}
