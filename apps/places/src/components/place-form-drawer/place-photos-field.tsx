'use client'

import { Trash } from 'lucide-react'
import { useState } from 'react'
import { Description, Field, Label, Message } from 'ui/fieldset'
import { type FileRejection, FileUploadInput, formatFileNames } from 'ui/file-upload'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { List, ListItem } from 'ui/list'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from '../../api/places-api'
import type { Photo } from '../../types'
import { MAX_PHOTOS } from './place-form'

/** What each reason of a refused file says. */
const REJECTION: Readonly<Record<FileRejection['reason'], string>> = {
	type: 'is not a JPEG, PNG, or WebP image',
	size: 'is larger than 15 MB',
	count: `goes past ${MAX_PHOTOS} photos`,
}

/** The message for the files that a pick refused: one sentence per reason. */
function rejectionMessage(rejected: readonly FileRejection[]): string {
	return (Object.keys(REJECTION) as FileRejection['reason'][])
		.flatMap((reason) => {
			const files = rejected.filter((held) => held.reason === reason).map((held) => held.file)

			return files.length === 0 ? [] : [`${formatFileNames(files)} ${REJECTION[reason]}.`]
		})
		.join(' ')
}

/**
 * The photos of a visit or of a trip: the stored photos, each with a remove
 * button and a drag handle while there is more than one, and a file field for
 * new ones. A save uploads the new files after the stored photos, in the order
 * picked.
 *
 * The stored photos are the `photos` value of the form and the new files are
 * its `uploads` value, because a stored photo is a key that the store holds,
 * and a new file is not anywhere yet. The file field takes as many files as the
 * stored photos leave room for. It names each file that a pick refuses and
 * why, until a later refusal replaces the message or a reset of the file field
 * clears it.
 */
export function PlacePhotosField() {
	const { value: photos = [], setValue } = useFormValue<Photo[]>('photos', {})

	const [rejected, setRejected] = useState<FileRejection[]>([])

	const room = MAX_PHOTOS - photos.length

	return (
		<Field>
			<Label>Photos</Label>

			{photos.length === 0 ? null : (
				<List
					items={photos}
					getKey={(photo) => photo.key}
					onReorder={setValue}
					variant="bare"
					aria-label="Saved photos"
				>
					{(photo) => {
						const n = photos.indexOf(photo) + 1

						return (
							<ListItem
								suffix={
									<ToggleIconButton
										icon={<Icon icon={<Trash />} />}
										aria-label={`Remove photo ${n}`}
										onClick={() => setValue(photos.filter((held) => held.key !== photo.key))}
									/>
								}
							>
								<img
									src={photo.url}
									alt={`${n} of ${photos.length}`}
									className="size-12 rounded-md object-cover"
								/>
							</ListItem>
						)
					}}
				</List>
			)}

			<FileUploadInput
				name="uploads"
				multiple
				placeholder="Add photos"
				accept={PHOTO_TYPES.join(',')}
				maxSize={MAX_PHOTO_BYTES}
				maxCount={room}
				disabled={room <= 0}
				onReject={setRejected}
				onAccept={(files) => {
					if (files.length === 0) setRejected([])
				}}
			/>

			{room > 0 ? null : (
				<Description>{MAX_PHOTOS} photos is the most. Remove one to add another.</Description>
			)}

			{rejected.length === 0 ? null : <Text tone="warning">{rejectionMessage(rejected)}</Text>}

			<Message name="uploads" />
		</Field>
	)
}
