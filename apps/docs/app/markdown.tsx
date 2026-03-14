import { highlight } from '@/lib/highlight'

interface MarkdownProps {
	content: string
}

async function renderCodeBlock(code: string, lang: string): Promise<string> {
	try {
		return await highlight(code.trim(), lang)
	} catch {
		return `<pre><code>${escapeHtml(code.trim())}</code></pre>`
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

async function markdownToHtml(md: string): Promise<string> {
	// Strip auth marker
	let source = md.replace(/^<!--\s*auth:\s*required\s*-->\n?/, '')

	// Process code blocks first (collect them, replace with placeholders)
	const codeBlocks: string[] = []
	source = source.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
		const index = codeBlocks.length
		codeBlocks.push(`CODEBLOCK_${index}_${lang}_END`)
		codeBlocks[index] = `${lang}|||${code}`
		return `CODEBLOCK_PLACEHOLDER_${index}`
	})

	// Inline code
	source = source.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

	// Process line by line
	const lines = source.split('\n')
	const html: string[] = []
	let inList = false
	let inTable = false
	let tableRows: string[] = []
	let inBlockquote = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]

		// Check for code block placeholder
		const placeholderMatch = line.match(/^CODEBLOCK_PLACEHOLDER_(\d+)$/)
		if (placeholderMatch) {
			if (inList) {
				html.push('</ul>')
				inList = false
			}
			if (inBlockquote) {
				html.push('</blockquote>')
				inBlockquote = false
			}
			const idx = Number.parseInt(placeholderMatch[1], 10)
			const [lang, ...codeParts] = codeBlocks[idx].split('|||')
			const code = codeParts.join('|||')
			const rendered = await renderCodeBlock(code, lang)
			html.push(`<div class="code-block">${rendered}</div>`)
			continue
		}

		// Table rows
		if (line.startsWith('|')) {
			if (!inTable) {
				inTable = true
				tableRows = []
			}
			tableRows.push(line)
			// Check if next line is not a table row
			if (i + 1 >= lines.length || !lines[i + 1].startsWith('|')) {
				html.push(renderTable(tableRows))
				inTable = false
				tableRows = []
			}
			continue
		}

		// Blockquote
		if (line.startsWith('> ')) {
			if (!inBlockquote) {
				if (inList) {
					html.push('</ul>')
					inList = false
				}
				html.push('<blockquote>')
				inBlockquote = true
			}
			html.push(`<p>${processInline(line.slice(2))}</p>`)
			continue
		}
		if (inBlockquote && line.trim() === '') {
			html.push('</blockquote>')
			inBlockquote = false
		}

		// Headings
		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
		if (headingMatch) {
			if (inList) {
				html.push('</ul>')
				inList = false
			}
			const level = headingMatch[1].length
			const text = processInline(headingMatch[2])
			const id = headingMatch[2]
				.toLowerCase()
				.replace(/[^\w\s-]/g, '')
				.replace(/\s+/g, '-')
			html.push(`<h${level} id="${id}">${text}</h${level}>`)
			continue
		}

		// Horizontal rule
		if (/^---+$/.test(line.trim())) {
			if (inList) {
				html.push('</ul>')
				inList = false
			}
			html.push('<hr />')
			continue
		}

		// List items
		if (line.match(/^[-*]\s+/)) {
			if (!inList) {
				html.push('<ul>')
				inList = true
			}
			html.push(`<li>${processInline(line.replace(/^[-*]\s+/, ''))}</li>`)
			continue
		}

		// Numbered list items
		if (line.match(/^\d+\.\s+/)) {
			if (!inList) {
				html.push('<ul>')
				inList = true
			}
			html.push(`<li>${processInline(line.replace(/^\d+\.\s+/, ''))}</li>`)
			continue
		}

		// Empty line
		if (line.trim() === '') {
			if (inList) {
				html.push('</ul>')
				inList = false
			}
			continue
		}

		// Paragraph
		if (inList) {
			html.push('</ul>')
			inList = false
		}
		html.push(`<p>${processInline(line)}</p>`)
	}

	if (inList) html.push('</ul>')
	if (inBlockquote) html.push('</blockquote>')

	return html.join('\n')
}

function renderTable(rows: string[]): string {
	const parseRow = (row: string) =>
		row
			.split('|')
			.slice(1, -1)
			.map((cell) => cell.trim())

	// Skip separator row (contains dashes)
	const dataRows = rows.filter((r) => !r.match(/^\|[\s-|]+\|$/))
	if (dataRows.length === 0) return ''

	const headerCells = parseRow(dataRows[0])
	const bodyRows = dataRows.slice(1)

	let html = '<table><thead><tr>'
	for (const cell of headerCells) {
		html += `<th>${processInline(cell)}</th>`
	}
	html += '</tr></thead><tbody>'
	for (const row of bodyRows) {
		html += '<tr>'
		for (const cell of parseRow(row)) {
			html += `<td>${processInline(cell)}</td>`
		}
		html += '</tr>'
	}
	html += '</tbody></table>'
	return html
}

function processInline(text: string): string {
	let result = text
	// Bold
	result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
	// Italic
	result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
	// Links
	result = result.replace(
		/\[([^\]]+)]\(([^)]+)\)/g,
		'<a href="$2" class="text-blue-500 hover:underline">$1</a>',
	)
	return result
}

export async function Markdown({ content }: MarkdownProps) {
	const html = await markdownToHtml(content)

	return (
		<div
			className="prose dark:prose-invert max-w-none"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered from trusted local files
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
