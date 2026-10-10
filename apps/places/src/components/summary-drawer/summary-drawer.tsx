'use client'

import { X } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Drawer, DrawerBody, DrawerClose, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { Icon } from 'ui/icon'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import type { Located } from '../../types'
import type { PlacePanelStep } from '../../utilities/places-url'
import { groupName } from '../../utilities/places-view'
import { PlaceTrail, type PlaceTrailStep } from '../place-trail'

/**
 * The list the drawer shows, and the name of the group's own step over it.
 *
 * A picked group of two or more that is a part of its region — a summary dot
 * that merged some of the region's records — is a step of its own under the
 * region, so the drawer lists what the reader picked, and the region crumb is
 * one step back to the rest. Every other pick lists the region, and has no
 * group step. A record the map placed in no region has no region list, so the
 * group it was picked from stands in.
 */
export function drawerList<T extends Located>(
	group: readonly T[],
	regionPlaces: readonly T[],
	widened: boolean,
): { list: readonly T[]; group: string | null } {
	const region = regionPlaces.length > 0 ? regionPlaces : group

	if (widened || group.length < 2) return { list: region, group: null }

	const ids = new Set(region.map((item) => item.id))

	const part = region.length !== group.length || group.some((item) => !ids.has(item.id))

	return part ? { list: group, group: groupName(group) } : { list: region, group: null }
}

/**
 * The record the drawer shows, or `null` on a list.
 *
 * The opened record is read back through the live list, so an edit shows in the
 * open panel rather than at the next pick, and an id that the list does not hold
 * falls back to the list. A lone dot opens on its record until the reader widens
 * the list, because a lone dot has no group to list.
 */
export function drawerItem<T extends Located>(
	group: readonly T[],
	list: readonly T[],
	step: PlacePanelStep,
): T | null {
	const opened = step.opened === null ? undefined : list.find((item) => item.id === step.opened)

	if (opened !== undefined) return opened

	return !step.widened && group.length === 1 ? (group[0] ?? null) : null
}

/**
 * The trail of the drawer as steps that act. Every region step but the last
 * leads out to the map. The last leads to the region's list, where the reader is
 * not already on it; the group's step leads back to the group's list; and the
 * record itself leads nowhere, because it is where the reader already is.
 */
export function trailSteps({
	where,
	group,
	item,
	hasList,
	onNavigate,
	onStepChange,
}: {
	/** The regions, from the drawn one down. */
	where: readonly string[]
	/** The name of the group's own step, or `null` where the list is the region's. */
	group: string | null
	/** The open record, or `null` on a list. */
	item: Located | null
	/** Whether there is a list to go back to. */
	hasList: boolean
	onNavigate: (region: string) => void
	onStepChange: (step: PlacePanelStep) => void
}): PlaceTrailStep[] {
	// The region crumb lists the whole region. It acts where the group is a step of
	// its own under it, or where a record is open over a list to go back to.
	const regionPick =
		group !== null || (item !== null && hasList)
			? () => onStepChange({ opened: null, widened: true })
			: undefined

	const steps: PlaceTrailStep[] = where.map((label, at) => ({
		label,
		onPick: at < where.length - 1 ? () => onNavigate(label) : regionPick,
	}))

	if (group !== null) {
		steps.push({
			label: group,
			onPick: item === null ? undefined : () => onStepChange({ opened: null, widened: false }),
		})
	}

	if (item !== null) steps.push({ label: item.name })

	return steps
}

/** What the list body of a {@link SummaryDrawer} gets. */
export type SummaryDrawerList<T extends Located> = {
	/** Every record of the step, before the caller narrows it. */
	list: readonly T[]
	/** The records that the caller's `narrow` lets through, in its order. */
	shown: readonly T[]
	/** Opens one record of the list, by id, as a step of the trail. */
	open: (id: string) => void
}

/** Props for {@link SummaryDrawer}. */
export type SummaryDrawerProps<T extends Located> = {
	/**
	 * The records the picked dot stands for. One for a lone dot, several for a
	 * summary; empty closes the drawer.
	 */
	items: readonly T[]
	/**
	 * The regions the picked dot stands in, from the drawn one down — empty where
	 * none holds it. The last step is what the list under it is.
	 *
	 * A trail rather than one name, because a summary dot on the world map often
	 * merges one town's worth of records: the country it drew in is the coarser
	 * answer, and the state every one of them shares is the one the reader can see
	 * it standing on.
	 */
	trail: readonly string[]
	/** Every record in the trail's last region — the list its crumb leads back to. */
	regionItems: readonly T[]
	/**
	 * The step of the trail that the panel shows. The caller holds it, so that the
	 * address carries it and a reload opens the panel on the same crumb.
	 */
	step: PlacePanelStep
	/** Moves the panel to another step of its trail. */
	onStepChange: (step: PlacePanelStep) => void
	onOpenChange: (open: boolean) => void
	/**
	 * Takes the map to one of the trail's upper regions.
	 *
	 * Without it those steps are plain text: a crumb that lights under the pointer
	 * and answers nothing is worse than one that never offered.
	 */
	onNavigate: (region: string) => void
	/**
	 * Narrows and orders the list of a step. Held by the caller, because the
	 * drawer keys the list on its identity.
	 */
	narrow: (list: readonly T[]) => readonly T[]
	/** What several of the records are called, for the count that names a list with no region. */
	noun: string
	/** The menu of the open record, beside the close. */
	menu: (item: T) => ReactNode
	/** The body of the drawer over one record. */
	details: (item: T) => ReactNode
	/** The body of the drawer over a list. */
	list: (view: SummaryDrawerList<T>) => ReactNode
}

