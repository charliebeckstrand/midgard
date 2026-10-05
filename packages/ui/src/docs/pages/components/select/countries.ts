export const countries = [
	{ code: 'au', name: 'Australia' },
	{ code: 'ca', name: 'Canada' },
	{ code: 'de', name: 'Germany' },
	{ code: 'jp', name: 'Japan' },
	{ code: 'gb', name: 'United Kingdom' },
	{ code: 'us', name: 'United States' },
]

export function countryName(code: string) {
	return countries.find((country) => country.code === code)?.name ?? code
}
