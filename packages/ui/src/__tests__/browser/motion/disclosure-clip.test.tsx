import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import { JsonTree } from '../../../components/json-tree'
import { Tree, TreeItem } from '../../../components/tree'
import { present, renderUI, screen } from '../../helpers'
import { sampleUntil } from '../helpers/sample'
import { budget } from '../helpers/wall-clock'

/**
 * The panel of an Accordion item and the group of a Tree or a JsonTree branch clip their content
 * only while the height moves. At rest, a focus ring or a shadow at the edge of the content shows
 * in full, as in Collapse (`collapse-clip.test.tsx`).
 *
 * Real Motion is necessary: the motion targets hold the clip, and the instant mock removes them.
 */

/** The height and the overflow of the panel on one frame. */
type Sample = { height: number; overflow: string }

/**
 * Reads `node` on each frame until its overflow is visible, which is when the open lands. A frame
 * where the node is not on the page gives no sample. It throws when the open does not land before
 * `deadline` milliseconds pass.
 */
async function sampleUntilLanded(node: () => Element | null, deadline: number): Promise<Sample[]> {
	const samples: Sample[] = []

	await sampleUntil(
		() => {
			const element = node()

			if (!element) return null

			const overflow = getComputedStyle(element).overflow

			samples.push({ height: element.getBoundingClientRect().height, overflow })

			return overflow
		},
		(overflow) => overflow === 'visible',
		{ deadline },
	)

	return samples
}

/** The first element of `selector` that was not in the document before the open. */
function newElement(selector: string) {
	const before = new Set(document.querySelectorAll(selector))

	return () => [...document.querySelectorAll(selector)].find((node) => !before.has(node)) ?? null
}

const cases: [string, () => ReactElement, () => HTMLElement, string][] = [
	[
		'an Accordion panel',
		() => (
			<Accordion>
				<AccordionItem value="a">
					<AccordionTrigger>Toggle</AccordionTrigger>
					<AccordionPanel>
						<div style={{ height: 120 }}>Body</div>
					</AccordionPanel>
				</AccordionItem>
			</Accordion>
		),
		() => screen.getByRole('button', { name: 'Toggle' }),
		'[data-slot="accordion-panel"]',
	],
	[
		'a Tree group',
		() => (
			<Tree aria-label="Files">
				<TreeItem label="src">
					<TreeItem label="a.ts" />
					<TreeItem label="b.ts" />
				</TreeItem>
			</Tree>
		),
		() => screen.getByRole('treeitem', { name: 'src' }),
		'[data-slot="tree-group"]',
	],
	[
		'a JsonTree group',
		() => <JsonTree data={{ nested: { value: 1, other: 2 } }} defaultExpandDepth={1} />,
		() =>
			present(
				document.querySelector<HTMLElement>('[role="treeitem"][aria-expanded="false"]'),
				'closed branch',
			),
		'[data-slot="json-group"]',
	],
]

describe('the clip of a disclosure panel (real Motion)', () => {
	it.each(cases)(
		'clips %s while it opens, and not when the open lands',
		async (_, ui, toggle, selector) => {
			renderUI(ui())

			const button = toggle()

			const controls = newElement(selector)

			const sampling = sampleUntilLanded(controls, budget(5000))

			if (button.getAttribute('role') === 'treeitem') {
				button.focus()

				await userEvent.keyboard('{ArrowRight}')
			} else {
				await userEvent.click(button)
			}

			const samples = await sampling

			const panel = present(controls(), 'panel')

			const open = panel.getBoundingClientRect().height

			expect(getComputedStyle(panel).overflow).toBe('visible')

			const moving = samples.filter((sample) => sample.height < open - 1)

			expect(moving.length).toBeGreaterThan(0)

			expect(moving.filter((sample) => sample.overflow !== 'hidden')).toEqual([])
		},
	)
})
