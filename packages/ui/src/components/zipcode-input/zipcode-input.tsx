'use client'

import { MaskInput, type MaskInputProps } from '../mask-input'

export type ZipcodeInputCountry = 'US' | 'CA' | 'GB' | 'international'

export type ZipcodeInputProps = Omit<
	MaskInputProps,
	'format' | 'type' | 'inputMode' | 'autoComplete'
> & {
	country?: ZipcodeInputCountry
}

function formatUS(raw: string) {
	const d = raw.replace(/\D/g, '').slice(0, 9)

	if (d.length <= 5) return d

	return `${d.slice(0, 5)}-${d.slice(5)}`
}

function formatCA(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 6)

	if (clean.length <= 3) return clean

	return `${clean.slice(0, 3)} ${clean.slice(3)}`
}

function formatGB(raw: string) {
	return raw
		.toUpperCase()
		.replace(/[^A-Z0-9 ]/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 8)
}

function formatInternational(raw: string) {
	return raw.slice(0, 12)
}

const formatters: Record<ZipcodeInputCountry, (raw: string) => string> = {
	US: formatUS,
	CA: formatCA,
	GB: formatGB,
	international: formatInternational,
}

const inputModes: Record<ZipcodeInputCountry, MaskInputProps['inputMode']> = {
	US: 'numeric',
	CA: 'text',
	GB: 'text',
	international: 'text',
}

const placeholders: Record<ZipcodeInputCountry, string> = {
	US: '12345',
	CA: 'A1A 1A1',
	GB: 'SW1A 1AA',
	international: '',
}

export function ZipcodeInput({ country = 'US', placeholder, ...props }: ZipcodeInputProps) {
	return (
		<MaskInput
			type="text"
			inputMode={inputModes[country]}
			autoComplete="postal-code"
			placeholder={placeholder ?? placeholders[country]}
			format={formatters[country]}
			{...props}
		/>
	)
}
