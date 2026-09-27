import { MapPinned, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { digitsOnly } from '../../utilities'
import { Icon } from '../icon'
import type { InputProps } from '../input'

/** Maps a raw input string to its masked display form. */
export type MaskInputFormat = (raw: string) => string

/**
 * A named mask for {@link MaskInput}: the `format` and the field defaults that
 * go with it. An explicit prop on the field overrides each default.
 */
export type MaskInputPreset = {
	format: MaskInputFormat
	/** Predicate for the characters that the caret counts. */
	meaningful?: (char: string) => boolean
	type?: InputProps['type']
	inputMode?: InputProps['inputMode']
	autoComplete?: InputProps['autoComplete']
	placeholder?: string
	prefix?: ReactNode
}

/** Dialing locale for {@link phoneMask}: NANP for `'US'`, loose digit-and-`+` for `'international'`. */
export type PhoneMaskCountry = 'US' | 'international'

/** Postal-code locale for {@link zipcodeMask}. */
export type ZipcodeMaskCountry = 'US' | 'CA' | 'GB' | 'international'

/** @internal North American Numbering Plan mask: strips a leading country `1`, caps at 10 digits, and formats as `(NXX) NXX-XXXX` as they arrive. */
function formatNANP(raw: string) {
	const digits = digitsOnly(raw)

	const d = (digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits).slice(0, 10)

	if (d.length === 0) return ''

	if (d.length <= 3) return d

	if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`

	return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function formatInternationalPhone(raw: string) {
	const trimmed = raw.replace(/[^\d+]/g, '')

	const hasPlus = trimmed.startsWith('+')

	const digits = digitsOnly(trimmed).slice(0, 15)

	if (!digits) return hasPlus ? '+' : ''

	return hasPlus ? `+${digits}` : digits
}

const phoneFormats = {
	US: formatNANP,
	international: formatInternationalPhone,
} satisfies Record<PhoneMaskCountry, MaskInputFormat>

function formatZipUS(raw: string) {
	const d = digitsOnly(raw).slice(0, 9)

	if (d.length <= 5) return d

	return `${d.slice(0, 5)}-${d.slice(5)}`
}

function formatZipCA(raw: string) {
	const clean = raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 6)

	if (clean.length <= 3) return clean

	return `${clean.slice(0, 3)} ${clean.slice(3)}`
}

function formatZipGB(raw: string) {
	return raw
		.toUpperCase()
		.replace(/[^A-Z0-9 ]/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 8)
}

function formatZipInternational(raw: string) {
	return raw.slice(0, 12)
}

const zipcodeFormats = {
	US: formatZipUS,
	CA: formatZipCA,
	GB: formatZipGB,
	international: formatZipInternational,
} satisfies Record<ZipcodeMaskCountry, MaskInputFormat>

const zipcodeInputModes = {
	US: 'numeric',
	CA: 'text',
	GB: 'text',
	international: 'text',
} satisfies Record<ZipcodeMaskCountry, InputProps['inputMode']>

const zipcodePlaceholders = {
	US: '12345',
	CA: 'A1A 1A1',
	GB: 'SW1A 1AA',
	international: '',
} satisfies Record<ZipcodeMaskCountry, string>

/**
 * Phone-number mask for {@link MaskInput}. It formats per `country`, sets
 * `type="tel"`, `inputMode="tel"`, and `autoComplete="tel"`, and adds a
 * leading phone icon.
 *
 * @param country - The dialing locale. The default is `'US'`.
 */
export function phoneMask(country: PhoneMaskCountry = 'US'): MaskInputPreset {
	return {
		format: phoneFormats[country],
		type: 'tel',
		inputMode: 'tel',
		autoComplete: 'tel',
		prefix: <Icon icon={<Phone />} />,
	}
}

/**
 * Postal-code mask for {@link MaskInput}. The masks cover US ZIP and ZIP+4,
 * Canadian FSA and LDU, UK outward and inward, and a loose international
 * fallback. It matches the keyboard (`inputMode`) and the placeholder to
 * `country`, sets `autoComplete="postal-code"`, and adds a leading map-pin
 * icon.
 *
 * @param country - The postal-code locale. The default is `'US'`.
 */
export function zipcodeMask(country: ZipcodeMaskCountry = 'US'): MaskInputPreset {
	return {
		format: zipcodeFormats[country],
		type: 'text',
		inputMode: zipcodeInputModes[country],
		autoComplete: 'postal-code',
		placeholder: zipcodePlaceholders[country],
		prefix: <Icon icon={<MapPinned />} />,
	}
}
