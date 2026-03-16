export type PropDef = {
	name: string
	type: string
	default?: string
}

export type ComponentApi = {
	name: string
	props: PropDef[]
}

export type CvaVariant = {
	name: string
	options: string[]
	defaultValue?: string
}
