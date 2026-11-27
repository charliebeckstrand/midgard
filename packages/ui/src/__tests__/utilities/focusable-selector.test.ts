import { describe, expect, it } from 'vitest'
import { getTabbableElements } from '../../utilities/focusable-selector'

describe('getTabbableElements', () => {
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

		expect(getTabbableElements(root).map((element) => element.id)).toEqual(['a', 'b', 'c'])
	})

	it('keeps only the checked radio of a set, as Tab does', () => {
		const root = document.createElement('div')

		root.innerHTML = `
			<input id="a1" type="radio" name="a" />
			<input id="a2" type="radio" name="a" checked />
			<input id="b1" type="radio" name="b" />
			<input id="b2" type="radio" name="b" />
			<input id="c1" type="radio" name="c" />
			<input id="c2" type="radio" name="c" checked disabled />
			<form><input id="a3" type="radio" name="a" /></form>
			<input id="lone" type="radio" />
		`

		// Set `a` keeps its checked radio, and the radio of set `a` in the form is
		// a set of its own. Set `b` has no checked radio, and the checked radio of
		// set `c` is disabled, so each of their radios stays.
		expect(getTabbableElements(root).map((element) => element.id)).toEqual([
			'a2',
			'b1',
			'b2',
			'c1',
			'a3',
			'lone',
		])
	})

	it('gives nothing for no root', () => {
		expect(getTabbableElements(null)).toEqual([])
	})
})
