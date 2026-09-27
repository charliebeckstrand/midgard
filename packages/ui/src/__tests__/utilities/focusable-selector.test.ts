import { describe, expect, it } from 'vitest'
import { tabbablesIn } from '../../utilities/focusable-selector'

describe('tabbablesIn', () => {
	it('keeps the tab order and drops what the browser skips', () => {
		const root = document.createElement('div')

		root.innerHTML = `
			<button id="a">A</button>
			<input id="hidden" type="hidden" />
			<button id="off" tabindex="-1">Off</button>
			<fieldset disabled><input id="fenced" /></fieldset>
			<button id="disabled" disabled>D</button>
			<span id="b" tabindex="0">B</span>
			<a id="c" href="#c">C</a>
		`

		expect(tabbablesIn(root).map((element) => element.id)).toEqual(['a', 'b', 'c'])
	})

	it('gives nothing for no root', () => {
		expect(tabbablesIn(null)).toEqual([])
	})
})
