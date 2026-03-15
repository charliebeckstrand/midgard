import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface DocFile {
	slug: string
	title: string
	content: string
	description: string
	category: 'guides' | 'reference'
}

const DOCS_DIR = join(process.cwd(), '../../docs')

/**
 * Developer-facing guides — shown first in the sidebar under "Guides".
 * Written for humans: getting started, workflows, architecture.
 */
const GUIDE_DOCS: Record<string, { title: string; description: string }> = {
	'getting-started': {
		title: 'Getting Started',
		description: 'Prerequisites, installation, and running the dev server.',
	},
	development: {
		title: 'Development Workflow',
		description: 'Day-to-day development patterns and common tasks.',
	},
	architecture: {
		title: 'Architecture Overview',
		description: 'How the pieces of Midgard fit together.',
	},
}

/**
 * Reference docs — shown under "Reference" in the sidebar.
 * Detailed technical reference maintained by both agents and developers.
 */
const REFERENCE_DOCS: Record<string, { title: string; description: string }> = {
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

const PUBLISHED_DOCS: Record<
	string,
	{ title: string; description: string; category: 'guides' | 'reference' }
> = {
	...Object.fromEntries(
		Object.entries(GUIDE_DOCS).map(([k, v]) => [k, { ...v, category: 'guides' as const }]),
	),
	...Object.fromEntries(
		Object.entries(REFERENCE_DOCS).map(([k, v]) => [k, { ...v, category: 'reference' as const }]),
	),
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
					category: PUBLISHED_DOCS[slug]?.category ?? ('reference' as const),
				}
			} catch {
				return null
			}
		}),
	)

	return docs.filter((d): d is DocFile => d !== null)
}

/** Returns docs split into guides and reference, preserving definition order. */
export function groupDocs(docs: DocFile[]): { guides: DocFile[]; reference: DocFile[] } {
	const guideOrder = Object.keys(GUIDE_DOCS)
	const referenceOrder = Object.keys(REFERENCE_DOCS)

	const guides = guideOrder
		.map((slug) => docs.find((d) => d.slug === slug))
		.filter((d): d is DocFile => d !== null)

	const reference = referenceOrder
		.map((slug) => docs.find((d) => d.slug === slug))
		.filter((d): d is DocFile => d !== null)

	return { guides, reference }
}
