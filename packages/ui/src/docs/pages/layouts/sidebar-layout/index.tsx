import api from 'virtual:docs/api/layouts/sidebar'
import { ApiTable, Example } from '../../../kit/index.ts'
import AppShell from './app-shell.tsx'
import DrawerAtEachWidth from './drawer-at-each-width.tsx'
import WithAside from './with-aside.tsx'

// A layout fills the area of its example as it fills a window: `viewport`
// gives the area a height, and `page` takes the padding away.
export default function SidebarLayoutPage() {
	return (
		<>
			<Example of={AppShell} viewport page />
			<Example of={WithAside} viewport page />
			<Example of={DrawerAtEachWidth} viewport page />
			<ApiTable api={api} />
		</>
	)
}
