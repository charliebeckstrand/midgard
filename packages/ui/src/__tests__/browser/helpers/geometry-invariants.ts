/**
 * Layout invariants axe doesn't check, evaluated against a real layout engine.
 * Each check returns human-readable labels of offending elements so a failing
 * `toEqual([])` names the culprits. Complements `axe-geometry.ts`
 * (contrast/target-size): these catch the missing-margin / collapsed-layout /
 * silent-truncation class.
 */

const INTERACTIVE_SELECTOR = [
	'a[href]',
	'button',
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'[role="button"]',
	'[role="checkbox"]',
	'[role="radio"]',
	'[role="switch"]',
	'[role="tab"]',
	'[role="menuitem"]',
	'[role="menuitemcheckbox"]',
	'[role="menuitemradio"]',
	'[role="option"]',
	'[role="combobox"]',
	'[role="slider"]',
].join(', ')

function label(el: HTMLElement): string {
	const slot = el.getAttribute('data-slot') ?? el.closest('[data-slot]')?.getAttribute('data-slot')
	const text = el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 32)

	return `<${el.tagName.toLowerCase()}>${slot ? `[data-slot="${slot}"]` : ''}${text ? ` "${text}"` : ''}`
}

function interactive(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)].filter((el) =>
		el.checkVisibility(),
	)
}

/**
 * Visible interactive elements collapsed to a zero-size box: layout broke and
 * the control is unhittable. `sr-only` elements keep a 1px box and pass;
 * `display: none` / `visibility: hidden` are excluded by `checkVisibility`.
 */
export function collapsedTargets(root: HTMLElement): string[] {
	return interactive(root)
		.filter((el) => {
			const rect = el.getBoundingClientRect()

			return rect.width < 1 || rect.height < 1
		})
		.map(label)
}

/**
 * Single-line text silently cut off: `white-space: nowrap` with clipping
 * overflow but no `text-overflow: ellipsis` marker (Tailwind `truncate` sets
 * all three, so intentional truncation passes). A 1px tolerance absorbs
 * subpixel rounding. Visually-hidden elements (`sr-only` and the live-region
 * idiom: a 1×1 clipped box) are intentionally clipped and skipped.
 */
export function clippedText(root: HTMLElement): string[] {
	return [...root.querySelectorAll<HTMLElement>('*')]
		.filter((el) => {
			if (!el.checkVisibility()) return false

			const rect = el.getBoundingClientRect()

			if (rect.width <= 1 && rect.height <= 1) return false

			const hasText = [...el.childNodes].some(
				(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
			)

			if (!hasText) return false

			const style = getComputedStyle(el)

			if (style.whiteSpace !== 'nowrap' && style.whiteSpace !== 'pre') return false

			if (style.overflowX !== 'hidden' && style.overflowX !== 'clip') return false

			if (style.textOverflow === 'ellipsis') return false

			return el.scrollWidth > el.clientWidth + 1
		})
		.map(label)
}

/**
 * In-flow interactive siblings whose boxes overlap: a missing gap/margin
 * collapsed two controls onto each other. Positioned (`absolute`/`fixed`)
 * elements are excluded — overlaid adornments (input clear buttons, badges)
 * are intentional — and overlap up to 2px is tolerated for joined groups that
 * collapse shared borders with `-ml-px`.
 */
export function overlappingTargets(root: HTMLElement): string[] {
	const inFlow = interactive(root).filter((el) => {
		const position = getComputedStyle(el).position

		return position === 'static' || position === 'relative'
	})

	const byParent = new Map<HTMLElement, HTMLElement[]>()

	for (const el of inFlow) {
		const parent = el.parentElement

		if (!parent) continue

		byParent.set(parent, [...(byParent.get(parent) ?? []), el])
	}

	const offenders = new Set<HTMLElement>()

	for (const siblings of byParent.values()) {
		for (let i = 0; i < siblings.length; i++) {
			for (let j = i + 1; j < siblings.length; j++) {
				const a = (siblings[i] as HTMLElement).getBoundingClientRect()
				const b = (siblings[j] as HTMLElement).getBoundingClientRect()

				const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left)
				const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

				if (overlapX > 2 && overlapY > 2) {
					offenders.add(siblings[i] as HTMLElement)

					offenders.add(siblings[j] as HTMLElement)
				}
			}
		}
	}

	return [...offenders].map(label)
}

/**
 * Pairs of hosts whose `TouchTarget` hit areas overlap. The later host paints
 * on top and takes all of the overlap, so the earlier host loses part of its
 * target. A container of small hosts caps the hit areas at its gap with
 * `--touch-target-gap-x` or `--touch-target-gap-y` (`primitives/touch-target`).
 *
 * A hidden host and a host inside another host are skipped. The check reads the
 * floor that the page has, so a test sets the 44px floor to check a coarse
 * pointer. Overlap up to 1px is tolerated. The members of a `Group` share a 1px
 * border (`-ms-px`), so their boxes, and the hit areas that keep to them, overlap
 * by that much.
 */
export function overlappingHitAreas(root: HTMLElement): string[] {
	const areas = [...root.querySelectorAll<HTMLElement>('[data-slot="touch-target"]')].flatMap(
		(span) => {
			const host = span.parentElement

			return host?.checkVisibility({ visibilityProperty: true })
				? [{ host, box: span.getBoundingClientRect() }]
				: []
		},
	)

	const pairs: string[] = []

	for (let i = 0; i < areas.length; i++) {
		for (let j = i + 1; j < areas.length; j++) {
			const a = areas[i] as (typeof areas)[number]
			const b = areas[j] as (typeof areas)[number]

			if (a.host.contains(b.host) || b.host.contains(a.host)) continue

			const overlapX = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
			const overlapY = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)

			if (overlapX > 1 && overlapY > 1)
				pairs.push(
					`${label(a.host)} and ${label(b.host)} by ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}`,
				)
		}
	}

	return pairs
}

/**
 * Pixels by which the document overflows the viewport horizontally: a
 * component forced a page-level horizontal scrollbar at the default test
 * viewport instead of wrapping or scrolling internally.
 */
export function horizontalPageOverflow(): number {
	const doc = document.documentElement

	return Math.max(0, doc.scrollWidth - doc.clientWidth)
}
