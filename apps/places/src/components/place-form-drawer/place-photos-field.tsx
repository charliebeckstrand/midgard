'use client'

import { Plus, X } from 'lucide-react'
import { Button } from 'ui/button'
import { Fieldset, Legend, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { List, ListItem } from 'ui/list'
import { Stack } from 'ui/structure/stack'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { isWebAddress } from '../../schemas/place'
import { MAX_PHOTOS, type PhotoRow, photoRow } from './place-form'

/**
 * The photos of a visit: one address per row, and a button that adds a row.
 *
 * The field always holds one row at least, so a visit with no photo shows one
 * empty row, as the single field did before. With more than one row, each row
 * has a remove button and a drag handle. The list shows the handle only while
 * it holds more than one row, because one row has no order to change.
 */
export function PlacePhotosField() {
	const { value: rows = [], setValue, invalid } = useFormValue<PhotoRow[]>('photos', {})

	const several = rows.length > 1

	const write = (key: string, url: string) =>
		setValue(rows.map((row) => (row.key === key ? { ...row, url } : row)))

	return (
		<Fieldset>
			<Legend>Photos</Legend>

			<Stack gap="sm" className="mt-2">
				<List
					items={rows}
					getKey={(row) => row.key}
					onReorder={setValue}
					variant="plain"
					aria-label="Photos"
				>
					{(row) => (
						<ListItem
							suffix={
								several ? (
									<ToggleIconButton
										icon={<Icon icon={<X />} />}
										aria-label={`Remove photo ${rows.indexOf(row) + 1}`}
										onClick={() => setValue(rows.filter((held) => held.key !== row.key))}
									/>
								) : null
							}
						>
							<Input
								type="url"
								placeholder="https://"
								aria-label={`Photo ${rows.indexOf(row) + 1}`}
								value={row.url}
								// Only the row that is wrong, once the field has an error to show.
								invalid={invalid && row.url.trim() !== '' && !isWebAddress(row.url.trim())}
								onChange={(event) => write(row.key, event.target.value)}
							/>
						</ListItem>
					)}
				</List>

				<div>
					<Button
						type="button"
						variant="plain"
						prefix={<Icon icon={<Plus />} />}
						disabled={rows.length >= MAX_PHOTOS}
						onClick={() => setValue([...rows, photoRow()])}
					>
						Add photo
					</Button>
				</div>
			</Stack>

			<Message name="photos" />
		</Fieldset>
	)
}
