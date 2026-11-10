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
import { Dialog, DialogBody, DialogClose, DialogHeader, DialogPanel, DialogTitle } from 'ui/dialog'
import { Icon } from 'ui/icon'
import { MenuItem, MenuLabel } from 'ui/menu'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { MenuCrumb } from '../menu-crumb'

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
	/**
	 * Fires when the crumb is picked. The Drawer ignores it on the last crumb,
	 * which is where the reader is, so the last crumb is never a link.
	 */
	onPick?: () => void
	/**
	 * The address of the step that the crumb leads back to, beside `onPick`. A
	 * plain click calls `onPick`. A new tab or a copied link opens this address.
	 */
	href?: string
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
	subtitle?: ReactNode
	body: ReactNode
}

/**
 * The label of a crumb: a link back where the crumb acts, or the plain name
 * where it does not. The current crumb is where the reader is, so it does not act.
 */
function CrumbLink({ crumb, current }: { crumb: TrailCrumb; current: boolean }) {
	const onPick = current ? undefined : crumb.onPick

	return (
		<BreadcrumbLink
			current={current}
			href={onPick === undefined ? undefined : crumb.href}
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

/** Props for {@link ResultDrawer}. */
export type ResultDrawerProps = {
	/** What the Drawer shows, or `null` to close it. */
	view: DrawerView | null
	onClose: () => void
}

/**
 * The glass panel of a result, a Dialog. It is docked to the bottom on a phone
 * and centered from `sm`, so the panel is as wide as its content and not as
 * wide as the page. Its title is the trail, as in the summary Drawer of
 * Places. A crumb is the way back, so the panel needs no Back button. The
 * close sits at the end of that row. A crumb with a menu switches between
 * its choices, as the office crumb does. The panel is as tall as its body, and
 * travels between heights as the step or the view changes. A body taller than
 * the cap of the panel scrolls under the trail, which stays.
 */
export function ResultDrawer({ view, onClose }: ResultDrawerProps) {
	// The last view, so that the body stays while the panel closes.
	const [last, setLast] = useState(view)

	if (view !== null && view !== last) setLast(view)

	const shown = view ?? last

	const title = shown?.steps.map((step) => step.label).join(' › ') ?? ''

	return (
		<Dialog open={view !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
			<DialogPanel glass height="fit" footer={null} aria-label={title}>
				{/* The trail and the body are children of the panel, so the body is the scroll region of the panel. */}
				<DialogHeader>
					<Flex align="start" justify="between" gap="lg">
						<Stack gap="xs" flex="1" className="min-w-0">
							<DialogTitle className="sr-only">{title}</DialogTitle>

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
														label={step.label}
														current={index === shown.steps.length - 1}
														link={
															step.onPick === undefined ||
															index === shown.steps.length - 1 ? undefined : (
																<CrumbLink
																	crumb={step}
																	current={index === shown.steps.length - 1}
																/>
															)
														}
													>
														{step.menu.map((choice) => (
															<MenuItem
																key={choice.label}
																disabled={choice.disabled}
																onAction={choice.onPick}
															>
																<MenuLabel>{choice.label}</MenuLabel>
															</MenuItem>
														))}
													</MenuCrumb>
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

						<DialogClose>
							<Button type="button" variant="bare" aria-label="Close">
								<Icon icon={<X />} />
							</Button>
						</DialogClose>
					</Flex>
				</DialogHeader>

				{/* A panel body mutes its text, for the prose of a dialog. The body here holds
				    results, so it takes the default text color, as the page does. */}
				<DialogBody className="text-zinc-950 dark:text-white">{shown?.body}</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
