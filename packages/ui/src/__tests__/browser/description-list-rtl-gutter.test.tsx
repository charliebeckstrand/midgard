import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { cn } from '../../core/cn'
import { k as dl } from '../../recipes/kata/description-list'
import { present, renderUI } from '../helpers'

/**
 * In a right-to-left region, the gutter of a horizontal term is on the left
 * edge. The gutter starts at the `sm` breakpoint. Below it the term stacks
 * above its details and has no gutter.
 */

beforeAll(() => page.viewport(1024, 768))

describe('DescriptionList under dir=rtl', () => {
	it('puts the term gutter on the inline end (left)', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<dl className={cn(dl.projection.horizontal)}>
					<dt>Term</dt>
					<dd>Detail</dd>
				</dl>
			</div>,
		)
		const style = getComputedStyle(present(container.querySelector('dt'), 'dt'))
		expect([style.paddingLeft, style.paddingRight]).toEqual(['8px', '0px'])
	})
})
