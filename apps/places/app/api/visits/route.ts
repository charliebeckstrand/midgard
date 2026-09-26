import { authorize } from '@/server/session-user'
import { visitedSeed } from '@/server/visited-seed'
import { listVisits } from '@/server/visits-store'

/** The store reads the filesystem, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every visited region of the user, each scope alphabetical. */
export async function GET() {
	const userId = await authorize()

	if (userId instanceof Response) return userId

	return Response.json(await listVisits(userId, () => visitedSeed(userId)))
}
