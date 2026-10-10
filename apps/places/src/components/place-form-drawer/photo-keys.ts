import { uploadPhoto } from '../../api/places-api'
import { isNewPhoto, type PhotoEntry } from './place-form'

/**
 * The object keys of the photos of a form, in their order. It uploads each new
 * file, all at once, and keeps the key of each stored photo. A save calls it
 * last, once every other check has passed, so a refused save leaves no upload
 * behind.
 */
export function photoKeys(photos: readonly PhotoEntry[]): Promise<string[]> {
	return Promise.all(
		photos.map((entry) => (isNewPhoto(entry) ? uploadPhoto(entry.file) : entry.key)),
	)
}
