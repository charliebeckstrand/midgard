'use client'

import { X } from 'lucide-react'
import { Fragment, type MouseEvent, type ReactNode, useState } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Button } from 'ui/button'
import { Drawer, DrawerBody, DrawerClose, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { Icon } from 'ui/icon'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'

/** One step of the trail of a {@link ResultDrawer}. */
export type DrawerStep = {
	label: string
	/** Fires when the step is picked. Absent for the last step, which is where the reader is. */
	onPick?: () => void
}

/** What a {@link ResultDrawer} shows: its trail, the line under it, and its body. */
export type DrawerView = {
	steps: readonly DrawerStep[]
	/** The race under the trail, such as `Senate`. */
	subtitle: string
	body: ReactNode
}

/** Props for {@link ResultDrawer}. */
export type ResultDrawerProps = {
	/** What the Drawer shows, or `null` to close it. */
	view: DrawerView | null
	onClose: () => void
}

/**
 * The glass Drawer of a result, docked to the bottom, built as the summary
 * Drawer of Places: its title is the trail, so a crumb is the way back and the
 * panel needs no Back button, and the close sits at the end of that row. The
 * panel is as tall as its body. The content is one column on the left edge of
 * the page container, so it lines up with the header.
 */
export function ResultDrawer({ view, onClose }: ResultDrawerProps) {
	// The last view, so that the body stays while the panel slides out.
	const [last, setLast] = useState(view)

	if (view !== null && view !== last) setLast(view)

	const shown = view ?? last

	const title = shown?.steps.map((step) => step.label).join(' › ') ?? ''

	return (
		<Drawer open={view !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
			<DrawerPanel glass height="fit" footer={null} aria-label={title}>
				<Container size="lg" padding="lg" className="h-auto">
					<Stack className="max-w-[440px]">
						<Flex align="start" justify="between" gap="lg" className="pt-6">
							<Stack gap="xs" flex="1" className="min-w-0">
								<DrawerTitle className="sr-only p-0">{title}</DrawerTitle>

								<Breadcrumb collapse>
									<BreadcrumbList className="text-base/7">
										{shown?.steps.map((step, index) => (
											<Fragment key={index}>
												{index > 0 ? <BreadcrumbSeparator /> : null}

												<BreadcrumbItem>
													<BreadcrumbLink
														current={index === shown.steps.length - 1}
														href={step.onPick === undefined ? undefined : '#'}
														className="font-semibold"
														onClick={
															step.onPick === undefined
																? undefined
																: (event: MouseEvent) => {
																		event.preventDefault()

																		step.onPick?.()
																	}
														}
													>
														{step.label}
													</BreadcrumbLink>
												</BreadcrumbItem>
											</Fragment>
										))}
									</BreadcrumbList>
								</Breadcrumb>

								<span className="text-sm text-zinc-600 dark:text-zinc-400">{shown?.subtitle}</span>
							</Stack>

							<DrawerClose>
								<Button type="button" variant="bare" aria-label="Close">
									<Icon icon={<X />} />
								</Button>
							</DrawerClose>
						</Flex>

						<DrawerBody className="px-0">{shown?.body}</DrawerBody>
					</Stack>
				</Container>
			</DrawerPanel>
		</Drawer>
	)
}
