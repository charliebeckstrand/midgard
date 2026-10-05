import { SignaturePad } from 'ui/signature-pad'

export default function StrokeStyle() {
	return (
		<SignaturePad
			aria-label="Initials"
			placeholder="Add your initials"
			strokeColor="#1d4ed8"
			strokeWidth={4}
		/>
	)
}
