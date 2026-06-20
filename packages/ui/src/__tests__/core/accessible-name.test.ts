import { afterEach, describe, expect, it } from 'vitest'
import { accessibleName } from '../../core/accessible-name'

// aria-labelledby resolves through ownerDocument.getElementById, so labelled
// fixtures must live in the document; hosts are removed after each test for
// isolation.
const hosts: HTMLElement[] = []

function mount(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	document.body.append(host)

	hosts.push(host)

	return host
}

afterEach(() => {
	for (const host of hosts.splice(0)) host.remove()
})

describe('accessibleName', () => {
	it('returns an empty string for a null element', () => {
		expect(accessibleName(null)).toBe('')
	})

	it('prefers aria-label over text content', () => {
		const host = mount('<button aria-label="Close">x</button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Close')
	})

	it('prefers aria-label over aria-labelledby', () => {
		const host = mount(
			'<span id="lbl">Labelled</span><button aria-label="Direct" aria-labelledby="lbl">x</button>',
		)

		expect(accessibleName(host.querySelector('button'))).toBe('Direct')
	})

	it('falls back to the trimmed aria-labelledby target text', () => {
		const host = mount('<span id="lbl">  Labelled  </span><button aria-labelledby="lbl">x</button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Labelled')
	})

	it('falls back to its own trimmed text when no aria attribute applies', () => {
		const host = mount('<button>  Save  </button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Save')
	})

	it('falls back to its own text when aria-labelledby points at a missing id', () => {
		const host = mount('<button aria-labelledby="absent">Own</button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Own')
	})

	it('ignores an empty aria-label and uses text instead', () => {
		const host = mount('<button aria-label="">Fallback</button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Fallback')
	})

	it('returns an empty string when nothing provides a name', () => {
		const host = mount('<button></button>')

		expect(accessibleName(host.querySelector('button'))).toBe('')
	})
})
