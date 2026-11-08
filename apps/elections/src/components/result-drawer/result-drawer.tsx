'use client'

import { ChevronDown, X } from 'lucide-react'
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
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { Container } from 'ui/structure/container'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'

/** One choice of the menu of a crumb, such as an office of the office crumb. */
export type CrumbChoice = {
	label: string
	/** The choice names nothing in this place, so it takes no pick. */
	disabled: boolean
	onPick: () => void
}

/** One crumb of the trail of a {@link ResultDrawer}. */
export type TrailCrumb = {
	label: string
	/** Fires when the crumb is picked. Absent for the last crumb, which is where the reader is. */
	onPick?: () => void
	/**
	 * The choices of the menu of the crumb, such as the offices of a state. A
	 * chevron after a crumb that leads back opens them. A press on any part of a
	 * crumb that leads nowhere opens them.
	 */
	menu?: readonly CrumbChoice[]
}

/** What a {@link ResultDrawer} shows: its trail, an optional line under it, and its body. */
export type DrawerView = {
	steps: readonly TrailCrumb[]
	/** A line under the trail, such as `Special election`. */
	subtitle?: string
	body: ReactNode
}

/** The label of a crumb: a link back where the crumb acts, or the plain name where it does not. */
function CrumbLink({ crumb, current }: { crumb: TrailCrumb; current: boolean }) {
	const { onPick } = crumb

	return (
		<BreadcrumbLink
			current={current}
			href={onPick === undefined ? undefined : '#'}
			className="font-semibold"
			onClick={
				onPick === undefined
					? undefined
					: (event: MouseEvent) => {
							event.preventDefault()

							onPick()
						}
			}
		>
			{crumb.label}
		</BreadcrumbLink>
	)
}

/**
 * A crumb with a menu. A crumb that leads back keeps its label as the link, and
 * a chevron after it opens the menu, as the election crumb of the header. A
 * crumb that leads nowhere is one button of its label and its chevron, so a
 * press on any part of it opens the menu. The chevron is within a pixel of its
 * place in the other form.
 */
function MenuCrumb({
	crumb,
	menu,
	current,
}: {
	crumb: TrailCrumb
	menu: readonly CrumbChoice[]
	current: boolean
}) {
	const content = (
		<MenuContent>
			{menu.map((choice) => (
				<MenuItem key={choice.label} disabled={choice.disabled} onAction={choice.onPick}>
					<MenuLabel>{choice.label}</MenuLabel>
				</MenuItem>
			))}
		</MenuContent>
	)

	if (crumb.onPick === undefined) {
		return (
			<Menu placement="bottom-start">
				<MenuTrigger>
					{/* The children of a button are presentational, so the button carries the
					    current mark. The chevron takes the muted color of the trail, as in the
					    other form. */}
					<button
						type="button"
						aria-current={current ? 'page' : undefined}
						className="group inline-flex min-w-0 max-w-full cursor-pointer rounded-sm text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
					>
						<Flex as="span" align="center" gap="xs" className="min-w-0">
							<CrumbLink crumb={crumb} current={current} />

							<Icon
								icon={<ChevronDown />}
								className="text-zinc-600 group-hover:text-zinc-950 dark:text-zinc-400 dark:group-hover:text-white"
							/>
						</Flex>
					</button>
				</MenuTrigger>

				{content}
			</Menu>
		)
	}

	return (
		<span className="inline-flex min-w-0 items-center">
			<CrumbLink crumb={crumb} current={current} />

			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button
						type="button"
						variant="bare"
						aria-label={`Switch from ${crumb.label}`}
						className="shrink-0"
					>
						<Icon icon={<ChevronDown />} />
					</Button>
				</MenuTrigger>

				{content}
			</Menu>
		</span>
	)
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
 * panel needs no Back button, and the close sits at the end of that row. A
 * crumb with a menu switches between its choices, as the office crumb does.
 * The panel is as tall as its body, and moves between heights as the step
 * changes. A body taller than the screen scrolls under the trail, which stays. The content is one column on the left edge of
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
				{/* The trail and the body are children of the panel, so the body is the scroll region of the panel. */}
				<Container size="lg" padding="lg" className="h-auto shrink-0">
					{/* The space above the trail is the 16px slot gap that the panel puts under it.
					    Thus the trail, the body, and the cards in the body all stand one gap apart. */}
					<div className="max-w-[440px] pt-4">
						<Flex align="start" justify="between" gap="lg">
							<Stack gap="xs" flex="1" className="min-w-0">
								<DrawerTitle className="sr-only p-0">{title}</DrawerTitle>

								<Breadcrumb collapse>
									<BreadcrumbList className="text-base/7">
										{shown?.steps.map((step, index) => (
											<Fragment key={index}>
												{index > 0 ? <BreadcrumbSeparator /> : null}

												<BreadcrumbItem>
													{step.menu === undefined ? (
														<CrumbLink crumb={step} current={index === shown.steps.length - 1} />
													) : (
														<MenuCrumb
															crumb={step}
															menu={step.menu}
															current={index === shown.steps.length - 1}
														/>
													)}
												</BreadcrumbItem>
											</Fragment>
										))}
									</BreadcrumbList>
								</Breadcrumb>

								{shown?.subtitle === undefined ? null : (
									<span className="text-sm text-zinc-600 dark:text-zinc-400">{shown.subtitle}</span>
								)}
							</Stack>

							<DrawerClose>
								<Button type="button" variant="bare" aria-label="Close">
									<Icon icon={<X />} />
								</Button>
							</DrawerClose>
						</Flex>
					</div>
				</Container>

				<DrawerBody className="px-0">
					<Container size="lg" padding="lg" className="h-auto">
						<div className="max-w-[440px]">{shown?.body}</div>
					</Container>
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}
