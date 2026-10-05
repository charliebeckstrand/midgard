'use client'

import { Copy } from 'lucide-react'
import type { ChangeEvent, FocusEvent } from 'react'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlContext, useControl } from '../control/context'
import { CopyButton } from '../copy-button'
import { Label } from '../fieldset'
import { Input } from '../input'
import { hexToHsva, hsvaToHex } from './color-utilities'
import { useColorPanelContext } from './context'
import { useColorField } from './use-color-field'

/** A 3 or 4 digit shorthand hex, with an optional `#`. */
const SHORT_HEX = /^#?[0-9a-f]{3,4}$/i

/**
 * Hex entry with a copy affordance, two-way bound to the panel's color.
 * A 6 or 8 digit hex commits as the reader types it. A 3 or 4 digit shorthand
 * commits on blur.
 *
 * @remarks The hex input and its label are sub-parts, not the field control.
 * They opt out of an enclosing `<Control>` / `<Field>`, so they do not take
 * its label id, `required`, `aria-describedby` or validation state. They keep
 * its variant.
 */
export function ColorHexInput() {
	const { hsva, setHsva, alpha, disabled } = useColorPanelContext()

	const control = useControl()

	const id = useIdScope().sub('hex')

	const hex = hsvaToHex(hsva, alpha).slice(1)

	const { draftProps, setDraft } = useColorField({ hex })

	const draft = draftProps('hex')

	// A 3 or 4 digit draft is also the start of a 6 or 8 digit hex, so only a
	// full hex commits while the reader types. A shorthand commits on blur.
	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		setDraft('hex', raw)

		if (SHORT_HEX.test(raw.trim())) return

		const parsed = hexToHsva(raw)

		if (parsed) setHsva(parsed)
	}

	const onBlur = (event: FocusEvent<HTMLInputElement>) => {
		const raw = event.target.value

		const parsed = SHORT_HEX.test(raw.trim()) ? hexToHsva(raw) : null

		if (parsed) setHsva(parsed)

		draft.onBlur()
	}

	return (
		<ControlContext value={undefined}>
			<Label className="sr-only" htmlFor={id}>
				Hex
			</Label>

			{/* A hex code reads left to right in each direction, as CodeBlock reads code. So an RTL
			    ancestor must not move the '#' prefix to the right or the copy button to the left. */}
			<div dir="ltr">
				<Input
					{...draft}
					id={id}
					onChange={onChange}
					onBlur={onBlur}
					// The popover content wrapper preventDefaults mousedown to hold focus
					// for the area/slider drag (color-picker-content.tsx); stop it here so
					// a click focuses the hex field. A no-op in the inline ColorPanel.
					onMouseDown={(event) => event.stopPropagation()}
					disabled={disabled}
					variant={control?.variant}
					data-slot="color-hex-input"
					prefix="#"
					spellCheck={false}
					autoComplete="off"
					className="font-mono uppercase"
					suffix={<CopyButton text={`#${hex}`} icon={<Copy />} aria-label="Copy hex value" />}
				/>
			</div>
		</ControlContext>
	)
}
