// @vitest-environment node
import { Search } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { isIconElement } from '../../components/button/button-utilities'
import { Icon } from '../../components/icon'

describe('isIconElement', () => {
	it.for([
		['returns true for an <Icon> element', [<Icon key="icon" icon={<Search />} />], true],
		['returns true for a raw <svg> element', [<svg key="svg" aria-hidden />], true],
		[
			'returns true for an element opted in via data-slot="icon"',
			[<span key="slot" data-slot="icon" />],
			true,
		],
		[
			'returns false for an element without the icon marker',
			[<span key="label">label</span>],
			false,
		],
		['returns false for non-element values', ['text', 42, null, undefined], false],
	] as const)('%s', ([, values, expected]) => {
		for (const value of values) expect(isIconElement(value)).toBe(expected)
	})
})
