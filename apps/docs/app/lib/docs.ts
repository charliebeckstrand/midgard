import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface DocFile {
	slug: string
	title: string
	content: string
	description: string
}

const DOCS_DIR = join(process.cwd(), '../../docs')

/**
 * Docs listed here are shown in the docs app dashboard.
 * Other docs in the directory still exist for agent use but are not surfaced in the UI.
 */
const PUBLISHED_DOCS: Record<string, { title: string; description: string }> = {
	project: {
		title: 'Project Map',
		description: 'Workspace layout, packages, key file paths, tech stack, and common commands.',
	},
	decisions: {
		title: 'Architecture Decisions',
		description: 'Non-trivial design choices with context and trade-offs.',
	},
	patterns: {
		title: 'Reusable Code Patterns',
		description: 'Recurring idioms and snippets specific to this project.',
	},
	commands: {
		title: 'Commands & Workflows',
		description: 'CLI commands, scripts, and multi-step workflows.',
	},
	glossary: {
		title: 'Domain Glossary',
		description: 'Domain-specific terms and naming conventions.',
	},
	apis: {
		title: 'API Routes & Contracts',
		description: 'Endpoints, request/response shapes, and auth requirements.',
	},
	env: {
		title: 'Environment Variables',
		description: 'Environment variable names, purposes, and defaults.',
	},
	dependencies: {
		title: 'Dependency Notes',
		description: 'Version quirks, upgrade notes, and compatibility issues.',
	},
	testing: {
		title: 'Testing Patterns',
		description: 'Testing conventions, utilities, and mocking approaches.',
	},
	errors: {
		title: 'Error Solutions',
		description: 'Error messages indexed with causes and fixes.',
	},
}

function isPublished(slug: string): boolean {
	return slug in PUBLISHED_DOCS
}

function extractTitle(content: string, slug: string): string {
	const match = content.match(/^#\s+(.+)$/m)

	if (match) return match[1]

	return PUBLISHED_DOCS[slug]?.title ?? slug
}

export async function getAllDocs(): Promise<DocFile[]> {
	const files = await readdir(DOCS_DIR)

	const slugs = files
		.filter((f) => f.endsWith('.md'))
		.map((f) => f.replace(/\.md$/, ''))
		.filter(isPublished)

	const docs = await Promise.all(
		slugs.map(async (slug) => {
			try {
				const raw = await readFile(join(DOCS_DIR, `${slug}.md`), 'utf-8')
				return {
					slug,
					title: extractTitle(raw, slug),
					content: raw,
					description: PUBLISHED_DOCS[slug]?.description ?? '',
				}
			} catch {
				return null
			}
		}),
	)

	return docs.filter((d): d is DocFile => d !== null)
}
