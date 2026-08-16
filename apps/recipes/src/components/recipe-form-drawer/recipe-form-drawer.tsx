'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from 'ui/button'
import { Drawer, DrawerBody, DrawerClose, DrawerFooter, DrawerTitle } from 'ui/drawer'
import { Description, Field, Label, Message } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Form } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Textarea } from 'ui/textarea'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { LABELS, labelName } from '../../constants'
import type { Recipe, RecipeDraft, RecipeLabel } from '../../types'
import {
	emptyValues,
	type RecipeValues,
	recipeValidators,
	toFormValues,
	toRecipeDraft,
} from './recipe-form'

/** Props for {@link RecipeFormDrawer}. */
export type RecipeFormDrawerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * The recipe to edit, or `null` to add one. It seeds the fields and names the
	 * panel; nothing else changes, because an edit writes the record a create
	 * writes.
	 */
	recipe?: Recipe | null
	/** Writes the recipe. A rejection leaves the drawer open with the entry intact. */
	onSubmit: (draft: RecipeDraft) => Promise<unknown>
}

/**
 * The glass drawer that writes a recipe — a new one, or an edit of one on
 * record.
 *
 * One form for both, because a create and an edit produce the same record: only
 * what the fields start as and what the panel calls itself differ. A second form
 * for the edit would repeat the same ten fields and the same validators, and the
 * two would have to be kept in step by hand.
 *
 * The two lists are typed as text, one line each, and read by
 * `utilities/ingredient-line.ts`. A recipe is copied off a page one line at a
 * time, and a repeating row per ingredient makes the reader tab through a form
 * to type what they could type as a sentence.
 */
export function RecipeFormDrawer({
	open,
	onOpenChange,
	recipe = null,
	onSubmit,
}: RecipeFormDrawerProps) {
	// The recipe the panel last opened on. A close clears the caller's, and the
	// panel stays mounted while it slides out — reading the caller's directly, an
	// edit would empty its own fields halfway through its exit. Only an open
	// writes to it, so the next open still seeds from what it was handed.
	const [held, setHeld] = useState(recipe)

	useEffect(() => {
		if (open) setHeld(recipe)
	}, [open, recipe])

	const seed = open ? recipe : held

	const editing = seed !== null

	const title = editing ? 'Edit recipe' : 'Add recipe'

	return (
		<Drawer glass open={open} onOpenChange={onOpenChange} aria-label={title}>
			<Flex justify="between" align="center" className="px-6 pt-6">
				<DrawerTitle className="p-0">{title}</DrawerTitle>

				<DrawerClose>
					<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
				</DrawerClose>
			</Flex>

			<Form<RecipeValues>
				// The drawer unmounts its children while closed, so the form re-seeds
				// from `defaultValues` on each open and an abandoned entry never comes
				// back. Keyed on the open state as well, which covers the one case the
				// unmount misses: a reopen while the close is still animating out. The
				// edited recipe is in the key too, so opening a second one re-seeds
				// instead of keeping the first one's entry.
				key={`${String(open)}:${seed?.id ?? 'new'}`}
				defaultValues={seed === null ? emptyValues() : toFormValues(seed)}
				validate={recipeValidators}
				onSubmit={async (values) => {
					await onSubmit(toRecipeDraft(values))

					onOpenChange(false)
				}}
			>
				<DrawerBody>
					{/* Two columns from `sm`. The two lists lead across both, because they
					    are the fields with something to say and the ones the reader will
					    spend the most time in. */}
					<div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 pb-6 sm:grid-cols-2">
						<Field className="sm:col-span-2">
							<Label>Name</Label>

							<Input name="name" placeholder="What is it called?" />

							<Message name="name" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Description</Label>

							<Input name="description" placeholder="One line about it" />
						</Field>

						<Field>
							<Label>Servings</Label>

							<Input name="servings" inputMode="numeric" />

							<Message name="servings" />
						</Field>

						<Field>
							<Label>Labels</Label>

							<Listbox<RecipeLabel>
								multiple
								name="labels"
								placeholder="None"
								displayValue={labelName}
							>
								{LABELS.map((label) => (
									<ListboxOption key={label.value} value={label.value}>
										<ListboxLabel>{label.label}</ListboxLabel>
									</ListboxOption>
								))}
							</Listbox>
						</Field>

						<Field>
							<Label>Prep</Label>

							<Input name="prepMinutes" inputMode="numeric" placeholder="Minutes" />

							<Message name="prepMinutes" />
						</Field>

						<Field>
							<Label>Cook</Label>

							<Input name="cookMinutes" inputMode="numeric" placeholder="Minutes" />

							<Message name="cookMinutes" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Ingredients</Label>

							<Description>One per line — “2 kg potatoes”, “salt, to taste”.</Description>

							<Textarea
								name="ingredients"
								rows={6}
								placeholder={'1 kg potatoes\n2 cloves garlic\nsalt, to taste'}
							/>

							<Message name="ingredients" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Method</Label>

							<Description>One step per line.</Description>

							<Textarea name="steps" rows={6} placeholder={'Dice the potatoes.\nSimmer.'} />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Source</Label>

							<Input name="sourceUrl" type="url" placeholder="https://" />

							<Message name="sourceUrl" />
						</Field>

						<Field className="sm:col-span-2">
							<Label>Notes</Label>

							<Description>What you learned the last time.</Description>

							<Textarea name="notes" rows={3} placeholder="Less salt next time." />
						</Field>
					</div>
				</DrawerBody>

				<DrawerFooter>
					<Flex gap="sm" justify="end" full>
						<Button variant="plain" type="button" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>

						<Button type="submit" color={editing ? 'blue' : 'green'}>
							{editing ? 'Save changes' : 'Add recipe'}
						</Button>
					</Flex>
				</DrawerFooter>
			</Form>
		</Drawer>
	)
}
