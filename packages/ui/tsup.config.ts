import { defineConfig } from 'tsup'

const entry = {
	index: 'src/index.ts',
	hooks: 'src/hooks/index.ts',
	// Components
	avatar: 'src/components/avatar/index.ts',
	badge: 'src/components/badge/index.ts',
	button: 'src/components/button/index.ts',
	checkbox: 'src/components/checkbox/index.ts',
	combobox: 'src/components/combobox/index.ts',
	dl: 'src/components/dl/index.ts',
	dialog: 'src/components/dialog/index.ts',
	divider: 'src/components/divider/index.ts',
	dropdown: 'src/components/dropdown/index.ts',
	fieldset: 'src/components/fieldset/index.ts',
	heading: 'src/components/heading/index.ts',
	input: 'src/components/input/index.ts',
	listbox: 'src/components/listbox/index.ts',
	navbar: 'src/components/navbar/index.ts',
	pagination: 'src/components/pagination/index.ts',
	placeholder: 'src/components/placeholder/index.ts',
	radio: 'src/components/radio/index.ts',
	select: 'src/components/select/index.ts',
	sheet: 'src/components/sheet/index.ts',
	sidebar: 'src/components/sidebar/index.ts',
	switch: 'src/components/switch/index.ts',
	table: 'src/components/table/index.ts',
	tabs: 'src/components/tabs/index.ts',
	text: 'src/components/text/index.ts',
	textarea: 'src/components/textarea/index.ts',
	// Layouts & Pages
	layouts: 'src/layouts/index.ts',
	pages: 'src/pages/index.ts',
	// Special
	'react-bits/shiny-text': 'src/components/react-bits/shiny-text.tsx',
}

export default defineConfig({
	entry,
	format: ['esm'],
	target: 'es2022',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: true,
	splitting: true,
	banner: { js: "'use client'" },
})
