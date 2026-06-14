'use client'

import { SlidersHorizontal } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Box } from '../components/box'
import { Button } from '../components/button'
import { Drawer, DrawerBody, DrawerTitle } from '../components/drawer'
import { Icon } from '../components/icon'
import { Stack } from '../components/stack'
import { useOffcanvas } from '../hooks/use-offcanvas'
import { StackedLayout } from './stacked'

type DashboardLayoutProps = PropsWithChildren<{
	/**
	 * Optional filter controls. Render inline as a desktop `aside`; on mobile
	 * they collapse behind a "Filters" button that opens them in a {@link Drawer}.
	 */
	filters?: ReactNode
}>

/**
 * Stacked content layout with a responsive filter rail. Wraps {@link StackedLayout}
 * and, when `filters` is given, shows them beside the main column on desktop and
 * inside an offcanvas drawer on mobile.
 *
 * @remarks Client component: drives the mobile filter drawer via {@link useOffcanvas}.
 */
export function DashboardLayout({ filters, children }: DashboardLayoutProps) {
	const { open, setOpen } = useOffcanvas()

	return (
		<StackedLayout>
			<Stack gap="md">
				{filters && (
					<>
						{/* Filters on desktop */}
						<aside aria-label="Filters" data-slot="filters" className="shrink-0 max-lg:hidden">
							<Stack>{filters}</Stack>
						</aside>

						{/* Filter trigger on mobile */}
						<Box className="shrink-0 lg:hidden">
							<Button variant="outline" onClick={() => setOpen(true)}>
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
			</Stack>
		</StackedLayout>
	)
}
