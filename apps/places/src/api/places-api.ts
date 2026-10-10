import { RequestError, unwrap } from 'shared/auth'
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

/** How many times an upload tries before it fails. */
const UPLOAD_ATTEMPTS = 3

/** The wait before each later try of an upload, in milliseconds. */
const RETRY_DELAYS_MS = [1000, 4000] as const

/**
 * How long a send may go with no progress before it stops and the upload tries
 * again, in milliseconds. A phone that changes networks can leave a request
 * open that never sends another byte.
 */
const STALL_MS = 30_000

/**
 * A photo that did not upload after every try: the photo store gave no answer,
 * or refused each address. A later save can try it again.
 */
export class PhotoUploadError extends Error {
	readonly file: File

	constructor(file: File) {
		super(`${file.name} did not upload. Check the connection and try again.`)

		this.name = 'PhotoUploadError'

		this.file = file
	}
}

/**
 * Puts a file at an address that Mimir signs, and reports the share of it that
 * has gone, from 0 to 1. It gives whether the store took the file. The request
 * is an `XMLHttpRequest`, because `fetch` does not report the progress of a
 * body that it sends. A request that gets no answer, or that sends nothing for
 * {@link STALL_MS}, gives `false`.
 */
function putFile(url: string, file: File, onProgress: (share: number) => void): Promise<boolean> {
	return new Promise((resolve) => {
		const request = new XMLHttpRequest()

		let stall: ReturnType<typeof setTimeout> | undefined

		const watch = () => {
			clearTimeout(stall)

			stall = setTimeout(() => request.abort(), STALL_MS)
		}

		const settle = (took: boolean) => {
			clearTimeout(stall)

			resolve(took)
		}

		request.open('PUT', url)

		request.setRequestHeader('Content-Type', file.type)

		request.upload.addEventListener('progress', (event) => {
			watch()

			if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total)
		})

		request.addEventListener('load', () => settle(request.status >= 200 && request.status < 300))

		// No readable answer: the connection dropped, the CORS rule of the store
		// refused the origin, or the send stalled.
		request.addEventListener('error', () => settle(false))

		request.addEventListener('abort', () => settle(false))

		watch()

		request.send(file)
	})
}

/**
 * Whether a failed request for an upload address can pass on a later try: the
 * request got no answer, or the gateway or Mimir was down or busy. Mimir's
 * refusal of the file or of the session stays the same on each try.
 */
function canRetrySign(error: unknown): boolean {
	if (!(error instanceof RequestError)) return error instanceof TypeError

	return error.status >= 500 || error.status === 408 || error.status === 429
}

/**
 * Uploads one photo and gives its object key. Mimir signs an address for the
 * file, and the file goes to that address in the photo store, not through the
 * gateway: a photo can be large, and the gateway has no part in what it holds.
 * `onProgress` gets the share of the file that has gone, from 0 to 1.
 *
 * An upload tries {@link UPLOAD_ATTEMPTS} times, with a wait before each later
 * try. Each try gets a new address and a new key, so an address that expired
 * does not fail the next try. The keys of the failed tries hold nothing that a
 * save keeps, and the daily sweep of Mimir deletes what they hold. After the
 * last try, the upload fails with a {@link PhotoUploadError}. Mimir's refusal
 * of the file or of the session fails it at once, with Mimir's words.
 */
export async function uploadPhoto(
	file: File,
	onProgress: (share: number) => void,
): Promise<string> {
	if (!isPhotoType(file.type)) throw new Error(`${file.name} is not a ${PHOTO_TYPE_NAMES}.`)

	for (let attempt = 0; attempt < UPLOAD_ATTEMPTS; attempt++) {
		const delay = RETRY_DELAYS_MS[attempt - 1]

		if (delay !== undefined) await new Promise((wake) => setTimeout(wake, delay))

		onProgress(0)

		let signed: { key: string; uploadUrl: string }

		try {
			signed = await unwrap(
				mimir.POST('/api/photos/uploads', { body: { contentType: file.type, size: file.size } }),
			)
		} catch (error) {
			if (canRetrySign(error)) continue

			throw error
		}

		if (await putFile(signed.uploadUrl, file, onProgress)) return signed.key
	}

	throw new PhotoUploadError(file)
}
