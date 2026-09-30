/**
 * One rename keystroke in the group editor of the column manager, at 8 groups
 * of 40 columns and 40 ungrouped columns.
 *
 * The editor mounts on its own, and a wrapper holds the groups in state, as
 * the column manager does. Each sample types into the name of the first group
 * under `flushSync`, so the sample ends at the commit. The samples add and
 * remove one character, so no keystroke bails on an equal value. The `layout`
 * row also reads the rect of the editor after the commit, so the sample holds
 * the style and layout work of the commit.
 *
 * Before the benches register, the file logs the components that one
 * keystroke renders (`render-count.ts`).
 */

import './render-count'

import { useState } from 'react'
import { flushSync } from 'react-dom'
import { bench, describe } from 'vitest'
import { GridGroupManager } from '../../modules/grid/grid-group-manager'
import type { GridColumnGroup } from '../../modules/grid/grid-group-types'
import type { GridColumnManagerItem } from '../../modules/grid/types'
import { reactHost, settle, WINDOW } from './harness'
import { readRenders, resetRenders } from './render-count'

const GROUPS = 8

const COLUMNS_PER_GROUP = 40

const UNGROUPED = 40

const columns: GridColumnManagerItem[] = Array.from(
	{ length: GROUPS * COLUMNS_PER_GROUP + UNGROUPED },
	(_, index) => ({ id: `c${index}`, title: `Column ${index}` }),
)

const initialGroups: GridColumnGroup[] = Array.from({ length: GROUPS }, (_, group) => ({
	id: `g${group}`,
	title: `Group ${group}`,
	columns: columns
		.slice(group * COLUMNS_PER_GROUP, (group + 1) * COLUMNS_PER_GROUP)
		.map((column) => column.id),
}))

const order = columns.map((column) => column.id)

// The column manager holds these with one identity for the mount.
const hidden = new Set<string | number>()

const matchAll = () => true

const noop = () => {}

/** The editor over the groups in its own state, as the column manager holds them. */
function Editor() {
	const [groups, setGroups] = useState(initialGroups)

	return (
		<GridGroupManager
			groups={groups}
			onGroupsChange={setGroups}
			columns={columns}
			matches={matchAll}
			hidden={hidden}
			onToggle={noop}
			order={order}
			onOrderChange={noop}
		/>
	)
}

/** The components that the log reports. */
const COUNTED = [
	'GridGroupManagerZoneView',
	'GridGroupManagerZoneHeader',
	'GridGroupManagerColumnRow',
	'Menu',
] as const

const mounted = reactHost()

mounted.render(<Editor />)

// The work that the mount schedules lands before the first sample.
await settle()

const input = document.querySelector<HTMLInputElement>('input[aria-label="Group name for Group 0"]')

if (!input) throw new Error('group editor bench found no name input')

const editor = input.closest('[data-slot="card"]')?.parentElement ?? document.body

const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

let typed = false

/** One keystroke: adds a character to the name, or removes it, and commits the rename. */
function keystroke() {
	typed = !typed

	flushSync(() => {
		setValue?.call(input, typed ? 'Group 0x' : 'Group 0')

		input?.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

// Two keystrokes first, so the count reads a keystroke and not the work that
// the mount left.
keystroke()

keystroke()

resetRenders()

keystroke()

console.log(`group editor · one keystroke renders ${JSON.stringify(readRenders(COUNTED))}`)

describe('grid group editor · 8 × 40 columns · rename keystroke', () => {
	bench('commit', keystroke, WINDOW.slow)

	bench(
		'layout',
		() => {
			keystroke()

			editor.getBoundingClientRect()
		},
		WINDOW.slow,
	)
})
