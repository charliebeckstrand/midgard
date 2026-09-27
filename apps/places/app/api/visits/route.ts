import { userOnly, withUser } from '@/server/session-user'
import { visitedSeed } from '@/server/visited-seed'
import { listVisits } from '@/server/visits-store'

/** The store reads the database, so this route is never prerendered. */
export const dynamic = 'force-dynamic'

/** Every visited region of the user, each scope alphabetical. */
export const GET = withUser(undefined, async (userId) =>
	Response.json(await listVisits(userId, () => visitedSeed(userId)), { headers: userOnly }),
)
