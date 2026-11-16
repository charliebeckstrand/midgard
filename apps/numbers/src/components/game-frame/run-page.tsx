import { getSession } from 'auth'
import { cookies } from 'next/headers'
import { notFound, unstable_rethrow } from 'next/navigation'
import { readDailyStats } from '../../server/stats'
import { OFFSET_COOKIE } from '../../utilities/reader-offset'
import { isSeed } from '../../utilities/seed'
import { readSettings } from '../../utilities/settings'
import { GameFrame } from './game-frame'

/** Props for {@link RunPage}. */
export type RunPageProps = {
	/** The params of the route, with the seed of the address. */
	params: Promise<{ seed: string }>
	/** Plays against the CPU: the page of a `/vs` address. */
	vsCpu?: boolean
}

/**
 * The session of the reader, or none. Sign-in is optional and the game needs no
 * session, so a failure of the gateway shows the reader as signed out, and the
 * run still plays. The control-flow errors of Next propagate.
 */
function readSession() {
	return getSession().catch((error: unknown) => {
		unstable_rethrow(error)

		console.error('numbers: the session could not be read', error)

		return undefined
	})
}

/**
 * The page of the run of the seed of the address, with the settings of the
 * cookies and the session of the request, so the first paint has the run and
 * the menu in their final layout. On the daily puzzle of today, the page also
 * reads the stats of the reader, so the first paint has the notice of a replay
 * (`readDailyStats`). An address that is not a seed has no page.
 */
export async function RunPage({ params, vsCpu }: RunPageProps) {
	const { seed } = await params

	if (!isSeed(seed)) notFound()

	const [store, session] = await Promise.all([cookies(), readSession()])

	const stats = await readDailyStats(seed, store.get(OFFSET_COOKIE)?.value, session?.user)

	return (
		<GameFrame
			seed={seed}
			settings={readSettings((name) => store.get(name)?.value)}
			vsCpu={vsCpu}
			user={session?.user}
			stats={stats}
		/>
	)
}
