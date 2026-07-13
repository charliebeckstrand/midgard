import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import {
	CommandPalette,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../components/command-palette'
import { VirtualOptions } from '../../primitives/virtual-options'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Keyboard-complete virtualization (real browser). `VirtualOptions` renders
 * only a windowed subset of a large option list; these assert that keyboard
 * navigation still reaches options outside that window — the gap this
 * workstream closes — rather than stopping at the rendered edge. Real layout
 * is required: jsdom's zero-size scroll container renders zero rows, so there
 * is no window edge to test against (see `virtualization.test.tsx`).
 *
 * Neither `Combobox` nor `CommandPalette` enables roving type-ahead (their
 * input owns typing as a filter query, not a listbox jump — see
 * `use-a11y-roving.test.ts` for type-ahead-over-an-indexed-source coverage);
 * arrow reachability is the gap that matters for them. ArrowUp from an empty
 * highlight wraps straight to the last item — the sharpest one-keystroke
 * demonstration that navigation reaches far outside the rendered window,
 * without needing thousands of individual key presses.
 */

const LARGE_COUNT = 5_000

const ITEMS = Array.from({ length: LARGE_COUNT }, (_, i) => ({ id: i, label: `Item ${i}` }))

describe('Combobox + VirtualOptions: arrow reaches an option outside the window', () => {
	function LargeCombobox({
		onValueChange,
	}: {
		onValueChange: (value: number | undefined) => void
	}) {
		return (
			<Combobox<number>
				displayValue={(v) => `Item ${v}`}
				placeholder="Search"
				onValueChange={onValueChange}
			>
				<VirtualOptions
					items={ITEMS}
					estimateSize={32}
					getOptionId={(item) => `combo-opt-${item.id}`}
				>
					{(item, _index, meta) => (
						<ComboboxOption key={item.id} id={`combo-opt-${item.id}`} value={item.id} {...meta}>
							<ComboboxLabel>{item.label}</ComboboxLabel>
						</ComboboxOption>
					)}
				</VirtualOptions>
			</Combobox>
		)
	}

	it('ArrowUp from empty wraps to the last of 5,000 options, mounting and selecting it', async () => {
		const onValueChange = vi.fn()

		renderUI(<LargeCombobox onValueChange={onValueChange} />)

		const input = screen.getByRole('combobox')

		await userEvent.click(input)

		await waitFor(() => expect(screen.getAllByRole('listbox')).toHaveLength(1))

		// The initial window renders only the first ~10-20 rows; nothing near
		// index 4,999 is in the DOM yet.
		expect(document.getElementById(`combo-opt-${LARGE_COUNT - 1}`)).toBeNull()

		await userEvent.keyboard('{ArrowUp}')

		const lastId = `combo-opt-${LARGE_COUNT - 1}`

		await waitFor(() => {
			expect(input.getAttribute('aria-activedescendant')).toBe(lastId)

			const active = document.getElementById(lastId)

			expect(active).not.toBeNull()

			expect(active?.hasAttribute('data-active')).toBe(true)
		})

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(LARGE_COUNT - 1))
	})
})

describe('CommandPalette + VirtualOptions: arrow reaches an item outside the window', () => {
	function LargePalette({ onAction }: { onAction: (id: number) => void }) {
		const [open, setOpen] = useState(true)

		return (
			<CommandPalette open={open} onOpenChange={setOpen} triggerShortcut={false}>
				{/* Unlike Combobox/Listbox, whose panel already carries a fixed
				    max-height, CommandPalette's DialogBody sizes to its content —
				    it needs an explicit, definite-height scrollable wrapper to
				    virtualize (a max-height alone has no floor to break the
				    circularity: 0 content -> 0 height -> 0 rendered rows). */}
				<div style={{ height: '320px', overflow: 'auto' }}>
					<VirtualOptions
						items={ITEMS}
						estimateSize={32}
						getOptionId={(item) => `cmd-opt-${item.id}`}
					>
						{(item, _index, meta) => (
							<CommandPaletteItem
								key={item.id}
								id={`cmd-opt-${item.id}`}
								closeOnAction={false}
								onAction={() => onAction(item.id)}
								{...meta}
							>
								<CommandPaletteLabel>{item.label}</CommandPaletteLabel>
							</CommandPaletteItem>
						)}
					</VirtualOptions>
				</div>
			</CommandPalette>
		)
	}

	it('ArrowUp from empty wraps to the last of 5,000 items, mounting and activating it', async () => {
		const onAction = vi.fn()

		renderUI(<LargePalette onAction={onAction} />)

		await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

		const input = screen.getByRole('combobox')

		await userEvent.click(input)

		expect(document.getElementById(`cmd-opt-${LARGE_COUNT - 1}`)).toBeNull()

		await userEvent.keyboard('{ArrowUp}')

		const lastId = `cmd-opt-${LARGE_COUNT - 1}`

		await waitFor(() => {
			expect(input.getAttribute('aria-activedescendant')).toBe(lastId)

			const active = document.getElementById(lastId)

			expect(active).not.toBeNull()

			expect(active?.hasAttribute('data-active')).toBe(true)
		})

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(onAction).toHaveBeenCalledWith(LARGE_COUNT - 1))
	})
})
