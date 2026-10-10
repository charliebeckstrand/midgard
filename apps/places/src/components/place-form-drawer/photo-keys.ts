import { useCallback, useState } from 'react'
import { uploadPhoto } from '../../api/places-api'
import { isNewPhoto, type PhotoEntry } from './place-form'

/**
 * The object keys of the photos of a form, in their order. It uploads each new
 * file, all at once, and keeps the key of each stored photo. A save calls it
 * last, once every other check has passed, so a refused save leaves no upload
 * behind. `onProgress` gets the form key of a new file and the share of it that
 * has gone, from 0 to 1.
 */
export function photoKeys(
	photos: readonly PhotoEntry[],
	onProgress: (key: string, share: number) => void,
): Promise<string[]> {
	return Promise.all(
		photos.map((entry) =>
			isNewPhoto(entry)
				? uploadPhoto(entry.file, (share) => onProgress(entry.key, share))
				: entry.key,
		),
	)
}

/** What {@link usePhotoUploads} gives. */
export type PhotoUploads = {
	/**
	 * The share of each new file that has gone, from 0 to 1, by its form key,
	 * while the upload runs. A file that is not uploading has no entry.
	 */
	progress: ReadonlyMap<string, number>
	/** {@link photoKeys}, which writes `progress` while it runs. */
	upload: (photos: readonly PhotoEntry[]) => Promise<string[]>
}

/**
 * The uploads of a form drawer, and how far each one has gone. Each new file
 * has an entry at 0 when the upload starts, and the entries go when the upload
 * ends, whether it succeeds or fails.
 */
export function usePhotoUploads(): PhotoUploads {
	const [progress, setProgress] = useState<ReadonlyMap<string, number>>(() => new Map())

	const upload = useCallback((photos: readonly PhotoEntry[]) => {
		setProgress(new Map(photos.filter(isNewPhoto).map((entry) => [entry.key, 0])))

		return photoKeys(photos, (key, share) =>
			setProgress((held) => (held.has(key) ? new Map(held).set(key, share) : held)),
		).finally(() => setProgress(new Map()))
	}, [])

	return { progress, upload }
}
