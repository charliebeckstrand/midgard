import { describe, expect, it } from 'vitest'
import { cdp } from 'vitest/browser'
import { Wysiwyg } from '../../modules/wysiwyg'
import { renderUI } from '../helpers'
import { editable } from './helpers/wysiwyg'

/** A node of the accessibility tree of Chromium. */
type AXNode = {
	nodeId: string
	ignored: boolean
	role?: { value: string }
	name?: { value: string }
	childIds?: string[]
}

/**
 * The text of each `StaticText` node under the textbox in the accessibility
 * tree of the test frame. A screen reader reads it as the value of the field.
 */
async function fieldText(): Promise<string[]> {
	const { frameTree } = (await cdp().send('Page.getFrameTree')) as {
		frameTree: { frame: { id: string }; childFrames?: { frame: { id: string } }[] }
	}

	const frameId = frameTree.childFrames?.[0]?.frame.id ?? frameTree.frame.id

	const { nodes } = (await cdp().send('Accessibility.getFullAXTree', { frameId })) as {
		nodes: AXNode[]
	}

	const byId = new Map(nodes.map((node) => [node.nodeId, node]))

	const textbox = nodes.find((node) => !node.ignored && node.role?.value === 'textbox')

	const texts: string[] = []

	const walk = (node: AXNode | undefined) => {
		if (!node) return

		if (!node.ignored && node.role?.value === 'StaticText') texts.push(node.name?.value ?? '')

		for (const id of node.childIds ?? []) walk(byId.get(id))
	}

	walk(textbox)

	return texts
}

/**
 * The placeholder of an empty Wysiwyg is generated content, which Chromium
 * puts in the accessibility tree as text. The field names it through
 * `aria-placeholder`, so the text must not read as the value of the field
 * (WCAG 1.3.1, 4.1.2). The tree and the generated content need a real browser.
 */
describe('Wysiwyg placeholder (real browser)', () => {
	it('shows the placeholder, and gives it to readers only as the placeholder', async () => {
		renderUI(<Wysiwyg aria-label="Notes" placeholder="Write a note" />)

		const field = await editable()

		expect(field).toHaveAttribute('aria-placeholder', 'Write a note')

		// The placeholder still paints.
		const before = getComputedStyle(field.firstElementChild as Element, '::before')

		expect(before.content).toContain('"Write a note"')

		expect(await fieldText()).toEqual([])
	})
})
