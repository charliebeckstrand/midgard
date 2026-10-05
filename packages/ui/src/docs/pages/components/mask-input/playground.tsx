import { MaskInput, type MaskInputProps, phoneMask } from 'ui/mask-input'

export default function MaskInputPlayground(props: MaskInputProps) {
	return <MaskInput {...props} mask={phoneMask()} aria-label="Phone" placeholder="(555) 555-0132" />
}
