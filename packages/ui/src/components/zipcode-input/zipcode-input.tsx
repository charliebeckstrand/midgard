'use client'

import { MapPinned } from 'lucide-react'
import type { ReactNode } from 'react'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import { MaskInput, type MaskInputProps } from '../mask-input'

/** Postal-code locale selecting the mask, `inputMode`, and placeholder. */
export type ZipcodeInputCountry = 'US' | 'CA' | 'GB' | 'international'

/**
 * Props for {@link ZipcodeInput}. Inherits `<MaskInput>` props except
 * `format`, `type`, `inputMode`, `autoComplete`, and `prefix`, which are
 * derived from `country` or defaulted here.
 */
export type ZipcodeInputProps = Omit<
	MaskInputProps,
	'format' | 'type' | 'inputMode' | 'autoComplete' | 'prefix'
> & {
	/**
	 * Postal-code locale.
	 * @defaultValue 'US'
	 */
	country?: ZipcodeInputCountry
	/** Overrides the leading map-pin-icon affix. */
	prefix?: ReactNode
}

function formatUS(raw: string) {
	const d = digitsOnly(raw).slice(0, 9)

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

const formatters = {
	US: formatUS,
	CA: formatCA,
	GB: formatGB,
	international: formatInternational,
} satisfies Record<ZipcodeInputCountry, (raw: string) => string>

const inputModes = {
	US: 'numeric',
	CA: 'text',
	GB: 'text',
	international: 'text',
} satisfies Record<ZipcodeInputCountry, MaskInputProps['inputMode']>

const placeholders = {
	US: '12345',
	CA: 'A1A 1A1',
	GB: 'SW1A 1AA',
	international: '',
} satisfies Record<ZipcodeInputCountry, string>

/**
 * Postal-code field built on `<MaskInput>`. Selects a live formatting mask
 * from `country` (US ZIP/ZIP+4, Canadian FSA/LDU, UK outward/inward, or a
 * loose international fallback) and matches the keyboard (`inputMode`) and
 * placeholder to it. Forwards `autoComplete="postal-code"` and a leading
 * map-pin-icon `prefix`; an explicit `placeholder` overrides the locale
 * default.
 */
export function ZipcodeInput({ country = 'US', placeholder, prefix, ...props }: ZipcodeInputProps) {
	return (
		<MaskInput
			data-slot="zipcode-input"
			type="text"
			inputMode={inputModes[country]}
			autoComplete="postal-code"
			placeholder={placeholder ?? placeholders[country]}
			prefix={prefix ?? <Icon icon={<MapPinned />} />}
			format={formatters[country]}
			{...props}
		/>
	)
}
