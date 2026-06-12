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
 * Pixels by which the document overflows the viewport horizontally: a
 * component forced a page-level horizontal scrollbar at the default test
 * viewport instead of wrapping or scrolling internally.
 */
export function horizontalPageOverflow(): number {
	const doc = document.documentElement

	return Math.max(0, doc.scrollWidth - doc.clientWidth)
}
