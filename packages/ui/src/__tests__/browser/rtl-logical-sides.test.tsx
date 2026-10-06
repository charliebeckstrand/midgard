import { describe, expect, it } from 'vitest'
import { HoldButton } from '../../components/hold-button'
import { cn } from '../../core/cn'
import { k as avatar } from '../../recipes/kata/avatar'
import { k as chat } from '../../recipes/kata/chat-message'
import { k as dl } from '../../recipes/kata/description-list'
import { k as markdown } from '../../recipes/kata/markdown'
import { k as stepper } from '../../recipes/kata/stepper'
import { k as tabs } from '../../recipes/kata/tabs'
import { k as timeline } from '../../recipes/kata/timeline'
import { present, renderUI } from '../helpers'

/**
 * In a right-to-left region, each recipe puts its start-side spacing, rule,
 * corner, and anchor on the right edge. The cases render the recipe classes (or
 * the component) under `dir="rtl"` and read the computed side.
 */
function rtl(className: string, tag: 'div' | 'ul' | 'blockquote' | 'dl' = 'div') {
	const Tag = tag
	const { container } = renderUI(
		<div dir="rtl">
			<Tag className={className} data-probe="" />
		</div>,
	)
	return getComputedStyle(present(container.querySelector('[data-probe]'), 'probe'))
}

describe('logical sides under dir=rtl', () => {
	it('markdown ul pads the inline start (right)', () => {
		const s = rtl(cn(markdown.ul), 'ul')
		expect([s.paddingRight, s.paddingLeft]).toEqual(['20px', '0px'])
	})

	it('markdown blockquote rules the inline start (right)', () => {
		const s = rtl(cn(markdown.blockquote), 'blockquote')
		expect([s.borderRightWidth, s.borderLeftWidth]).toEqual(['2px', '0px'])
	})

	it('markdown task checkbox spaces the inline end (left)', () => {
		const s = rtl(cn(markdown.checkbox))
		expect([s.marginLeft, s.marginRight]).toEqual(['8px', '0px'])
	})

	it('user chat bubble squares the bottom inline-end corner (bottom-left)', () => {
		const s = rtl(chat.bubble({ sender: 'user' }))
		expect(s.borderBottomLeftRadius).not.toBe(s.borderTopLeftRadius)
		expect(s.borderBottomRightRadius).toBe(s.borderTopRightRadius)
	})

	it('vertical tab list rules the inline start (right)', () => {
		const s = rtl(tabs.list({ orientation: 'vertical' }))
		expect([s.borderRightWidth, s.borderLeftWidth]).toEqual(['1px', '0px'])
	})

	it('vertical tab indicator sits on the inline start (right)', () => {
		const s = rtl(`absolute ${tabs.indicator({ orientation: 'vertical' })}`)
		expect(s.right).toBe('-1px')
	})

	it('avatar status dot sits on the top inline-end corner (left)', () => {
		const s = rtl(cn(avatar.status.dot))
		expect(s.left).toBe('0px')
	})

	it('description-list term gutter is on the inline end (left)', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<dl className={cn(dl.projection.horizontal)}>
					<dt>Term</dt>
					<dd>Detail</dd>
				</dl>
			</div>,
		)
		const s = getComputedStyle(present(container.querySelector('dt'), 'dt'))
		expect([s.paddingLeft, s.paddingRight]).toEqual(['8px', '0px'])
	})

	it('vertical stepper pads the inline end (left)', () => {
		const s = rtl(stepper.base({ orientation: 'vertical' }))
		expect([s.paddingLeft, s.paddingRight]).toEqual(['16px', '0px'])
	})

	it('horizontal timeline marker sits at the inline start (right)', () => {
		const s = rtl(cn(timeline.marker.base, timeline.marker.horizontal))
		expect(s.right).toBe('6.5px')
	})

	it('hold-button fill grows from the inline start (right)', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<HoldButton onHoldComplete={() => {}}>Delete</HoldButton>
			</div>,
		)
		const fill = present(container.querySelector<HTMLElement>('span.origin-left'), 'fill')
		// The fill rests at scaleX(0), so read the layout width. It rounds to a
		// whole pixel, and the origin keeps the fraction.
		const origin = Number.parseFloat(getComputedStyle(fill).transformOrigin)
		expect(origin).toBeCloseTo(fill.offsetWidth, 0)
	})
})
