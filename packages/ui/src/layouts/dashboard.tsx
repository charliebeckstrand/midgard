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
	filters?: ReactNode
}>

export function DashboardLayout({ filters, children }: DashboardLayoutProps) {
	const { open, setOpen } = useOffcanvas()

	return (
		<StackedLayout>
			<Stack>
				{filters && (
					<>
						{/* Filters on desktop */}
						<Stack role="complementary" aria-label="Filters" className="shrink-0 max-lg:hidden">
							{filters}
						</Stack>

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

				<Box role="main" className="min-w-0 flex-1">
					{children}
				</Box>
			</Stack>
		</StackedLayout>
	)
}
