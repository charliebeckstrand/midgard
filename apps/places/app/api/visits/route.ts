import { sessionUserId, unauthorized } from '@/server/session-user'
import { visitedSeed } from '@/server/visited-seed'
import { listVisits } from '@/server/visits-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every visited region of the user, each scope alphabetical. */
export async function GET() {
	const userId = await sessionUserId()

	if (userId === null) return unauthorized()

	return Response.json(await listVisits(userId, () => visitedSeed(userId)))
}
