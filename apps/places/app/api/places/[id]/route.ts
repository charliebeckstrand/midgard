import { removePlace, updatePlace } from '@/server/places-store'
import { readDraft } from '@/server/read-draft'
import { issue, userOnly, withUser } from '@/server/session-user'

/** The store reads the database, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** The route's own parameters, which Next hands over as a promise. */
type Context = { params: Promise<{ id: string }> }

/**
 * Replaces one place.
 *
 * `PUT` rather than `PATCH` because the form submits every field it owns, so a
 * save is a whole record and never a subset — and the body is read by the same
 * validator a create uses, so an edit cannot write a shape a create would have
 * refused.
 */
export const PUT = withUser('user', async (userId, request: Request, { params }: Context) => {
	const draft = await readDraft(request)

	if (!draft.ok) return issue(400, ...draft.issues)

	const { id } = await params

	const updated = await updatePlace(userId, id, draft.value)

	if (updated === null) return issue(404, 'No place with that id.')

	return Response.json(updated, { headers: userOnly })
})

/** Removes one place. */
export const DELETE = withUser('user', async (userId, _request: Request, { params }: Context) => {
	const { id } = await params

	const removed = await removePlace(userId, id)

	if (!removed) return issue(404, 'No place with that id.')

	return new Response(null, { status: 204 })
})
