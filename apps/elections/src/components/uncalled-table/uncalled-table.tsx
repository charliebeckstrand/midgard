'use client'

import { lazy, Suspense, useState } from 'react'
import { Badge } from 'ui/badge'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import type { GridSortState } from 'ui/grid'
import { Placeholder } from 'ui/placeholder'
import { Flex } from 'ui/structure/flex'
import type { Election } from '../../elections/registry'
import { useDrawerGo } from '../../hooks/use-drawer'
import { entryStep, type RaceEntry } from '../../utilities/results'
import { CollapseCaret } from '../collapse-caret'

/** The table loads when it first opens, because the Grid is a large part of the code of the page. */
const UncalledGrid = lazy(() =>
	import('./uncalled-grid').then((module) => ({ default: module.UncalledGrid })),
)

/**
 * Every race not called, in a section that opens on a click: a table with
 * sortable columns, the closest lead first. A row opens its race in the Drawer.
 * The first open shows a placeholder while the table loads.
 */
export function UncalledTable({
	election,
	entries,
}: {
	election: Election
	entries: readonly RaceEntry[]
}) {
	const go = useDrawerGo(election)

	const [sort, setSort] = useState<GridSortState[]>([{ column: 'lead', direction: 'asc' }])

	return (
		<Collapse>
			<CollapseTrigger>
				<Flex as="span" gap="sm" className="text-base/6 font-semibold">
					Every race not called
					<Badge variant="soft" color="amber">
						{entries.length}
					</Badge>
					<CollapseCaret />
				</Flex>
			</CollapseTrigger>

			<CollapsePanel>
				<div className="pt-4">
					<Suspense
						fallback={
							<div aria-busy="true">
								<Placeholder className="h-64" />
							</div>
						}
					>
						<UncalledGrid
							entries={entries}
							sort={sort}
							onSortChange={setSort}
							onPick={(entry) => go(entryStep(entry))}
						/>
					</Suspense>
				</div>
			</CollapsePanel>
		</Collapse>
	)
}
