import { useCallback, useRef, useState } from 'react'
import { photoKeys } from './photo-keys'
import { isNewPhoto, type PhotoEntry } from './place-form'

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
