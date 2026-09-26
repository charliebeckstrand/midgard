'use client'

import { SlidersHorizontal } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Box } from '../components/box'
import { Button } from '../components/button'
import { Drawer, DrawerBody, DrawerTitle } from '../components/drawer'
import { Flex } from '../components/flex'
import { Icon } from '../components/icon'
import { Stack } from '../components/stack'
import { useOffcanvas } from '../hooks/use-offcanvas'
import { StackedLayout } from './stacked'

/** Props for {@link DashboardLayout}: the filter panel and the main region beside it. */
export type DashboardLayoutProps = PropsWithChildren<{
	/**
	 * Optional filter controls. They render inline as a desktop `aside`, beside
	 * the main column; on mobile they collapse behind a "Filters" button that
	 * opens them in a {@link Drawer}.
	 *
	 * @remarks
	 * A prop and not a compound child, deliberately. The layout renders this
	 * content in two places at once — the desktop rail and the mobile drawer —
	 * and hides one by breakpoint. A compound child sits where it is written, so
	 * it can fill one of the two. The second would have to come from a registry
	 * that re-renders the same tree elsewhere, duplicating the content's own
	 * state and ids. That is the rule the layout family reads by:
	 * a wrapping region composes, and an off-tree panel is a prop.
	 */
	filters?: ReactNode
	/**
	 * Fires when the mobile filter drawer opens or closes, whatever drove it: the
	 * "Filters" button, a dismissal, or the viewport widening past `--breakpoint-lg`.
	 *
	 * Observation only. The layout owns the drawer and there is no `open` prop to pair
	 * with. The desktop rail is always present, so it reports nothing.
	 */
	onOpenChange?: (open: boolean) => void
}>

/**
 * Stacked content layout with a responsive filter rail. Wraps {@link StackedLayout}
 * and, when `filters` is given, shows them beside the main column on desktop and
 * inside an offcanvas drawer on mobile.
 *
 * @remarks
 * Client component: drives the mobile filter drawer via {@link useOffcanvas}.
 *
 * The rail and the main column sit in a row from `lg` up, which is the
 * breakpoint the rail itself appears at. Below it the rail is hidden and the
 * column is the only child, so the axis does not show. This was a `<Stack>`,
 * which is a column at every width. The desktop rail therefore rendered above
 * the main region rather than beside it, against this component's contract.
 */
export function DashboardLayout({ filters, onOpenChange, children }: DashboardLayoutProps) {
	const { open, setOpen } = useOffcanvas({ onOpenChange })

	return (
		<StackedLayout>
			{/* A row centers its cross axis by default. The rail starts at the top of the
			    main column. */}
			<Flex
				direction={{ initial: 'col', lg: 'row' }}
				align={{ initial: 'stretch', lg: 'start' }}
				gap="md"
			>
				{filters && (
					<>
						{/* Filters on desktop */}
						<aside aria-label="Filters" data-slot="filters" className="shrink-0 max-lg:hidden">
							<Stack>{filters}</Stack>
						</aside>

						{/* Filter trigger on mobile */}
						<Box className="shrink-0 lg:hidden">
							<Button type="button" variant="outline" onClick={() => setOpen(true)}>
								<Icon icon={<SlidersHorizontal />} />
								Filters
							</Button>
						</Box>

						{/* Filter drawer on mobile */}
						<Drawer open={open} onOpenChange={setOpen}>
							<DrawerTitle>Filters</DrawerTitle>
							<DrawerBody>
								<Stack>{filters}</Stack>
							</DrawerBody>
						</Drawer>
					</>
				)}

				<main data-slot="main" className="min-w-0 flex-1">
					{children}
				</main>
			</Flex>
		</StackedLayout>
	)
}
