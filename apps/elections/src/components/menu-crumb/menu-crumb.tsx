'use client'

import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { BreadcrumbLink } from 'ui/breadcrumb'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuTrigger } from 'ui/menu'
import { Flex } from 'ui/structure/flex'

/** Props for {@link MenuCrumb}. */
export type MenuCrumbProps = {
	label: string
	/** The crumb is where the reader is. */
	current: boolean
	/**
	 * The label as a link, for a crumb that leads somewhere. Omit it for a crumb
	 * that leads nowhere.
	 */
	link?: ReactNode
	/** The items of the menu. */
	children: ReactNode
}

/**
 * A crumb with a menu, such as the office crumb of the Drawer or the election
 * crumb of the header. A crumb that leads somewhere keeps its label as the
 * link, and a chevron after it opens the menu. A crumb that leads nowhere is
 * one button of its label and its chevron, so a press on any part of it opens
 * the menu. The chevron is within a pixel of its place in the other form. In
 * both forms the label gives way to a mark when the row runs out of room, and
 * the chevron stays.
 */
export function MenuCrumb({ label, current, link, children }: MenuCrumbProps) {
	if (link === undefined) {
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
							<BreadcrumbLink current={current} className="font-semibold">
								{label}
							</BreadcrumbLink>

							<Icon
								icon={<ChevronDown />}
								className="text-zinc-600 group-hover:text-zinc-950 dark:text-zinc-400 dark:group-hover:text-white"
							/>
						</Flex>
					</button>
				</MenuTrigger>

				<MenuContent>{children}</MenuContent>
			</Menu>
		)
	}

	return (
		<span className="inline-flex min-w-0 items-center">
			{link}

			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button
						type="button"
						variant="bare"
						aria-label={`Switch from ${label}`}
						className="shrink-0"
					>
						<Icon icon={<ChevronDown />} />
					</Button>
				</MenuTrigger>

				<MenuContent>{children}</MenuContent>
			</Menu>
		</span>
	)
}
