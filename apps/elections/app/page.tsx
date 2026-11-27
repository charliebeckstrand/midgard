import { LevelPage } from '@/components/level-page'
import { ELECTIONS } from '@/elections/registry'
import { homeCrumbs } from '@/utilities/trail'

/** The search of the header reads the results before the page renders, so the first frame has them. */
export const instant = false

/** Every election of the registry. */
export default function Page() {
	return <LevelPage crumbs={homeCrumbs()} heading="Elections" elections={ELECTIONS} />
}
