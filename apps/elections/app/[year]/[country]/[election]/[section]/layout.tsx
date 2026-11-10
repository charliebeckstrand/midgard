import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ElectionViews, StateOfficeView, StateOverviewView } from '@/components/election-views'
import { countyAspect } from '@/server/county-shapes'
import { readSection, type SectionParams } from '@/server/params'
import { electionResults } from '@/server/results'
import { stateOffices } from '@/server/state'
import { OVERVIEW } from '@/utilities/trail'

/**
 * The frame of a section of an election: an office, or a state. The layout of
 * the election renders the national map of an office, so an office passes its
 * page through.
 *
 * A state renders the view of each of its pages: the overview of the state
 * and each office with a race in the state. As in the layout of the election,
 * the view of the current page shows, and the other views stay mounted and
 * hidden, so a switch between the offices of the state shows a view that is
 * already rendered. A page holds only its Drawer.
 */
export default async function SectionLayout({
	params,
	children,
}: {
	params: Promise<SectionParams>
	children: ReactNode
}) {
	const section = await readSection(params)

	if (section.kind === 'office') return children

	const { election, state } = section

	const offices = await stateOffices(await electionResults(election), state)

	if (offices.length === 0) notFound()

	const aspect = countyAspect(state.fips)

	const views = {
		[OVERVIEW]: <StateOverviewView election={election} state={state} offices={offices} />,
		...Object.fromEntries(
			offices.map((office) => [
				office.contest.slug,
				<StateOfficeView
					key={office.contest.slug}
					election={election}
					state={state}
					office={office}
					offices={offices}
					aspect={aspect}
				/>,
			]),
		),
	}

	return (
		<>
			<ElectionViews views={views} />

			{children}
		</>
	)
}
