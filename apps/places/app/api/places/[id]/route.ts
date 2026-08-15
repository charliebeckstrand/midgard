import { removePlace, updatePlace } from '@/server/places-store'
import { readDraft } from '@/server/read-draft'

/** The store reads the filesystem, so this route is never prerendered. */
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
export async function PUT(request: Request, { params }: Context) {
	const draft = await readDraft(request)

	if (!draft.ok) return Response.json({ issues: draft.issues }, { status: 400 })

	const { id } = await params

	const updated = await updatePlace(id, draft.value)

	if (updated === null)
		return Response.json({ issues: ['No place with that id.'] }, { status: 404 })

	return Response.json(updated)
}

/** Removes one place. */
export async function DELETE(_request: Request, { params }: Context) {
	const { id } = await params

	const removed = await removePlace(id)

	if (!removed) return Response.json({ issues: ['No place with that id.'] }, { status: 404 })

	return new Response(null, { status: 204 })
}
