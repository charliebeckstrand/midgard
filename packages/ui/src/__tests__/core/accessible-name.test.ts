import { describe, expect, it } from 'vitest'
import { accessibleName } from '../../core/accessible-name'
import { attach } from '../helpers'

// aria-labelledby resolves through ownerDocument.getElementById, so labeled
// fixtures must live in the document.
function mount(html: string): HTMLElement {
	const host = attach(document.createElement('div'))

	host.innerHTML = html

	return host
}

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
			'<span id="lbl">Labeled</span><button aria-label="Direct" aria-labelledby="lbl">x</button>',
		)

		expect(accessibleName(host.querySelector('button'))).toBe('Direct')
	})

	it('falls back to the trimmed aria-labelledby target text', () => {
		const host = mount('<span id="lbl">  Labeled  </span><button aria-labelledby="lbl">x</button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Labeled')
	})

	it('joins the trimmed text of every aria-labelledby target in list order', () => {
		const host = mount(
			'<span id="verb"> Move </span><span id="noun">Card 1</span><button aria-labelledby="noun  verb">x</button>',
		)

		expect(accessibleName(host.querySelector('button'))).toBe('Card 1 Move')
	})

	it('skips an aria-labelledby id that does not resolve', () => {
		const host = mount(
			'<span id="lbl">Labeled</span><button aria-labelledby="absent lbl">x</button>',
		)

		expect(accessibleName(host.querySelector('button'))).toBe('Labeled')
	})

	it('falls back to its own text when no aria-labelledby id in a list resolves', () => {
		const host = mount('<button aria-labelledby="absent missing">Own</button>')

		expect(accessibleName(host.querySelector('button'))).toBe('Own')
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
