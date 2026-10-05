import api from 'virtual:docs/api/components/command-palette'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CustomFooter from './custom-footer.tsx'
import Descriptions from './descriptions.tsx'
import Glass from './glass.tsx'
import ItemActions from './item-actions.tsx'
import KeyboardShortcut from './keyboard-shortcut.tsx'
import CommandPalettePlayground from './playground.tsx'
import Virtualized from './virtualized.tsx'

export default function CommandPalettePage() {
	return (
		<>
			<Playground of={CommandPalettePlayground} api={api} omit={['open']} />
			<Example of={KeyboardShortcut} />
			<Example of={ItemActions} />
			<Example of={Descriptions} />
			<Example of={CustomFooter} />
			<Example of={Virtualized} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
