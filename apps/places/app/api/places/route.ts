import { addPlace, listPlaces, MAX_PLACES } from '@/server/places-store'
import { readDraft } from '@/server/read-draft'
import { authorize, userOnly } from '@/server/session-user'

/** The store reads the database, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every place of the user, newest visit first. */
export async function GET() {
	const userId = await authorize()

	if (userId instanceof Response) return userId

	return Response.json(await listPlaces(userId), { headers: userOnly })
}

/** Adds one place, after reading the body as a draft. */
export async function POST(request: Request) {
	const userId = await authorize('user')

	if (userId instanceof Response) return userId

	const draft = await readDraft(request)

	if (!draft.ok) return Response.json({ issues: draft.issues }, { status: 400 })

	const place = await addPlace(userId, draft.value)

	if (place === null) {
		return Response.json(
			{ issues: [`You can keep up to ${MAX_PLACES.toLocaleString('en-US')} places.`] },
			{ status: 409 },
		)
	}

	return Response.json(place, { status: 201, headers: userOnly })
}
