import { uploadPhotos } from '../../api/places-api'
import type { PhotoValues } from './place-form'

/**
 * The object keys of the photos of a form, in their order: the stored photos
 * that it keeps, then the new files, which this uploads. A save calls it last,
 * once every other check has passed, so a refused save leaves no upload behind.
 */
export async function photoKeys({ photos, uploads }: PhotoValues): Promise<string[]> {
	return [...photos.map((photo) => photo.key), ...(await uploadPhotos(uploads))]
}
