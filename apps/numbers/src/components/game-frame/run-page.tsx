import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
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
 * The page of the run of the seed of the address, with the settings of the
 * cookies of the request, so the first paint has the run in its final layout.
 * An address that is not a seed has no page.
 */
export async function RunPage({ params, vsCpu }: RunPageProps) {
	const { seed } = await params

	if (!isSeed(seed)) notFound()

	const store = await cookies()

	return (
		<GameFrame
			seed={seed}
			settings={readSettings((name) => store.get(name)?.value)}
			vsCpu={vsCpu}
		/>
	)
}
