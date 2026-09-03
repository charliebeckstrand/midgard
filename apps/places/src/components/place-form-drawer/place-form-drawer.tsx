'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { DatePicker } from 'ui/date-picker'
import { Drawer, DrawerBody, DrawerClose, DrawerFooter, DrawerTitle } from 'ui/drawer'
import { Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Rating } from 'ui/rating'
import { Textarea } from 'ui/textarea'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { CATEGORIES, categoryLabel } from '../../constants'
import type { Place, PlaceCategory, PlaceDraft } from '../../types'
import { type PlaceValues, placeValidators, toFormValues, toPlaceDraft } from './place-form'
import { PlaceSearchField } from './place-search-field'

/** Props for {@link PlaceFormDrawer}. */
export type PlaceFormDrawerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * The place to edit, or `null` to add one. It seeds the fields and names the
	 * panel; nothing else changes, because an edit writes the record a create
	 * writes.
	 */
	place?: Place | null
	/** Writes the place. A rejection leaves the drawer open with the entry intact. */
	onSubmit: (draft: PlaceDraft) => Promise<unknown>
}

/** A fresh form. */
function emptyValues(): PlaceValues {
	return {
		place: undefined,
		name: '',
		category: undefined,
		rating: 0,
		// A place is usually added just after the visit, so today is the useful
		// default and the field stays editable.
		visitedAt: new Date(),
		url: '',
		photo: '',
		review: '',
	}
}

/**
 * The half-height glass drawer that writes a place — a new one, or an edit of one
 * on record.
 *
 * One form for both, because a create and an edit produce the same record: only
 * what the fields start as and what the panel calls itself differ. A second form
 * for the edit would repeat the same seven fields and the same validators, and
 * the two would have to be kept in step by hand.
 *
 * The search field resolves a business name to its address and position, so a
 * place reaches the map without the reader ever typing coordinates — see
 * {@link PlaceSearchField} for what one pick fills in.
 */
export function PlaceFormDrawer({
	open,
	onOpenChange,
	place = null,
	onSubmit,
}: PlaceFormDrawerProps) {
	// The place the panel last opened on. A close clears the caller's, and the
	// panel stays mounted while it slides out — reading the caller's directly, an
	// edit would empty its own fields halfway through its exit. Only an open
	// writes to it, so the next open still seeds from what it was handed.
	const [held, setHeld] = useState(place)

	useEffect(() => {
		if (open) setHeld(place)
	}, [open, place])

	const seed = open ? place : held

	const editing = seed !== null

	const title = editing ? 'Edit place' : 'Add place'

	return (
		<Drawer
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
			open={open}
			onOpenChange={onOpenChange}
			aria-label={title}
		>
			<Flex justify="between" align="center" className="px-6 pt-6">
				<DrawerTitle className="p-0">{title}</DrawerTitle>

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
				key={`${String(open)}:${seed?.id ?? 'new'}`}
				defaultValues={seed === null ? emptyValues() : toFormValues(seed)}
				validate={placeValidators}
				onSubmit={async (values) => {
					await onSubmit(toPlaceDraft(values, seed))

					onOpenChange(false)
				}}
			>
				<DrawerBody>
					{/* Two columns from `sm`, which is what keeps the form short enough for
					    the panel to hold all of it: stacked, these fields run past any
					    screen and the reader scrolls to reach the button they are aiming
					    for. The search leads across both, because it is the field that
					    fills the others. */}
					<div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 pb-6 sm:grid-cols-2">
						<div className="sm:col-span-2">
							<PlaceSearchField />
						</div>

						<Field>
							<Label>Name</Label>

							<Input name="name" placeholder="What is it called?" />

							<Message name="name" />
						</Field>

						<Field>
							<Label>Category</Label>

							{/* Clearable, because a reader who picked the wrong one otherwise has
							    no way back to having picked nothing. Category is required, so
							    clearing surfaces the field's own message on submit rather than
							    writing a place without one. */}
							<Listbox<PlaceCategory>
								name="category"
								placeholder="Pick a category"
								clearable
								displayValue={categoryLabel}
							>
								{CATEGORIES.map((category) => (
									<ListboxOption key={category.value} value={category.value}>
										<ListboxLabel>{category.label}</ListboxLabel>
									</ListboxOption>
								))}
							</Listbox>

							<Message name="category" />
						</Field>

						<Field>
							<Label>Visited</Label>

							<DatePicker name="visitedAt" />

							<Message name="visitedAt" />
						</Field>

						<Field>
							<Label>Website</Label>

							<Input name="url" type="url" placeholder="https://" />

							<Message name="url" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Photo</Label>

							<Input name="photo" type="url" placeholder="https://" />

							<Message name="photo" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Rating</Label>

							<Rating name="rating" size="lg" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Your review</Label>

							<Textarea name="review" rows={3} placeholder="How was it?" />
						</Field>
					</div>
				</DrawerBody>

				<DrawerFooter>
					<Flex gap="sm" justify="end" full>
						<Button variant="plain" type="button" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>

						<Button type="submit" color={editing ? 'blue' : undefined}>
							{editing ? 'Save changes' : 'Add place'}
						</Button>
					</Flex>
				</DrawerFooter>
			</Form>
		</Drawer>
	)
}
