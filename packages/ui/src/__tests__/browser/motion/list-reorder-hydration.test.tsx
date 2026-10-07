import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { List, ListItem } from '../../../components/list'
import { act, attach, getSlot } from '../../helpers'

const items = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
]

function list() {
	return (
		<List items={items} getKey={(item) => item.id} onReorder={vi.fn()}>
			{(item) => <ListItem>{item.label}</ListItem>}
		</List>
	)
}

/**
 * Real-Motion check of a reorderable `List` that hydrates. The server has no
 * `Reorder` parts, so it renders a plain `<ul>`. The setup loads the parts on
 * the client before the case. The hydration render must still match the server
 * markup, and the list must then change to the `Reorder` group.
 */
describe('reorderable List hydration (real Motion)', () => {
	it('hydrates the server markup with no mismatch, then mounts the Reorder group', async () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = renderToString(list())

		const serverList = getSlot(container, 'list')

		const onRecoverableError = vi.fn()

		const consoleError = vi.spyOn(console, 'error')

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, list(), { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		// The group is a new element, so the server `<ul>` leaves the DOM.
		await expect.poll(() => getSlot(container, 'list') !== serverList).toBe(true)
	})
})
