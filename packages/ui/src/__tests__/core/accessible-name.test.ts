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

	it.each([
		['prefers aria-label over text content', '<button aria-label="Close">x</button>', 'Close'],
		[
			'prefers aria-label over aria-labelledby',
			'<span id="lbl">Labeled</span><button aria-label="Direct" aria-labelledby="lbl">x</button>',
			'Direct',
		],
		[
			'falls back to the trimmed aria-labelledby target text',
			'<span id="lbl">  Labeled  </span><button aria-labelledby="lbl">x</button>',
			'Labeled',
		],
		[
			'joins the trimmed text of every aria-labelledby target in list order',
			'<span id="verb"> Move </span><span id="noun">Card 1</span><button aria-labelledby="noun  verb">x</button>',
			'Card 1 Move',
		],
		[
			'skips an aria-labelledby id that does not resolve',
			'<span id="lbl">Labeled</span><button aria-labelledby="absent lbl">x</button>',
			'Labeled',
		],
		[
			'falls back to its own text when no aria-labelledby id in a list resolves',
			'<button aria-labelledby="absent missing">Own</button>',
			'Own',
		],
		[
			'falls back to its own text when aria-labelledby points at a missing id',
			'<button aria-labelledby="absent">Own</button>',
			'Own',
		],
		[
			'falls back to its own trimmed text when no aria attribute applies',
			'<button>  Save  </button>',
			'Save',
		],
		[
			'ignores an empty aria-label and uses text instead',
			'<button aria-label="">Fallback</button>',
			'Fallback',
		],
		['returns an empty string when nothing provides a name', '<button></button>', ''],
	])('%s', (_name, html, expected) => {
		const host = mount(html)

		expect(accessibleName(host.querySelector('button'))).toBe(expected)
	})
})
