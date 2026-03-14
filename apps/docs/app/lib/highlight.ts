import { codeToHtml } from 'shiki'

export async function highlight(code: string, lang: string): Promise<string> {
	return codeToHtml(code, {
		lang: lang || 'text',
		theme: 'github-dark',
	})
}
