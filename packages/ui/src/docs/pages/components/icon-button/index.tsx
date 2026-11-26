import api from 'virtual:docs/api/components/icon-button'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Actions from './actions.tsx'
import AsLink from './as-link.tsx'
import Disabled from './disabled.tsx'
import HeldToggle from './held-toggle.tsx'
import MuteToggle from './mute-toggle.tsx'
import IconButtonPlayground from './playground.tsx'
import ThemeToggle from './theme-toggle.tsx'

export default function IconButtonPage() {
	return (
		<>
			<Playground of={IconButtonPlayground} api={api} />
			<Example of={Actions} />
			<Example of={ThemeToggle} />
			<Example of={MuteToggle} />
			<Example of={HeldToggle} />
			<Example of={Disabled} />
			<Example of={AsLink} />
			<ApiTable api={api} />
		</>
	)
}
