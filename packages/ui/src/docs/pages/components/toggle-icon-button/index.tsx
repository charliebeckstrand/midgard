import api from 'virtual:docs/api/components/toggle-icon-button'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import MuteToggle from './mute-toggle.tsx'
import ToggleIconButtonPlayground from './playground.tsx'
import ThemeToggle from './theme-toggle.tsx'

export default function ToggleIconButtonPage() {
	return (
		<>
			<Playground of={ToggleIconButtonPlayground} api={api} omit={['pressed', 'defaultPressed']} />
			<Example of={ThemeToggle} />
			<Example of={MuteToggle} />
			<ApiTable api={api} />
		</>
	)
}
