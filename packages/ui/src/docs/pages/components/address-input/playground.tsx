import { AddressInput, type AddressInputProps } from 'ui/address-input'
import { madrid, searchPlaces } from './places.ts'

export default function AddressInputPlayground(props: AddressInputProps) {
	return (
		<AddressInput {...props} aria-label="Address" provider={searchPlaces} defaultValue={madrid} />
	)
}
