'use client'

import { Trash } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Description, Field, Label } from 'ui/fieldset'
import {
	type FileRejection,
	FileUploadButton,
	FileUploadInput,
	formatFileNames,
} from 'ui/file-upload'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { Lightbox, LightboxTrigger } from 'ui/lightbox'
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

/**
 * The address of each photo of the list, by its key: the URL of a stored photo,
 * or an object URL for a new file. The hook makes the object URL of a file once,
 * when the file joins the list, so a reorder does not load the image again. It
 * lets go of the URL when the file leaves the list, and of each URL when the
 * field unmounts. A new file has no address for the one commit before the
 * effect makes it.
 */
function usePhotoSources(photos: readonly PhotoEntry[]): ReadonlyMap<string, string> {
	// The object URLs that the field holds, by file. Only the effects change it.
	const held = useRef(new Map<File, string>())

	const [fileUrls, setFileUrls] = useState<ReadonlyMap<File, string>>(() => new Map())

	useEffect(() => {
		const owned = held.current

		const files = new Set(photos.filter(isNewPhoto).map((entry) => entry.file))

		let changed = false

		for (const [file, url] of owned) {
			if (files.has(file)) continue

			URL.revokeObjectURL(url)

			owned.delete(file)

			changed = true
		}

		for (const file of files) {
			if (owned.has(file)) continue

			owned.set(file, URL.createObjectURL(file))

			changed = true
		}

		if (changed) setFileUrls(new Map(owned))
	}, [photos])

	useEffect(() => {
		const owned = held.current

		return () => {
			for (const url of owned.values()) URL.revokeObjectURL(url)

			owned.clear()
		}
	}, [])

	return useMemo(
		() =>
			new Map(
				photos.flatMap((entry) => {
					const src = isNewPhoto(entry) ? fileUrls.get(entry.file) : entry.url

					return src === undefined ? [] : [[entry.key, src] as const]
				}),
			),
		[photos, fileUrls],
	)
}

/**
 * The photos of a visit or of a trip, as one list in their order: the stored
 * photos and the new files, each with a remove button and a drag handle while
 * there is more than one. A save uploads the new files.
 *
 * All the photos of the list are one `Lightbox`. A press on a thumbnail shows
 * that photo larger, and the viewer steps through the photos in the order of
 * the list. Only the handle drags a row, so a press on a thumbnail does not
 * start a reorder.
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

	const sources = usePhotoSources(photos)

	// The photos that the viewer steps through, and the place of each in it. A new
	// file joins when its address is made.
	const viewer = photos.flatMap((photo) => {
		const src = sources.get(photo.key)

		return src === undefined ? [] : [{ key: photo.key, src }]
	})

	const viewerIndex = new Map(viewer.map((photo, at) => [photo.key, at]))

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
					<Lightbox
						photos={viewer.map(({ src }, at) => ({
							src,
							alt: `Photo ${at + 1} of ${viewer.length}`,
						}))}
						aria-label="Photos"
					>
						<List
							items={photos}
							getKey={(photo) => photo.key}
							onReorder={setValue}
							variant="bare"
							aria-label="Photos"
						>
							{(photo) => {
								const n = photos.indexOf(photo) + 1

								const at = viewerIndex.get(photo.key)

								// A new file holds its box while its address is made, so the row
								// does not move when it shows.
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
										{at === undefined ? (
											<span className="size-12" />
										) : (
											<LightboxTrigger index={at} className="size-12 rounded-md" />
										)}
									</ListItem>
								)
							}}
						</List>
					</Lightbox>

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
