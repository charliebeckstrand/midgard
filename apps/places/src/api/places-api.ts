import { unwrap } from 'shared/auth'
import { createMimirClient } from 'shared/mimir'
import type {
	PhotoType,
	Place,
	PlaceDraft,
	Trip,
	TripDraft,
	TripStop,
	VisitScope,
	Visits,
} from '../types'

/**
 * The client's whole reach: same-origin `/api/*` paths, per CONVENTIONS §6.3,
 * and the upload addresses that Mimir signs. Nothing else in the app fetches.
 * The places and the visits go through the gateway to Mimir, in asgard, whose
 * spec types {@link mimir}.
 */

const mimir = createMimirClient()

/** Every stored place, newest visit first. */
export function fetchPlaces(signal?: AbortSignal): Promise<Place[]> {
	return unwrap(mimir.GET('/api/places', { signal }))
}

/** Adds one place and hands back the stored record, identity and all. */
export function createPlace(draft: PlaceDraft): Promise<Place> {
	return unwrap(mimir.POST('/api/places', { body: draft }))
}

/** Replaces one place and hands back the stored record. */
export function savePlace(id: string, draft: PlaceDraft): Promise<Place> {
	return unwrap(mimir.PUT('/api/places/{id}', { params: { path: { id } }, body: draft }))
}

/** Removes one place. */
export async function deletePlace(id: string): Promise<void> {
	await unwrap(mimir.DELETE('/api/places/{id}', { params: { path: { id } } }))
}

/** Every stored trip, newest first. */
export function fetchTrips(signal?: AbortSignal): Promise<Trip[]> {
	return unwrap(mimir.GET('/api/trips', { signal }))
}

/**
 * Adds one trip with its places, in one write, and hands back the stored trip
 * and the places that its stops added or changed.
 */
export function createTrip(
	draft: TripDraft,
	stops: TripStop[],
): Promise<{ trip: Trip; places: Place[] }> {
	return unwrap(mimir.POST('/api/trips', { body: { ...draft, stops } }))
}

/** Replaces the fields of one trip and hands back the stored record. */
export function saveTrip(id: string, draft: TripDraft): Promise<Trip> {
	return unwrap(mimir.PUT('/api/trips/{id}', { params: { path: { id } }, body: draft }))
}

/** Removes one trip. Its places and their visits stay. */
export async function deleteTrip(id: string): Promise<void> {
	await unwrap(mimir.DELETE('/api/trips/{id}', { params: { path: { id } } }))
}

/** Every visited region, by the name its own atlas gives it. */
export function fetchVisits(signal?: AbortSignal): Promise<Visits> {
	return unwrap(mimir.GET('/api/visits', { signal }))
}

/** Marks one region visited or not, and hands back both scopes. */
export function setVisit(scope: VisitScope, region: string, visited: boolean): Promise<Visits> {
	return unwrap(
		mimir.PUT('/api/visits/{scope}/{region}', {
			params: { path: { scope, region } },
			body: { visited },
		}),
	)
}

/** The file types that a photo upload takes, as an `accept` list. */
export const PHOTO_TYPES: readonly PhotoType[] = ['image/jpeg', 'image/png', 'image/webp']

/** The file types that a photo upload takes, in words. */
export const PHOTO_TYPE_NAMES = 'JPEG, PNG, or WebP image'

/** The largest photo that an upload takes, in megabytes: the limit that Mimir sets. */
export const MAX_PHOTO_MB = 15

/** The largest photo that an upload takes, in bytes. */
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024

/** Whether a file is of a type that a photo upload takes. */
function isPhotoType(type: string): type is PhotoType {
	return (PHOTO_TYPES as readonly string[]).includes(type)
}

/**
 * Puts a file at an address that Mimir signs, and reports the share of it that
 * has gone, from 0 to 1. The request is an `XMLHttpRequest`, because `fetch`
 * does not report the progress of a body that it sends.
 */
function putFile(url: string, file: File, onProgress: (share: number) => void): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest()

		request.open('PUT', url)

		request.setRequestHeader('Content-Type', file.type)

		request.upload.addEventListener('progress', (event) => {
			if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total)
		})

		request.addEventListener('load', () => resolve(request.status >= 200 && request.status < 300))

		// The request got no readable response: the connection dropped, or the CORS
		// rule of the store refused the origin.
		request.addEventListener('error', () =>
			reject(new Error(`${file.name} did not reach the photo store. Try again.`)),
		)

		request.send(file)
	})
}

/**
 * Uploads one photo and gives its object key. Mimir signs an address for the
 * file, and the file goes to that address in the photo store, not through the
 * gateway: a photo can be large, and the gateway has no part in what it holds.
 * `onProgress` gets the share of the file that has gone, from 0 to 1.
 */
export async function uploadPhoto(
	file: File,
	onProgress: (share: number) => void,
): Promise<string> {
	if (!isPhotoType(file.type)) throw new Error(`${file.name} is not a ${PHOTO_TYPE_NAMES}.`)

	const { key, uploadUrl } = await unwrap(
		mimir.POST('/api/photos/uploads', { body: { contentType: file.type, size: file.size } }),
	)

	if (!(await putFile(uploadUrl, file, onProgress))) {
		throw new Error(`${file.name} did not upload. Try again.`)
	}

	return key
}
