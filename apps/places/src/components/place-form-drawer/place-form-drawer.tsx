'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert } from 'ui/alert'
import { Button } from 'ui/button'
import { DatePicker } from 'ui/date-picker'
import { Drawer, DrawerBody, DrawerClose, DrawerFooter, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { Field, Label, Message } from 'ui/fieldset'
import { Form, type SubmitResult } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { Rating } from 'ui/rating'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import type { PlaceDraft } from '../../types'
import { PlaceAddressField } from './place-address-field'
import { PlaceCategoryField } from './place-category-field'
import {
	locatePlace,
	type PlaceFormTarget,
	type PlaceValues,
	placeValidators,
	targetValues,
	toPlaceDraft,
	toVisitPlaceDraft,
} from './place-form'
import { placeGeocoder } from './place-geocoder'
import { PlacePhotosField } from './place-photos-field'
import { PlaceReviewField } from './place-review-field'
import { PlaceSearchField } from './place-search-field'
import { PlaceWebsiteField } from './place-website-field'

/**
 * How long a submit waits for the geocoder to find a typed address. The public
 * geocoder has no service level, and a submit that waits with no limit keeps
 * the button busy with no message.
 */
const LOCATE_TIMEOUT_MS = 10_000

/** Props for {@link PlaceFormDrawer}. */
export type PlaceFormDrawerProps = {
	/**
	 * What the drawer writes, or `null` to close it. It seeds the fields, picks
	 * which fields show, and names the panel.
	 */
	target: PlaceFormTarget | null
	onOpenChange: (open: boolean) => void
	/**
	 * Writes the place, with the visit of the form in it where the target is a
	 * visit. A rejection leaves the drawer open with the entry intact, and the
	 * drawer shows the message of the error.
	 */
	onSubmit: (draft: PlaceDraft) => Promise<unknown>
}

/**
 * What the panel calls itself and what its submit button says for a target, and
 * whether the target changes a record on file.
 */
function targetWords(target: PlaceFormTarget): { title: string; submit: string; editing: boolean } {
	if (target.kind === 'visit') {
		return target.visit === null
			? { title: 'Add visit', submit: 'Add visit', editing: false }
			: { title: 'Edit visit', submit: 'Save visit', editing: true }
	}

	return target.place === null
		? { title: 'Add place', submit: 'Add place', editing: false }
		: { title: 'Edit place', submit: 'Save changes', editing: true }
}

/** A key that changes with the record that a target writes. */
function targetKey(target: PlaceFormTarget): string {
	return target.kind === 'visit'
		? `visit:${target.place.id}:${target.visit?.id ?? 'new'}`
		: `place:${target.place?.id ?? 'new'}`
}

/**
 * What the drawer says about a failed submit. A timed-out search for the typed
 * address gets its own words, because the platform's words for it name an
 * operation that the reader never started.
 */
function failureMessage(error: unknown): string {
	if (error instanceof DOMException && error.name === 'TimeoutError') {
		return 'The address search did not answer. Try again.'
	}

	return error instanceof Error ? error.message : String(error)
}

/**
 * The half-height glass drawer that writes a place — a new one, or an edit of one
 * on record — or one visit to a place on record.
 *
 * One form for all of them, because each produces the same record: only what
 * the fields start as, which fields show, and what the panel calls itself
 * differ. A new place shows the fields of the place and of its first visit, an
 * edit of a place the fields of the place, and a visit the fields of the visit.
 * A second form would repeat the same fields and the same validators, and the
 * two would have to be kept in step by hand.
 *
 * The search field resolves a business name to its address and position, so a
 * place reaches the map without the reader ever typing coordinates — see
 * {@link PlaceSearchField} for what one pick fills in. For a place that the
 * search does not find, the reader types the address, and a submit finds the
 * position from it. Where the geocoder does not find the address either, the
 * reader types the latitude and the longitude ({@link PlaceAddressField}).
 */
export function PlaceFormDrawer({ target, onOpenChange, onSubmit }: PlaceFormDrawerProps) {
	const open = target !== null

	// The target the panel last opened on. A close clears the caller's, and the
	// panel stays mounted while it slides out — reading the caller's directly, an
	// edit would empty its own fields halfway through its exit. Only an open
	// writes to it, so the next open still seeds from what it was handed.
	const [held, setHeld] = useState(target)

	// Why the last write failed. The route refuses a write for reasons that no
	// field shows, such as an email that is not verified or a full list. Without
	// this message, a refused write only left the drawer open.
	const [failure, setFailure] = useState<string | null>(null)

	useEffect(() => {
		if (target === null) return

		setHeld(target)

		setFailure(null)
	}, [target])

	const seed = target ?? held ?? { kind: 'place', place: null }

	const { title, submit, editing } = targetWords(seed)

	// A new place takes its first visit with it. An edit of a place leaves its
	// visits to their own menu, and a visit has no fields of the place.
	const placeFields = seed.kind === 'place'

	const visitFields = seed.kind === 'visit' || seed.place === null

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerPanel
				glass
				// Grown to the form, and stopping at the screen rather than short of it —
				// the second case `DrawerProps.height` describes, measured here: at a 700px
				// window `auto` held the panel at 595 while the fields came to 709, leaving
				// the review below the fold.
				//
				// The travel matters to a form for its own reason. A validation message
				// appearing under a field changes the panel's height, and a panel that
				// jumped would move the fields under the reader's cursor at the moment they
				// are being told to fix one.
				height="fit"
				aria-label={title}
			>
				<Flex justify="between" align="center" className="px-6 pt-6">
					{/* A visit names its place under the title, because the form shows no
				    field of the place. */}
					<div className="min-w-0">
						<DrawerTitle className="p-0">{title}</DrawerTitle>

						{seed.kind === 'visit' ? (
							<Text tone="muted" className="truncate">
								{seed.place.name}
							</Text>
						) : null}
					</div>

					<DrawerClose>
						<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
					</DrawerClose>
				</Flex>

				<Form<PlaceValues>
					// The drawer unmounts its children while closed, so the form re-seeds
					// from `defaultValues` on each open and an abandoned entry never comes
					// back. Keyed on the open state as well, which covers the one case the
					// unmount misses: a reopen while the close is still animating out. The
					// edited place is in the key too, so opening a second one re-seeds
					// instead of keeping the first one's entry.
					key={`${String(open)}:${targetKey(seed)}`}
					defaultValues={targetValues(seed)}
					validate={placeValidators}
					onSubmit={async (values): Promise<SubmitResult<PlaceValues> | undefined> => {
						setFailure(null)

						try {
							if (seed.kind === 'visit') {
								await onSubmit(toVisitPlaceDraft(values, seed.place, seed.visit))
							} else {
								const located = await locatePlace(
									values,
									placeGeocoder,
									AbortSignal.timeout(LOCATE_TIMEOUT_MS),
								)

								if (located === null) {
									return {
										fieldErrors: {
											address:
												'That address was not found. Check it, search for the place, or input its coordinates.',
										},
									}
								}

								await onSubmit(toPlaceDraft(values, located, seed.place))
							}
						} catch (error) {
							setFailure(failureMessage(error))

							return undefined
						}

						onOpenChange(false)

						return undefined
					}}
				>
					<DrawerBody>
						{/* Two columns from `sm`, which is what keeps the form short enough for
					    the panel to hold all of it: stacked, these fields run past any
					    screen and the reader scrolls to reach the button they are aiming
					    for. The search leads across both, because it is the field that
					    fills the others. */}
						<Columns columns={{ initial: 1, sm: 2 }} gap="xl" align="start" className="pb-6">
							{placeFields ? (
								<>
									<div className="sm:col-span-2">
										<PlaceSearchField />
									</div>

									<Field>
										<Label>Name</Label>

										<Input name="name" placeholder="What is it called?" />

										<Message name="name" />
									</Field>

									<PlaceCategoryField />

									<div className="sm:col-span-2">
										<PlaceAddressField />
									</div>

									<div className="sm:col-span-2">
										<PlaceWebsiteField />
									</div>
								</>
							) : null}

							{visitFields ? (
								<>
									<Field>
										<Label>Visited</Label>

										<DatePicker name="visitedAt" className="w-full" />

										<Message name="visitedAt" />
									</Field>

									<div className="sm:col-span-2">
										<PlacePhotosField />
									</div>

									<Field className="sm:col-span-2">
										<Label as="span">Rating</Label>

										<Rating name="rating" size="lg" step={0.5} />
									</Field>

									<PlaceReviewField />
								</>
							) : null}

							{failure === null ? null : (
								<Alert severity="error" className="sm:col-span-2">
									<Text>{failure}</Text>
								</Alert>
							)}
						</Columns>
					</DrawerBody>

					<DrawerFooter>
						<Flex gap="sm" justify="end" full>
							<Button variant="plain" type="button" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>

							<Button type="submit" color={editing ? 'blue' : undefined}>
								{submit}
							</Button>
						</Flex>
					</DrawerFooter>
				</Form>
			</DrawerPanel>
		</Drawer>
	)
}
