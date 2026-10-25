export const countries = [
	{ code: 'au', label: 'Australia' },
	{ code: 'ca', label: 'Canada' },
	{ code: 'de', label: 'Germany' },
	{ code: 'jp', label: 'Japan' },
	{ code: 'gb', label: 'United Kingdom' },
	{ code: 'us', label: 'United States' },
]

export function countryName(code: string) {
	return countries.find((country) => country.code === code)?.label ?? code
}
