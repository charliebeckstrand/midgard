import { useParams } from 'react-router'
import { DemoRoute } from '../../engine/app'

export default function DemoPageRoute() {
	const { id = '' } = useParams()

	return <DemoRoute id={id} />
}
