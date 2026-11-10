import api from 'virtual:docs/api/providers/glass'
import { ApiTable, Example } from '../../../kit/index.ts'
import FormControls from './form-controls.tsx'
import Menus from './menus.tsx'

export default function GlassPage() {
	return (
		<>
			<Example of={FormControls} />
			<Example of={Menus} />
			<ApiTable api={api} />
		</>
	)
}
