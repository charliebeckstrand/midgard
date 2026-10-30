import { describe, expect, it } from 'vitest'
import { HoldButton } from '../../components/hold-button'
import { Slider } from '../../components/slider'
import { Switch } from '../../components/switch'
import { cn } from '../../core/cn'
import { k as avatar } from '../../recipes/kata/avatar'
import { k as chat } from '../../recipes/kata/chat-message'
import { k as dl } from '../../recipes/kata/description-list'
import { k as markdown } from '../../recipes/kata/markdown'
import { k as signaturePad } from '../../recipes/kata/signature-pad'
import { k as stepper } from '../../recipes/kata/stepper'
import { k as tabs } from '../../recipes/kata/tabs'
import { k as textarea } from '../../recipes/kata/textarea'
import { k as timeline } from '../../recipes/kata/timeline'
import { kokkaku } from '../../recipes/kiso/kokkaku'
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
	// Each row reads the side that takes the value, then the side that must stay at zero.
	it.for([
		[
			'markdown ul pads the inline start (right)',
			markdown().ul,
			'ul',
			['paddingRight', 'paddingLeft'],
			'20px',
		],
		[
			'markdown blockquote rules the inline start (right)',
			markdown().blockquote,
			'blockquote',
			['borderRightWidth', 'borderLeftWidth'],
			'2px',
		],
		[
			'markdown task checkbox spaces the inline end (left)',
			markdown().checkbox,
			'div',
			['marginLeft', 'marginRight'],
			'8px',
		],
		[
			'vertical tab list rules the inline start (right)',
			tabs({ orientation: 'vertical' }).list,
			'div',
			['borderRightWidth', 'borderLeftWidth'],
			'1px',
		],
		[
			'vertical stepper pads the inline end (left)',
			stepper({ orientation: 'vertical' }).base,
			'div',
			['paddingLeft', 'paddingRight'],
			'16px',
		],
		[
			'textarea actions row pads the inline end (left)',
			cn(textarea().actions),
			'div',
			['paddingLeft', 'paddingRight'],
			'8px',
		],
	] as const)('%s', ([, className, tag, [side, opposite], value]) => {
		const style = rtl(className, tag)
		expect([style[side], style[opposite]]).toEqual([value, '0px'])
	})

	it.for([
		[
			'vertical tab indicator sits on the inline start (right)',
			`absolute ${tabs({ orientation: 'vertical' }).indicator}`,
			'right',
			'-1px',
		],
		[
			'avatar status dot sits on the top inline-end corner (left)',
			avatar().status.dot,
			'left',
			'0px',
		],
		[
			'horizontal timeline marker sits at the inline start (right)',
			timeline({ orientation: 'horizontal' }).marker.base,
			'right',
			'6.5px',
		],
		['signature pad actions sit at the inline end (left)', signaturePad().actions, 'left', '8px'],
	] as const)('%s', ([, className, property, value]) => {
		const style = rtl(className)
		expect(style[property]).toBe(value)
	})

	it('user chat bubble squares the bottom inline-end corner (bottom-left)', () => {
		const style = rtl(chat({ sender: 'user' }).bubble)
		expect(style.borderBottomLeftRadius).not.toBe(style.borderTopLeftRadius)
		expect(style.borderBottomRightRadius).toBe(style.borderTopRightRadius)
	})

	it('description-list term gutter is on the inline end (left)', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<dl className={dl({ orientation: 'horizontal' }).base}>
					<dt>Term</dt>
					<dd>Detail</dd>
				</dl>
			</div>,
		)
		const style = getComputedStyle(present(container.querySelector('dt'), 'dt'))
		expect([style.paddingLeft, style.paddingRight]).toEqual(['8px', '0px'])
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

	it('checked switch thumb moves toward the inline end (left)', () => {
		const left = (checked: boolean) => {
			const { container } = renderUI(
				<div dir="rtl">
					<Switch aria-label="On" checked={checked} onChange={() => {}} />
				</div>,
			)
			const thumb = present(container.querySelector('[data-slot=switch-thumb]'), 'thumb')
			return thumb.getBoundingClientRect().left
		}
		expect(left(true)).toBeLessThan(left(false))
	})

	it('user chat skeleton squares the bottom inline-end corner (bottom-left)', () => {
		const style = rtl(cn(kokkaku.chat.bubble, kokkaku.chat.tail.user))
		expect(style.borderBottomLeftRadius).not.toBe(style.borderTopLeftRadius)
		expect(style.borderBottomRightRadius).toBe(style.borderTopRightRadius)
	})

	it('slider track fills from the inline start (right)', () => {
		const { container } = renderUI(
			<div dir="rtl">
				<Slider aria-label="Volume" defaultValue={20} />
			</div>,
		)
		const input = present(container.querySelector('input[type=range]'), 'slider')
		// A script cannot read the style of the track pseudo-element, so read the
		// direction that its gradient takes.
		expect(getComputedStyle(input).getPropertyValue('--slider-run').trim()).toBe('to left')
	})
})
