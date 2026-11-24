'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { ControlDisabledContext, useControlDisabled } from '../../primitives/control/context'
import { k } from '../../recipes/kata/fieldset'

/** Props for {@link Fieldset}: the native `<fieldset>` attributes. */
export type FieldsetProps = ComponentProps<'fieldset'>

/**
 * A group of related form controls, in a native `<fieldset>`. Caption it with a
 * `<Legend>` and lay out each control as a `<Field>` (`<Label>`, the control,
 * `<Description>`, and `<Message>`).
 *
 * @remarks Client component. A native `<fieldset disabled>` disables only the
 * form-associated elements in it. A disabled Fieldset thus also disables the
 * Control cascade. Then a control that is not form-associated, such as a
 * `SignaturePad` or the track of a `RangeSlider`, is disabled too. A Fieldset
 * in a disabled Fieldset stays disabled, as in HTML.
 */
export function Fieldset({ className, ...props }: FieldsetProps) {
	const disabledByAncestor = useControlDisabled()

	return (
		<ControlDisabledContext value={disabledByAncestor || props.disabled === true}>
			<fieldset data-slot="fieldset" className={cn(k().base, className)} {...props} />
		</ControlDisabledContext>
	)
}