/**
 * The glass drawer that shows what a dot stands for: a list of records, or one
 * record. The caller gives the bodies; the drawer owns the trail, the step,
 * and the size.
 *
 * It is as tall as the step it is showing. One record leaves most of the map
 * up, including the dot that opened the panel; a region with records enough
 * takes the screen, because a step with that much to show is one the reader
 * came to read. The panel travels between the two rather than snapping, so the
 * resize reads as the crumb being followed instead of the panel moving under
 * the reader's hand.
 *
 * A summary dot opens as the list of the records it merged, under a step named
 * for them — their shared city, or a count — beneath the region they stand in.
 * The region crumb widens the list to every record in the region. A summary
 * that merged the whole region opens as the region's list, with no step of its
 * own. A lone dot opens straight into its record.
 *
 * The title is the trail rather than a name, so it is also the way back: each
 * crumb returns to the list it names. There is no Back button, because the crumb
 * is one. The caller holds the step of the trail in the address, so a reload or
 * a shared link opens the panel on the same crumb, and the browser's Back button
 * walks back along the trail.
 */
export function SummaryDrawer<T extends Located>({
	items,
	trail,
	regionItems,
	step,
	onStepChange,
	onOpenChange,
	onNavigate,
	narrow,
	noun,
	menu,
	details,
	list,
}: SummaryDrawerProps<T>) {
	// The last group the drawer was given, and its step. The panel stays mounted
	// while it closes so the slide out plays, and a closing panel is handed an
	// empty group and the start step — so the body reads the last open ones rather
	// than the current ones, or it would blank or flip back to the list halfway
	// through its own exit.
	const [last, setLast] = useState({ items, step })

	const open = items.length > 0

	const { items: held, step: heldStep } = open ? { items, step } : last

	// Keeps the group and the step that a close will need. Guarded on the close,
	// which is what hands over the empty group the hold exists to survive.
	useEffect(() => {
		if (items.length === 0) return

		setLast({ items, step })
	}, [items, step])

	// The list under the trail, and the group's own step over it where there is
	// one. See `drawerList` for which list that is.
	const { list: listed, group } = useMemo(
		() => drawerList(held, regionItems, heldStep.widened),
		[held, regionItems, heldStep.widened],
	)

	const shown = useMemo(() => narrow(listed), [listed, narrow])

	const item = drawerItem(held, listed, heldStep)

	// A record the map placed in no region falls back to the count, which is the
	// only other thing the group has to say about itself. Counted after the
	// narrowing, so the heading agrees with the rows under it.
	//
	// Held, because the fallback is a fresh array every render and the steps below
	// are keyed on this one: rebuilt each time, the memo under it never holds.
	const where = useMemo(
		() => (trail.length > 0 ? trail : [`${shown.length} ${noun}`]),
		[trail, shown.length, noun],
	)

	const steps = useMemo(
		() =>
			trailSteps({
				where,
				group,
				item,
				hasList: listed.length > 0,
				onNavigate,
				onStepChange,
			}),
		[where, group, item, listed.length, onNavigate, onStepChange],
	)

	const title = steps.map((step) => step.label).join(' › ')

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerPanel
				glass
				// Grown to what each step holds, because this panel is navigated: the
				// crumb walks between the region's list and one record, and the two are
				// not the same size. A fixed height fits one of them — a list of twelve
				// scrolls inside a box built for one record, and a record sits in a box
				// built for the list with half of it empty under the review.
				//
				// The travel is what makes that work rather than the size: a container
				// moving because its contents changed reads as the panel collapsing under
				// the reader's hand, and the same move at the speed of the crumb reads as
				// the panel following it. A region with records enough covers the map, which
				// is the honest answer for a step with that much to show — the crumb above
				// is how the reader gets back to it.
				height="fit"
				aria-label={title}
			>
				{/* The panel has no inset of its own, so the row takes the inset of a drawer title. */}
				<Flex justify="between" align="center" gap="md" className="px-6 pt-6">
					{/* `min-w-0` is what lets the trail inside give way. Without it this flex
				    child holds its full width, so a long trail runs past the panel edge
				    instead of truncating — the crumbs cannot shrink below a parent that
				    will not. `flex-1` gives the trail the panel's full width, which is the room
				    its fit measures. */}
					<Stack gap="sm" className="flex-1 min-w-0">
						{/* The title is the trail, so it doubles as the way back and the panel
					    needs no Back button of its own. `DrawerTitle` names the panel; the
					    crumbs are what the reader reads and act on. */}
						<DrawerTitle className="sr-only p-0">{title}</DrawerTitle>

						<PlaceTrail className="text-base/7" steps={steps} />
					</Stack>

					{/* The menu of the open record sits by the close, where a row of the
				    index sheet has its own. A list row in this panel is a way into a
				    record, not a record, so the list has no menu. */}
					<Flex gap="xs" align="center" className="shrink-0">
						{item ? menu(item) : null}

						<DrawerClose>
							<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
						</DrawerClose>
					</Flex>
				</Flex>

				<DrawerBody>
					{item
						? details(item)
						: list({
								list: listed,
								shown,
								open: (id) => onStepChange({ opened: id, widened: heldStep.widened }),
							})}
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}
