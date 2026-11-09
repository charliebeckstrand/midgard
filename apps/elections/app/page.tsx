import { LevelPage } from '@/components/level-page'
import { ELECTIONS } from '@/elections/registry'
import { homeCrumbs } from '@/utilities/trail'

/** Every election of the registry. */
export default function Page() {
	return <LevelPage crumbs={homeCrumbs()} heading="Elections" elections={ELECTIONS} />
}
