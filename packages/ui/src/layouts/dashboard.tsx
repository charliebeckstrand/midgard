'use client'

import { SlidersHorizontal } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Button } from '../components/button'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle, DrawerTrigger } from '../components/drawer'
import { Icon } from '../components/icon'
import { OFFCANVAS_LAYOUT, type OffcanvasLayout, useOffcanvas } from '../hooks/use-offcanvas'
import { k } from '../recipes/kata/offcanvas'
import { Box } from '../structure/box'
import { Flex } from '../structure/flex'
import { Stack } from '../structure/stack'
import { mapResponsive, type Responsive, resolveVariant } from '../types'
import { StackedLayout } from './stacked'

/** The filters and the content stack in the drawer layout, and sit side by side inline. */
const toDirection = (layout: OffcanvasLayout) => (layout === 'inline' ? 'row' : 'col')

/** A row centers its cross axis by default. The rail starts at the top of the main column. */
const toAlign = (layout: OffcanvasLayout) => (layout === 'inline' ? 'start' : 'stretch')

/** Props for {@link DashboardLayout}: the filter panel and the main region beside it. */
export type DashboardLayoutProps = PropsWithChildren<{
	/**
	 * Optional filter controls. In the inline layout they render as an `aside`
	 * beside the main column. In the drawer layout they collapse behind a
	 * "Filters" button that opens them in a {@link Drawer}.
	 *
	 * @remarks
	 * A prop and not a compound child, deliberately. The layout renders this
	 * content in two places at once — the inline rail and the drawer — and
	 * hides one by breakpoint. A compound child sits where it is written, so
	 * it can fill one of the two. The second would have to come from a registry
	 * that re-renders the same tree elsewhere, duplicating the content's own
	 * state and ids. That is the rule the layout family reads by:
	 * a wrapping region composes, and an off-tree panel is a prop.
	 */
	filters?: ReactNode
	/**
	 * Where the filters are: in a `drawer` behind a "Filters" button, or `inline`
	 * beside the main column. A per-breakpoint map sets the layout from each
	 * breakpoint, mobile-first. A single value sets it at each width.
	 * @defaultValue {@link OFFCANVAS_LAYOUT}
	 */
	layout?: Responsive<OffcanvasLayout>
	/**
	 * Fires when the filter drawer opens or closes, whatever drove it: the
	 * "Filters" button, a dismissal, or the viewport widening to the inline layout.
	 *
	 * Observation only. The layout owns the drawer and there is no `open` prop to pair
	 * with. The inline rail does not open, so it reports nothing.
	 */
	onOpenChange?: (open: boolean) => void
}>

/**
 * Stacked content layout with a responsive filter rail. Wraps {@link StackedLayout}
 * and, when `filters` is given, shows them beside the main column or inside an
 * offcanvas drawer. `layout` chooses between the two at each breakpoint: a
 * drawer on a compact or a medium viewport, and inline when expanded.
 *
 * @remarks
 * Client component: drives the filter drawer via {@link useOffcanvas}.
 *
 * The rail and the main column sit in a row in the inline layout, where the
 * rail shows. In the drawer layout the rail is hidden and the column is the
 * only child, so the axis does not show.
 */
export function DashboardLayout({
	filters,
	layout = OFFCANVAS_LAYOUT,
	onOpenChange,
	children,
}: DashboardLayoutProps) {
	const { open, setOpen } = useOffcanvas({ layout, onOpenChange })

	return (
		<StackedLayout>
			{/* A row centers its cross axis by default. The rail starts at the top of the
			    main column. */}
			<Flex
				direction={mapResponsive(layout, toDirection)}
				align={mapResponsive(layout, toAlign)}
				gap="md"
			>
				{filters && (
					<Drawer open={open} onOpenChange={setOpen}>
						{/* One filter landmark at each width: the filters in the inline layout,
						    and the trigger of the drawer in the drawer layout. The trigger is
						    then in a landmark. */}
						<aside aria-label="Filters" data-slot="filters" className="shrink-0">
							<Stack className={resolveVariant(layout, k.inline.flex)}>{filters}</Stack>

							<Box className={resolveVariant(layout, k.drawer.block)}>
								<DrawerTrigger>
									<Button type="button" variant="outline">
										<Icon icon={<SlidersHorizontal />} />
										Filters
									</Button>
								</DrawerTrigger>
							</Box>
						</aside>

						{/* Filter drawer */}
						<DrawerPanel>
							<DrawerTitle>Filters</DrawerTitle>
							<DrawerBody>
								<Stack>{filters}</Stack>
							</DrawerBody>
						</DrawerPanel>
					</Drawer>
				)}

				<main data-slot="main" className="min-w-0 flex-1">
					{children}
				</main>
			</Flex>
		</StackedLayout>
	)
}
