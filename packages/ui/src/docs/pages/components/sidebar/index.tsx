import api from 'virtual:docs/api/components/sidebar'
import type { ComponentType } from 'react'
import { cn } from 'ui/core'
import { ApiTable, ExampleFrame, metaOf, Playground } from '../../../kit/index.ts'
import ItemSize from './item-size.tsx'
import SidebarPlayground from './playground.tsx'
import SectionsDividerAndSpacer from './sections-divider-and-spacer.tsx'
import WithActions from './with-actions.tsx'
import WithHeaderAndFooter from './with-header-and-footer.tsx'
import WithSuffixSlot from './with-suffix-slot.tsx'

// An app gives a sidebar the edge and the height of its layout. The page gives
// each example a frame for them, so the code of the example has no frame. A
// `tall` frame has the height of a layout, so a footer or a spacer has room.
function SidebarExample({ of: Of, tall = false }: { of: ComponentType; tall?: boolean }) {
	return (
		<ExampleFrame meta={metaOf(Of)}>
			<div
				className={cn(
					'overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800',
					tall && 'h-108',
				)}
			>
				<Of />
			</div>
		</ExampleFrame>
	)
}

export default function SidebarPage() {
	return (
		<>
			<Playground of={SidebarPlayground} api={api} />
			<SidebarExample of={ItemSize} />
			<SidebarExample of={WithHeaderAndFooter} tall />
			<SidebarExample of={SectionsDividerAndSpacer} tall />
			<SidebarExample of={WithSuffixSlot} />
			<SidebarExample of={WithActions} />
			<ApiTable api={api} />
		</>
	)
}
