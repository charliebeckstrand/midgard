import { describe, expect, it } from 'vitest'
import { renderUI } from '../../helpers'

// A temporary probe for the density-webkit job. It shows whether the engine
// matches `:has()` again when rows come into an empty listbox.
const CSS = `
.probe-empty:has(> [data-list]:empty) { display: none }
.probe-result:not(:has([data-row])) { display: none }
`

function Probe({ rows }: { rows: string[] }) {
	return (
		<>
			<style>{CSS}</style>
			{['probe-empty', 'probe-result'].map((name) => (
				<div key={name} data-testid={name} className={name}>
					<div data-list="">
						{rows.length === 0 ? null : (
							<div data-group="">
								{rows.map((row) => (
									<div key={row} data-row="">
										{row}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			))}
		</>
	)
}

describe('has empty probe', () => {
	for (const name of ['probe-empty', 'probe-result']) {
		it(`${name} shows when rows come`, () => {
			const { rerender, getByTestId } = renderUI(<Probe rows={[]} />)

			const box = getByTestId(name)

			expect(getComputedStyle(box).display).toBe('none')

			rerender(<Probe rows={['Georgia']} />)

			expect(getComputedStyle(box).display).toBe('block')

			rerender(<Probe rows={[]} />)

			expect(getComputedStyle(box).display).toBe('none')
		})
	}
})
