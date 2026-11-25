import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cdp, userEvent } from 'vitest/browser'
import { Wysiwyg } from '../../modules/wysiwyg'
import { renderUI, screen } from '../helpers'
import { editable } from './helpers/wysiwyg'

/** A node of the accessibility tree of Chromium. */
type AXNode = {
	ignored: boolean
	role?: { value: string }
	name?: { value: string }
	properties?: { name: string; value: { value: unknown } }[]
}

/** Each link of the accessibility tree of the test frame: its name and its URL. */
async function links(): Promise<{ name: string; url: unknown }[]> {
	const { frameTree } = (await cdp().send('Page.getFrameTree')) as {
		frameTree: { frame: { id: string }; childFrames?: { frame: { id: string } }[] }
	}

	const frameId = frameTree.childFrames?.[0]?.frame.id ?? frameTree.frame.id

	const { nodes } = (await cdp().send('Accessibility.getFullAXTree', { frameId })) as {
		nodes: AXNode[]
	}

	return nodes
		.filter((node) => !node.ignored && node.role?.value === 'link')
		.map((node) => ({
			name: node.name?.value ?? '',
			url: node.properties?.find((property) => property.name === 'url')?.value.value,
		}))
}

/** Records whether each click and middle click that reached the window was canceled. */
const clicks: boolean[] = []

const record = (event: MouseEvent) => {
	clicks.push(event.defaultPrevented)

	// The runner must not navigate, so the test cancels a click that the field let through.
	event.preventDefault()
}

// The browser instance shares one page across its files, so the listeners
// live only for the cases of this file. A listener that stays would cancel
// the clicks of the next file, such as the click of a label.
beforeEach(() => {
	window.addEventListener('click', record)

	window.addEventListener('auxclick', record)
})

afterEach(() => {
	window.removeEventListener('click', record)

	window.removeEventListener('auxclick', record)
})

/**
 * A link in a Wysiwyg reads as a link with its URL (WCAG 1.3.1), and a press
 * on it does not navigate. The accessibility tree and the press need a real
 * browser.
 */
describe('Wysiwyg links (real browser)', () => {
	it('gives a link its role and URL, and a press on it places the caret', async () => {
		renderUI(<Wysiwyg aria-label="Notes" defaultValue="Read [the docs](https://a.dev) first" />)

		const field = await editable()

		expect(await links()).toEqual([{ name: 'the docs', url: 'https://a.dev/' }])

		clicks.length = 0

		await userEvent.click(screen.getByRole('link', { name: 'the docs' }))

		expect(clicks).toEqual([true])

		expect(field).toHaveFocus()
	})

	it('does not navigate from a link of a read-only field, and keeps the link out of the Tab order', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Read [the docs](https://a.dev) first" readOnly />,
		)

		await editable()

		const link = screen.getByRole('link', { name: 'the docs' })

		expect(link).toHaveAttribute('tabindex', '-1')

		clicks.length = 0

		await userEvent.click(link)

		// A middle press opens no new tab.
		await userEvent.click(link, { button: 'middle' })

		expect(clicks).toEqual([true, true])
	})

	it('draws no href for a URL that can run script', async () => {
		renderUI(<Wysiwyg aria-label="Notes" defaultValue="A [trap](javascript:alert(1)) here" />)

		const field = await editable()

		expect(field.querySelector('a')).not.toHaveAttribute('href')
	})
})
