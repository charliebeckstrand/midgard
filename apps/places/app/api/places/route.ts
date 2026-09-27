import { addPlace, listPlaces, MAX_PLACES } from '@/server/places-store'
import { readDraft } from '@/server/read-draft'
import { issue, userOnly, withUser } from '@/server/session-user'

/** The store reads the database, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every place of the user, newest visit first. */
export const GET = withUser(undefined, async (userId) =>
	Response.json(await listPlaces(userId), { headers: userOnly }),
)

/** Adds one place, after reading the body as a draft. */
export const POST = withUser('user', async (userId, request: Request) => {
	const draft = await readDraft(request)

	if (!draft.ok) return issue(400, ...draft.issues)

	const place = await addPlace(userId, draft.value)

	if (place === null) {
		return issue(409, `You can keep up to ${MAX_PLACES.toLocaleString('en-US')} places.`)
	}

	return Response.json(place, { status: 201, headers: userOnly })
})
