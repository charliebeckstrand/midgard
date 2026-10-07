'use client'

import { Plus, Trash } from 'lucide-react'
import { useId } from 'react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { ListItem, ListSortable } from 'ui/list'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { isWebAddress } from '../../schemas/place'
import { MAX_PHOTOS, type PhotoRow, photoRow } from './place-form'

/**
 * The photos of a visit: one address per row, and a button that adds a row.
 *
 * The field always holds one row at least, so a visit with no photo shows one
 * empty row, as the single field did before. Each input has a clear button
 * while it holds an address. The clear button empties the row and keeps it.
 * With more than one row, each row also has a remove button and a drag handle. The list shows the handle only while
 * it holds more than one row, because one row has no order to change.
 *
 * The field is a `Field` with a `Label`, as the other fields of the form are, so
 * the label sits as close to its rows as a label sits to its input. The label
 * names the list, as the label of a Rating names its row of stars. Each input
 * has an id of its own, because the inputs of a field take the id of the field
 * by default.
 */
export function PlacePhotosField() {
	const { value: rows = [], setValue, invalid } = useFormValue<PhotoRow[]>('photos', {})

	const id = useId()

	const several = rows.length > 1

	const write = (key: string, url: string) =>
		setValue(rows.map((row) => (row.key === key ? { ...row, url } : row)))

	return (
		<Field htmlFor={`${id}list`}>
			<Label as="span" id={`${id}label`}>
				Photos
			</Label>

			<ListSortable
				id={`${id}list`}
				items={rows}
				getKey={(row) => row.key}
				onReorder={setValue}
				variant="bare"
				aria-labelledby={`${id}label`}
			>
				{(row) => (
					<ListItem
						suffix={
							several ? (
								<ToggleIconButton
									icon={<Icon icon={<Trash />} />}
									aria-label={`Remove photo ${rows.indexOf(row) + 1}`}
									onClick={() => setValue(rows.filter((held) => held.key !== row.key))}
								/>
							) : null
						}
					>
						<Input
							id={`${id}${row.key}`}
							type="url"
							clearable
							placeholder="https://"
							aria-label={`Photo ${rows.indexOf(row) + 1}`}
							value={row.url}
							// Only the row that is wrong, once the field has an error to show.
							invalid={invalid && row.url.trim() !== '' && !isWebAddress(row.url.trim())}
							onChange={(event) => write(row.key, event.target.value)}
						/>
					</ListItem>
				)}
			</ListSortable>

			<Button
				type="button"
				variant="plain"
				prefix={<Icon icon={<Plus />} />}
				disabled={rows.length >= MAX_PHOTOS}
				onClick={() => setValue([...rows, photoRow()])}
			>
				Add photo
			</Button>

			<Message name="photos" />
		</Field>
	)
}
