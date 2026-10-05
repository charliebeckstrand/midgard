import api from 'virtual:docs/api/components/menu'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Capped from './capped.tsx'
import Controlled from './controlled.tsx'
import Glass from './glass.tsx'
import IconsAndShortcuts from './icons-and-shortcuts.tsx'
import ItemDescriptions from './item-descriptions.tsx'
import KeepOpen from './keep-open.tsx'
import MenuPlayground from './playground.tsx'
import RightClick from './right-click.tsx'
import Sections from './sections.tsx'
import Submenus from './submenus.tsx'
import TitleAndDescription from './title-and-description.tsx'

export default function MenuPage() {
	return (
		<>
			<Playground
				of={MenuPlayground}
				api={api}
				omit={['open', 'defaultOpen', 'placement', 'capped']}
			/>
			<Example of={IconsAndShortcuts} />
			<Example of={Sections} />
			<Example of={ItemDescriptions} />
			<Example of={Submenus} />
			<Example of={TitleAndDescription} />
			<Example of={KeepOpen} />
			<Example of={Controlled} />
			<Example of={RightClick} />
			<Example of={Capped} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
