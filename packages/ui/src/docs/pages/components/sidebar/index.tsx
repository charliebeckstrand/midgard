import api from 'virtual:docs/api/components/sidebar'
import type { ComponentType } from 'react'
import { cn } from 'ui/core'
import { ApiTable, ExampleFrame, getMeta, Playground } from '../../../kit/index.ts'
import ItemSize from './item-size.tsx'
import SidebarPlayground from './playground.tsx'
import Sections from './sections.tsx'
import WithActions from './with-actions.tsx'
import WithHeaderAndFooter from './with-header-and-footer.tsx'
import WithSuffixSlot from './with-suffix-slot.tsx'

// The heights of a frame that has the height of a layout, so a footer or a
// spacer has room. Each height lets all the content of its example show with
// space left for the spacer, so the example does not scroll.
const HEIGHTS = { tall: 'h-108', taller: 'h-168' } as const

// An app gives a sidebar the edge and the height of its layout. The page gives
// each example a frame for them, so the code of the example has no frame.
function SidebarExample({ of: Of, height }: { of: ComponentType; height?: keyof typeof HEIGHTS }) {
	return (
		<ExampleFrame meta={getMeta(Of)}>
			<div
				className={cn(
					'overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800',
					height && HEIGHTS[height],
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
			<SidebarExample of={WithHeaderAndFooter} height="tall" />
			<SidebarExample of={Sections} height="taller" />
			<SidebarExample of={WithSuffixSlot} />
			<SidebarExample of={WithActions} />
			<ApiTable api={api} />
		</>
	)
}
