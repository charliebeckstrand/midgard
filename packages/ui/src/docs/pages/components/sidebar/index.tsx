import api from 'virtual:docs/api/components/sidebar'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ItemSize from './item-size.tsx'
import SidebarPlayground from './playground.tsx'
import SectionsDividerAndSpacer from './sections-divider-and-spacer.tsx'
import WithActions from './with-actions.tsx'
import WithHeaderAndFooter from './with-header-and-footer.tsx'
import WithSuffixSlot from './with-suffix-slot.tsx'

export default function SidebarPage() {
	return (
		<>
			<Playground of={SidebarPlayground} api={api} />
			<Example of={ItemSize} />
			<Example of={WithHeaderAndFooter} />
			<Example of={SectionsDividerAndSpacer} />
			<Example of={WithSuffixSlot} />
			<Example of={WithActions} />
			<ApiTable api={api} />
		</>
	)
}
