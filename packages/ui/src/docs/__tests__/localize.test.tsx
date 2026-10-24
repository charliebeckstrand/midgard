import { act, render, screen } from '@testing-library/react'
import { LocaleProvider } from 'ui/providers/locale'
import { describe, expect, it } from 'vitest'
import { localize } from '../kit/localize.tsx'

// Each page and each tab module of the docs shows the copy of the module in
// the language of the reader. `localize-server.test.tsx` covers the server
// render.

function English() {
	return <p>Save</p>
}

function Spanish() {
	return <p>Guardar</p>
}

const Localized = localize(
	English,
	{ es: () => Promise.resolve({ default: Spanish }) },
	{ es: ['/assets/button-es.js'] },
)

/** The page in `locale`. */
function Page({ locale }: { locale: string }) {
	return (
		<LocaleProvider locale={locale}>
			<Localized />
		</LocaleProvider>
	)
}

describe('localize', () => {
	it('shows the module in a language with no copy', () => {
		render(<Page locale="fr-FR" />)

		expect(screen.getByText('Save')).toBeDefined()
	})

	it('shows the copy in the language of the reader, when it loads', async () => {
		await act(async () => {
			render(<Page locale="es-ES" />)
		})

		expect(screen.getByText('Guardar')).toBeDefined()
	})
})
