import { useCallback, useRef, useState } from 'react'
import { formatFileNames } from 'ui/file-upload'
import { PhotoUploadError, uploadPhoto } from '../../api/places-api'
import { isNewPhoto, type PhotoEntry } from './place-form'

/**
 * How many photos upload at the same time. More at once on a phone split the
 * connection into slower sends, and each one is more likely to stall.
 */
const PARALLEL_UPLOADS = 3

/**
 * The error of a save whose uploads failed. Mimir's refusal of a file or of the
 * session comes first, in Mimir's words, because a new try does not change it.
 * Otherwise the error names each photo that did not upload.
 */
function uploadFailure(failures: readonly unknown[]): Error {
	const refused = failures.find((failure) => !(failure instanceof PhotoUploadError))

	if (refused !== undefined) return refused instanceof Error ? refused : new Error(String(refused))

	const files = failures.flatMap((failure) =>
		failure instanceof PhotoUploadError ? [failure.file] : [],
	)

	return new Error(`${formatFileNames(files)} did not upload. Check the connection and try again.`)
}

/**
 * The object keys of the photos of a form, in their order. It keeps the key of
 * each stored photo, and uploads each new file that `uploaded` does not hold,
 * {@link PARALLEL_UPLOADS} at a time. A save calls it last, once every other
 * check has passed, so a refused save leaves no upload behind.
 *
 * Each file that uploads goes into `uploaded`, by file, even when another file
 * fails. A later save with the same files thus uploads only the files that
 * failed. The call fails once every upload has ended, with one error for all of
 * the files that failed.
 *
 * `onProgress` gets the form key of a new file and the share of it that has
 * gone, from 0 to 1.
 */
export async function photoKeys(
	photos: readonly PhotoEntry[],
	onProgress: (key: string, share: number) => void,
	uploaded: WeakMap<File, string>,
): Promise<string[]> {
	const keys = photos.map((entry) => (isNewPhoto(entry) ? uploaded.get(entry.file) : entry.key))

	const queue = photos.flatMap((entry, at) =>
		isNewPhoto(entry) && keys[at] === undefined ? [{ entry, at }] : [],
	)

	// The error of each file that failed, by its place in the list, so that the
	// message names the files in the order of the list.
	const failures: unknown[] = []

	const work = async () => {
		for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
			const { entry, at } = next

			try {
				const key = await uploadPhoto(entry.file, (share) => onProgress(entry.key, share))

				uploaded.set(entry.file, key)

				keys[at] = key
			} catch (error) {
				failures[at] = error
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, queue.length) }, work))

	if (failures.length > 0) throw uploadFailure(failures.filter((failure) => failure !== undefined))

	// Each key is set now: a stored photo had one, and each new file uploaded.
	return keys.filter((key) => key !== undefined)
}

/** What {@link usePhotoUploads} gives. */
export type PhotoUploads = {
	/**
	 * The share of each new file that has gone, from 0 to 1, by its form key,
	 * while the uploads run. A file that is not uploading has no entry.
	 */
	progress: ReadonlyMap<string, number>
	/** {@link photoKeys}, which writes `progress` while it runs. */
	upload: (photos: readonly PhotoEntry[]) => Promise<string[]>
}

/**
 * The uploads of a form drawer, and how far each one has gone. When the
 * uploads start, each new file has an entry: 1 for a file that an earlier save
 * uploaded, and 0 for the others. The entries go when the uploads end, whether
 * they succeed or fail.
 *
 * The drawer holds the key of each file that uploaded, so a save that fails
 * does not send those files again on the next save.
 */
export function usePhotoUploads(): PhotoUploads {
	const [progress, setProgress] = useState<ReadonlyMap<string, number>>(() => new Map())

	const uploaded = useRef(new WeakMap<File, string>())

	const upload = useCallback((photos: readonly PhotoEntry[]) => {
		const held = uploaded.current

		setProgress(
			new Map(photos.filter(isNewPhoto).map((entry) => [entry.key, held.has(entry.file) ? 1 : 0])),
		)

		return photoKeys(
			photos,
			(key, share) =>
				setProgress((shares) => (shares.has(key) ? new Map(shares).set(key, share) : shares)),
			held,
		).finally(() => setProgress(new Map()))
	}, [])

	return { progress, upload }
}
