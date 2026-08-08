'use client'

import { Copy } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useIdScope } from '../../hooks/use-id-scope'
import { CopyButton } from '../copy-button'
import { Label } from '../fieldset'
import { Input } from '../input'
import { hexToHsva, hsvaToHex } from './color-utilities'
import { useColorPanelContext } from './context'
import { useColorField } from './use-color-field'

/** Hex entry with a copy affordance, two-way bound to the panel's colour. */
export function ColorHexInput() {
	const { hsva, setHsva, alpha, disabled, size } = useColorPanelContext()

	const id = useIdScope().sub('hex')

	const hex = hsvaToHex(hsva, alpha).slice(1)

	const { draftProps, setDraft } = useColorField({ hex })

	const onChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		setDraft('hex', raw)

		const parsed = hexToHsva(raw)

		if (parsed) setHsva(parsed)
	}

	return (
		<>
			<Label className="sr-only" htmlFor={id}>
				Hex
			</Label>

			<Input
				{...draftProps('hex')}
				id={id}
				onChange={onChange}
				// The popover content wrapper preventDefaults mousedown to hold focus
				// for the area/slider drag (color-picker-content.tsx); stop it here so
				// a click focuses the hex field. A no-op in the inline ColorPanel.
				onMouseDown={(event) => event.stopPropagation()}
				disabled={disabled}
				size={size}
				data-slot="color-hex-input"
				prefix="#"
				spellCheck={false}
				autoComplete="off"
				className="font-mono uppercase"
				suffix={<CopyButton value={`#${hex}`} icon={<Copy />} aria-label="Copy hex value" />}
			/>
		</>
	)
}
