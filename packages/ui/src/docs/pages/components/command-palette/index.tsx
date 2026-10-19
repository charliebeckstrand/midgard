import api from 'virtual:docs/api/components/command-palette'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomFooter from './custom-footer.tsx'
import Glass from './glass.tsx'
import KeyboardShortcut from './keyboard-shortcut.tsx'
import CommandPalettePlayground from './playground.tsx'
import Virtualized from './virtualized.tsx'
import WithActions from './with-actions.tsx'
import WithDescriptions from './with-descriptions.tsx'

export default function CommandPalettePage() {
	return (
		<>
			<Playground of={CommandPalettePlayground} api={api} omit={['open']} />
			<Example of={KeyboardShortcut} />
			<Example of={WithActions} />
			<Example of={WithDescriptions} />
			<Example of={CustomFooter} />
			<Example of={Virtualized} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
