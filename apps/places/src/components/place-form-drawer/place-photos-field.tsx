'use client'

import { Trash } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Description, Field, Label } from 'ui/fieldset'
import {
	type FileRejection,
	FileUploadButton,
	FileUploadInput,
	formatFileNames,
} from 'ui/file-upload'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { List, ListItem } from 'ui/list'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB, PHOTO_TYPE_NAMES, PHOTO_TYPES } from '../../api/places-api'
import { isNewPhoto, MAX_PHOTOS, newPhoto, type PhotoEntry } from './place-form'

/** What each reason of a refused file says. */
const REJECTION: Readonly<Record<FileRejection['reason'], string>> = {
	type: `is not a ${PHOTO_TYPE_NAMES}`,
	size: `is larger than ${MAX_PHOTO_MB} MB`,
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

/** The thumbnail of a photo in the list: a stored photo, or a new file. */
function PhotoThumbnail({ entry, alt }: { entry: PhotoEntry; alt: string }) {
	// The address of a new file, which the page holds for as long as the
	// thumbnail shows it, and lets go of after.
	const [fileUrl, setFileUrl] = useState<string | null>(null)

	const file = isNewPhoto(entry) ? entry.file : null

	useEffect(() => {
		if (file === null) return

		const url = URL.createObjectURL(file)

		setFileUrl(url)

		return () => URL.revokeObjectURL(url)
	}, [file])

	const src = isNewPhoto(entry) ? fileUrl : entry.url

	// Held at its size while the address of a new file is made, so the row does
	// not move when it shows.
	return src === null ? (
		<span className="size-12" />
	) : (
		<img src={src} alt={alt} className="size-12 rounded-md object-cover" />
	)
}

/**
 * The photos of a visit or of a trip, as one list in their order: the stored
 * photos and the new files, each with a remove button and a drag handle while
 * there is more than one. A save uploads the new files.
 *
 * With no photo, the field is a file field. With photos, it is a plain Add
 * photos button under the list, as the other add buttons of the forms are. A
 * pick adds its files to the end of the list, and takes as many as the list has
 * room for. The field names each file that a pick refuses and why, until a
 * later pick refuses none.
 */
export function PlacePhotosField() {
	const { value: photos = [], setValue } = useFormValue<PhotoEntry[]>('photos', {})

	const [rejected, setRejected] = useState<FileRejection[]>([])

	// Whether the pick that is running refused a file. A pick reports its
	// refusals before its files, in one event, so its files clear the message
	// only where it refused none. The flag ends with the render that the pick
	// causes.
	const refusing = useRef(false)

	useEffect(() => {
		refusing.current = false
	})

	const room = MAX_PHOTOS - photos.length

	// The photo field takes no selection of its own: a pick goes into the list.
	const picker = {
		value: null,
		multiple: true,
		accept: PHOTO_TYPES.join(','),
		maxSize: MAX_PHOTO_BYTES,
		maxCount: room,
		disabled: room <= 0,
		onReject: (refused: FileRejection[]) => {
			refusing.current = true

			setRejected(refused)
		},
		onAccept: (files: File[]) => {
			if (!refusing.current) setRejected([])

			setValue([...photos, ...files.map(newPhoto)])
		},
	}

	return (
		<Field>
			<Label>Photos</Label>

			{photos.length === 0 ? (
				<FileUploadInput {...picker} placeholder="Add photos" />
			) : (
				<>
					<List
						items={photos}
						getKey={(photo) => photo.key}
						onReorder={setValue}
						variant="bare"
						aria-label="Photos"
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
									<PhotoThumbnail entry={photo} alt={`${n} of ${photos.length}`} />
								</ListItem>
							)
						}}
					</List>

					<FileUploadButton {...picker} variant="plain" className="w-fit max-w-full">
						Add photos
					</FileUploadButton>
				</>
			)}

			{room > 0 ? null : (
				<Description>{MAX_PHOTOS} photos is the most. Remove one to add another.</Description>
			)}

			{rejected.length === 0 ? null : <Text tone="warning">{rejectionMessage(rejected)}</Text>}
		</Field>
	)
}
