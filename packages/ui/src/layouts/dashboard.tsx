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

export type DashboardLayoutProps = PropsWithChildren<{
	filters?: ReactNode
}>

export function DashboardLayout({ filters, children }: DashboardLayoutProps) {
	const { open, setOpen } = useOffcanvas()

	return (
		<StackedLayout>
			<Stack gap={4}>
				{filters && (
					<>
						{/* Filters on desktop */}
						<Stack className="shrink-0 max-lg:hidden">{filters}</Stack>

						{/* Filter trigger on mobile */}
						<Box className="shrink-0 lg:hidden">
							<Button
								variant="outline"
								prefix={<Icon icon={<SlidersHorizontal />} />}
								onClick={() => setOpen(true)}
							>
								Filters
							</Button>
						</Box>

						{/* Filter drawer on mobile */}
						<Drawer open={open} onOpenChange={setOpen}>
							<DrawerTitle>Filters</DrawerTitle>
							<DrawerBody>
								<Stack gap={4}>{filters}</Stack>
							</DrawerBody>
						</Drawer>
					</>
				)}

				{children}
			</Stack>
		</StackedLayout>
	)
}
