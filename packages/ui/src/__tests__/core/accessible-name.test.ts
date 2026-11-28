import { describe, expect, it } from 'vitest'
import { accessibleName, ownAccessibleName, spokenText } from '../../core/accessible-name'
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
			'leaves a hidden or aria-hidden descendant out of its own text',
			'<button>A<span hidden>Drag</span><b aria-hidden="true">*</b><i>!</i></button>',
			'A!',
		],
		[
			'reads a hidden aria-labelledby target',
			'<span id="hid" hidden>Drag</span><button aria-labelledby="hid">x</button>',
			'Drag',
		],
		[
			'ignores an empty aria-label and uses text instead',
			'<button aria-label="">Fallback</button>',
			'Fallback',
		],
		['returns an empty string when nothing provides a name', '<button></button>', ''],
		[
			'puts a space between the blocks of its own text',
			'<button><div>LD-1001</div><div>Acme Freight</div></button>',
			'LD-1001 Acme Freight',
		],
		[
			'puts a space between the blocks of an aria-labelledby target',
			'<div id="card"><p>LD-1001</p><p>Acme Freight</p></div><button aria-labelledby="card">x</button>',
			'LD-1001 Acme Freight',
		],
	])('%s', (_name, html, expected) => {
		const host = mount(html)

		expect(accessibleName(host.querySelector('button'))).toBe(expected)
	})
})

describe('ownAccessibleName', () => {
	it.each([
		['gives the aria-label', '<button aria-label="Close">x</button>', 'Close'],
		[
			'gives the aria-labelledby text',
			'<span id="own">Own</span><button aria-labelledby="own">x</button>',
			'Own',
		],
		[
			'gives an empty string for a target with no text',
			'<span id="blank"></span><button aria-labelledby="blank">x</button>',
			'',
		],
		['gives null with no label', '<button>x</button>', null],
		['gives null when no ID resolves', '<button aria-labelledby="missing">x</button>', null],
	])('%s', (_, html, expected) => {
		const button = mount(html).querySelector('button')

		if (!button) throw new Error('no button')

		expect(ownAccessibleName(button)).toBe(expected)
	})
})

describe('spokenText', () => {
	it.each([
		['joins inline elements with no space', '<b>Bo</b>ld', 'Bold'],
		[
			'puts a space at each edge of a block element',
			'<div>Changes saved</div><div>Your profile is up to date.</div>',
			'Changes saved Your profile is up to date.',
		],
		[
			'puts a space at each edge of an inline-block element',
			'<span>The message is in the trash.</span><button>Undo</button>',
			'The message is in the trash. Undo',
		],
		[
			'reads the computed display, not the tag',
			'<span style="display: block">Write the notes</span><span style="display: block">List the fixes</span>',
			'Write the notes List the fixes',
		],
		[
			'joins the children of a display: contents element as inline text',
			'<span style="display: contents">Bo</span>ld',
			'Bold',
		],
		[
			'leaves out a hidden, aria-hidden, or display: none part',
			'A<p hidden>B</p><p aria-hidden="true">C</p><p style="display: none">D</p><p>E</p>',
			'A E',
		],
		['collapses each run of white space to one space', '<p>  Two\n\twords  </p>', 'Two words'],
	])('%s', (_name, html, expected) => {
		expect(spokenText(mount(html))).toBe(expected)
	})
})
