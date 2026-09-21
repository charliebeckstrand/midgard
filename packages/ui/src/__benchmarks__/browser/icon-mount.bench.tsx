/**
 * Whose cost an icon is.
 *
 * The jsdom menu suite (`../menu.bench.tsx`) reads a row with an icon at twice
 * the cost of a row without one. Over 24 rows that is 6.8 ms against 14.3 ms.
 * The ratio asks whether `Icon` is expensive. The rungs below answer it by
 * building the same 24 glyphs five ways, each one step further from the bare
 * element.
 *
 * `empty spans` carries the host, the React root, and 24 trivial elements, so
 * every later rung reads against it. `plain svg` swaps in the markup lucide
 * emits, which prices the SVG elements themselves. `lucide bare` renders the
 * real component, which adds two `forwardRef` layers, a context read, and two
 * regular-expression passes over the icon's name per render. `Icon + lucide`
 * adds this package's wrapper: one component, one `cloneElement`, and one `cn`
 * call. The last rung takes the numeric-size branch, which also builds a
 * `style` object.
 *
 * A mount is what a reader pays for an icon, so every rung mounts and tears
 * down. No memo can help there, which is why no rung re-renders.
 */

import { SquarePen } from 'lucide-react'
import type { ReactNode } from 'react'
import { bench, describe } from 'vitest'
import { Icon } from '../../components/icon'
import { reactHost, WINDOW } from './harness'

/** Icons per mount: a menu of that many rows, or a dense toolbar. */
const COUNT = 24

const keys = Array.from({ length: COUNT }, (_, index) => `icon-${index}`)

/** The markup lucide emits for `SquarePen`: nine attributes and two paths. */
function PlainSvg() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className="lucide lucide-square-pen"
			aria-hidden="true"
		>
			<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
			<path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
		</svg>
	)
}

/** The ladder, each rung one layer further from the bare element. */
const RUNGS: [string, (key: string) => ReactNode][] = [
	['empty spans', (key) => <span key={key} />],
	['plain svg', (key) => <PlainSvg key={key} />],
	['lucide bare', (key) => <SquarePen key={key} />],
	['Icon + lucide', (key) => <Icon key={key} icon={<SquarePen />} />],
	['Icon + lucide · numeric size', (key) => <Icon key={key} icon={<SquarePen />} size={16} />],
]

describe(`icon · ${COUNT} per mount`, () => {
	for (const [name, render] of RUNGS) {
		bench(
			name,
			() => {
				const mounted = reactHost()

				mounted.render(<div>{keys.map(render)}</div>)

				mounted.destroy()
			},
			WINDOW.slow,
		)
	}
})
