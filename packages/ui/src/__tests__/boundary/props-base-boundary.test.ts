import { join } from 'node:path'
import {
	isArrowFunction,
	isCallExpression,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isIntersectionTypeNode,
	isJsxOpeningElement,
	isJsxSelfClosingElement,
	isParenthesizedTypeNode,
	isPropertyAccessExpression,
	isPropertySignatureDeclaration,
	isTypeAliasDeclaration,
	isTypeLiteralNode,
	isTypeReferenceNode,
	isVariableDeclaration,
	type Node,
	type TypeNode,
	type TypeReferenceNode,
} from 'typescript/unstable/ast'
import {
	type Checker,
	type Project,
	SymbolFlags,
	type Symbol as TsSymbol,
} from 'typescript/unstable/sync'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openPublicProject, type PublicProject, publicBarrels } from '../helpers/public-barrels'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// `ComponentProps<'tag'>` is the only native-prop base (CONVENTIONS §4.3). It
// carries `ref`, so the older bases — which drop it — are gone: a props type
// built on one of them silently rejects a ref the component would forward.
// `SlotProps` was an exact alias of `ComponentProps` and is gone with them.

// Shipped-source directories. Tests, benchmarks, and the docs app are
// excluded.
const SCAN_DIRS = [
	'components',
	'core',
	'hooks',
	'layouts',
	'modules',
	'primitives',
	'providers',
	'recipes',
	'structure',
	'types',
	'utilities',
]

const BANNED = /\b(ComponentPropsWithoutRef|ComponentPropsWithRef|SlotProps)\s*</g

const ELEMENT_ATTRS = /\b[A-Za-z]*HTMLAttributes\s*</g

// A component that renders more than one element type cannot name a single
// `ComponentProps<'tag'>`: the arms are not mutually assignable. These keep the
// element-agnostic base, and with it no `ref`.
const ELEMENT_ATTRS_ALLOWED = new Map([
	['components/fieldset/message.tsx', 'renders a `<p>` or a `<div>`'],
	['components/stepper/stepper.tsx', 'renders a `<div>` or an `<ol>`'],
])

/**
 * The matches of `pattern` in the shipped source, outside the `allowed` files. `used` holds
 * each allowed file that still matches, so a test can report an entry that no longer applies.
 */
function scan(
	pattern: RegExp,
	allowed?: Map<string, string>,
): { violations: string[]; used: Set<string> } {
	const violations: string[] = []

	const used = new Set<string>()

	for (const dir of SCAN_DIRS) {
		walkSource(join(srcDir, dir), (file, content) => {
			if (!isSourceFile(file)) return

			const rel = srcRelative(file)

			const matches = [...content.matchAll(pattern)]

			if (allowed?.has(rel)) {
				if (matches.length > 0) used.add(rel)

				return
			}

			for (const match of matches) {
				violations.push(`${rel} → ${match[1] ?? match[0]}`)
			}
		})
	}

	return { violations, used }
}

describe('props base boundary', () => {
	it('no props type is built on a ref-dropping base', () => {
		const { violations } = scan(BANNED)

		expect(
			violations,
			`use \`ComponentProps<'tag'>\` — it carries \`ref\` (CONVENTIONS §4.3):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no props type is built on element attributes', () => {
		const { violations } = scan(ELEMENT_ATTRS, ELEMENT_ATTRS_ALLOWED)

		expect(
			violations,
			`use \`ComponentProps<'tag'>\`, or allowlist the multi-element case:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('every allowlist entry still names a file on an element-attributes base', () => {
		const { used } = scan(ELEMENT_ATTRS, ELEMENT_ATTRS_ALLOWED)

		const stale = [...ELEMENT_ATTRS_ALLOWED.keys()].filter((rel) => !used.has(rel))

		expect(stale, `entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})

/**
 * The barreled props types whose component renders an element and that take no
 * native base yet (CONVENTIONS §4.3). Each letter sweep removes the rows of its
 * own components, so the list only gets shorter. A new component never goes on
 * it.
 */
const NO_BASE_BACKLOG = new Set<string>([
	'components/collapse/collapse-panel.tsx → CollapsePanelProps',
	'components/color/color-picker.tsx → ColorPickerProps',
	'components/command-palette/command-palette.tsx → CommandPaletteProps',
	'components/date-picker/date-picker.tsx → DatePickerProps',
	'components/dialog/dialog.tsx → DialogPanelProps',
	'components/drawer/drawer.tsx → DrawerPanelProps',
	'components/file-upload/file-upload-state.ts → FileUploadButtonProps',
	'components/file-upload/file-upload-state.ts → FileUploadDropProps',
	'components/file-upload/file-upload-state.ts → FileUploadInputProps',
	'components/filters/filters.tsx → FiltersProps',
	'components/json-tree/json-tree.tsx → JsonTreeProps',
	'components/kanban/kanban-card-handle.tsx → KanbanCardHandleProps',
	'components/kanban/kanban-card.tsx → KanbanCardProps',
	'components/kanban/kanban-column-body.tsx → KanbanColumnBodyProps',
	'components/kanban/kanban-column-header.tsx → KanbanColumnHeaderProps',
	'components/kanban/kanban-column.tsx → KanbanColumnProps',
	'components/list/list-handle.tsx → ListHandleProps',
	'components/markdown/markdown.tsx → MarkdownProps',
	'components/menu/menu-content.tsx → MenuContentProps',
	'components/menu/menu-trigger.tsx → MenuTriggerProps',
	'components/password-confirm/password-confirm.tsx → PasswordConfirmProps',
	'components/password-strength/password-strength.tsx → PasswordStrengthProps',
	'components/pdf-viewer/pdf-viewer.tsx → PdfViewerProps',
	'components/popover/popover-content.tsx → PopoverContentProps',
	'components/popover/popover-trigger.tsx → PopoverTriggerProps',
	'components/popover/popover.tsx → PopoverProps',
	'components/progress/progress-bar.tsx → ProgressBarProps',
	'components/progress/progress-gauge.tsx → ProgressGaugeProps',
	'components/resizable/resizable-group.tsx → ResizableGroupProps',
	'components/resizable/resizable-handle.tsx → ResizableHandleProps',
	'components/resizable/resizable-panel.tsx → ResizablePanelProps',
	'components/sheet/sheet.tsx → SheetPanelProps',
	'components/signature-pad/signature-pad.tsx → SignaturePadProps',
	'components/sparkline/sparkline.tsx → SparklineProps',
	'components/stepper/stepper-step.tsx → StepperStepProps',
	'components/table/table.tsx → TableProps',
	'components/timeline/timeline-description.tsx → TimelineDescriptionProps',
	'components/timeline/timeline-item.tsx → TimelineItemProps',
	'components/timeline/timeline-timestamp.tsx → TimelineTimestampProps',
	'components/toast/toast.tsx → ToastProps',
	'components/toolbar/toolbar-group.tsx → ToolbarGroupProps',
	'components/tooltip/tooltip-trigger.tsx → TooltipTriggerProps',
	'components/tree/tree-item.tsx → TreeItemProps',
	'layouts/auth.tsx → AuthLayoutProps',
	'layouts/dashboard.tsx → DashboardLayoutProps',
	'layouts/sidebar/sidebar.tsx → SidebarLayoutHeaderProps',
	'layouts/sidebar/sidebar.tsx → SidebarLayoutProps',
	'modules/chart/choropleth-chart/choropleth-chart.tsx → ChoroplethChartProps',
	'modules/chat/chat-list-item.tsx → ChatListItemProps',
	'modules/chat/chat-list.tsx → ChatListProps',
	'modules/chat/chat-message.tsx → ChatMessageProps',
	'modules/chat/chat-prompt.tsx → ChatPromptProps',
	'modules/chat/chat-transcript.tsx → ChatTranscriptProps',
	'modules/dashboard/dashboard.tsx → DashboardProps',
	'modules/map/map-plat.tsx → MapPlatProps',
	'modules/query/query-chips.tsx → QueryChipsProps',
	'modules/query/query-summary.tsx → QuerySummaryProps',
	'primitives/header-actions/header-actions-slot.tsx → HeaderActionsSlotProps',
	'primitives/panel/panel-trigger.tsx → PanelTriggerProps',
	'primitives/polymorphic/polymorphic-static.tsx → PolymorphicStaticProps',
	'primitives/portal/portal.tsx → PortalProps',
	'primitives/ready-reveal/ready-reveal.tsx → ReadyRevealProps',
	'primitives/select-trigger/select-trigger.tsx → SelectTriggerProps',
	'primitives/virtual-options/virtual-options.tsx → VirtualOptionsProps',
])

/**
 * The barreled props types whose component renders an element but takes no
 * native base, for a reason that holds. Each row gives the reason.
 */
const NO_BASE_EXEMPT = new Map<string, string>([
	[
		'providers/ui/ui-document.tsx → UIDocumentProps',
		'it renders the whole document, `<html>` with its `<head>` and `<body>`, so no one element owns its props',
	],
	[
		'providers/glass/glass.tsx → GlassProviderProps',
		'a provider writes a `display: contents` span only to carry its state to the DOM (CONVENTIONS §3.8)',
	],
	[
		'providers/locale/locale.tsx → LocaleProviderProps',
		'a provider writes a `display: contents` span only to carry its state to the DOM (CONVENTIONS §3.8)',
	],
])

/**
 * The declarations of a key that the native base already gives with the same
 * type and the same optionality, and with no doccomment (CONVENTIONS §4.3).
 * Each letter sweep removes the rows of its own components.
 */
const REDECLARED_BACKLOG = new Set<string>([])

/** The symbol that an import alias names, or the symbol itself. */
function resolved(checker: Checker, symbol: TsSymbol): TsSymbol {
	return symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/**
 * The function of a component: its declaration, the function of a `const`, or
 * the function argument of a wrapper call such as `memo(…)`. A `const` that
 * names another component gives the function of that component.
 */
function componentFunction(project: Project, node: Node | undefined, depth = 0): Node | undefined {
	if (!node || depth > 8) return undefined

	if (isFunctionDeclaration(node) || isFunctionExpression(node) || isArrowFunction(node)) {
		return node
	}

	if (isVariableDeclaration(node)) return componentFunction(project, node.initializer, depth + 1)

	if (isCallExpression(node)) {
		for (const argument of node.arguments) {
			const found = componentFunction(project, argument, depth + 1)

			if (found) return found
		}

		return undefined
	}

	if (isIdentifier(node)) {
		const symbol = project.checker.getSymbolAtLocation(node)

		const declaration =
			symbol && resolved(project.checker, symbol).valueDeclaration?.resolve(project)

		return declaration === node ? undefined : componentFunction(project, declaration, depth + 1)
	}

	return undefined
}

/**
 * Whether the body of `fn` writes an element: a lowercase JSX tag, or a Motion
 * element such as `<m.div>`.
 */
function rendersElement(fn: Node): boolean {
	let found = false

	const visit = (node: Node) => {
		if (found) return

		if (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) {
			const tag = node.tagName

			if (isIdentifier(tag) && /^[a-z]/.test(tag.text)) found = true

			if (
				isPropertyAccessExpression(tag) &&
				isIdentifier(tag.expression) &&
				tag.expression.text === 'm'
			) {
				found = true
			}
		}

		node.forEachChild(visit)
	}

	visit(fn)

	return found
}

/**
 * Each barreled props type whose component writes an element and that takes no
 * `id`, as `<file> → <Name>Props`. A skeleton is out: it mirrors the explicit
 * props of its real component (CONVENTIONS §3.7).
 */
function propsWithNoBase(project: Project): string[] {
	const { program, checker } = project

	const found = new Set<string>()

	for (const barrel of publicBarrels()) {
		const source = program.getSourceFile(barrel)

		const module = source && checker.getSymbolAtLocation(source)

		if (!module) continue

		const exported = checker.getExportsOfModule(module)

		const byName = new Map(exported.map((symbol) => [symbol.name, symbol]))

		for (const symbol of exported) {
			if (!symbol.name.endsWith('Props') || symbol.name.endsWith('SkeletonProps')) continue

			const component = byName.get(symbol.name.slice(0, -'Props'.length))

			if (!component) continue

			const fn = componentFunction(
				project,
				resolved(checker, component).valueDeclaration?.resolve(project),
			)

			if (!fn || !rendersElement(fn)) continue

			const props = resolved(checker, symbol)

			if (checker.getPropertyOfType(checker.getDeclaredTypeOfSymbol(props), 'id')) continue

			const declaration = props.declarations?.[0]?.resolve(project)

			const file = declaration ? srcRelative(declaration.getSourceFile().fileName) : '?'

			found.add(`${file} → ${props.name}`)
		}
	}

	return [...found].sort()
}

/** The operands of an intersection, through parentheses: `A & (B & C)` gives `A`, `B`, `C`. */
function operands(node: TypeNode): TypeNode[] {
	if (isParenthesizedTypeNode(node)) return operands(node.type)

	if (isIntersectionTypeNode(node)) return node.types.flatMap(operands)

	return [node]
}

/** The `ComponentProps<'tag'>` of an operand, through any `Omit<…>` around it. */
function nativeBase(node: TypeNode): TypeReferenceNode | undefined {
	if (!isTypeReferenceNode(node)) return undefined

	const name = node.typeName.getText()

	if (name === 'ComponentProps') return node

	const [inner] = node.typeArguments ?? []

	return name === 'Omit' && inner ? nativeBase(inner) : undefined
}

/**
 * Each key that a props type declares again with the type and the optionality
 * that its native base gives, and with no doccomment, as
 * `<file> → <Type>.<key>`.
 */
function redeclaredKeys(project: Project): string[] {
	const { program, checker } = project

	const found: string[] = []

	const shipped = program
		.getSourceFileNames()
		.filter((file) => file.startsWith(`${srcDir}/`) && !/\/(?:__tests__|docs)\//.test(file))

	for (const file of shipped) {
		const source = program.getSourceFile(file)

		if (!source) continue

		const visit = (node: Node) => {
			if (isTypeAliasDeclaration(node)) {
				const parts = operands(node.type)

				const base = parts.map(nativeBase).find(Boolean)

				const baseType = base && checker.getTypeFromTypeNode(base)

				if (baseType) {
					for (const part of parts) {
						if (!isTypeLiteralNode(part)) continue

						for (const member of part.members) {
							if (!isPropertySignatureDeclaration(member) || member.jsDoc?.length) continue

							const declared = checker.getSymbolAtLocation(member.name)

							const key = declared?.name

							const inherited = key ? checker.getPropertyOfType(baseType, key) : undefined

							if (!declared || !inherited) continue

							const declaredType = checker.getTypeOfSymbol(declared)

							const inheritedType = checker.getTypeOfSymbol(inherited)

							const sameOptional =
								Boolean(declared.flags & SymbolFlags.Optional) ===
								Boolean(inherited.flags & SymbolFlags.Optional)

							if (
								sameOptional &&
								declaredType &&
								inheritedType &&
								checker.isTypeAssignableTo(declaredType, inheritedType) &&
								checker.isTypeAssignableTo(inheritedType, declaredType)
							) {
								found.push(`${srcRelative(file)} → ${node.name.text}.${key}`)
							}
						}
					}
				}
			}

			node.forEachChild(visit)
		}

		visit(source)
	}

	return found.sort()
}

describe('props base boundary: the checker', () => {
	let opened: PublicProject

	let project: Project

	beforeAll(() => {
		opened = openPublicProject('props-base')

		project = opened.project
	})

	afterAll(() => opened?.close())

	it('a barreled props type whose component renders an element takes its native base', () => {
		const found = propsWithNoBase(project)

		const violations = found.filter((row) => !NO_BASE_BACKLOG.has(row) && !NO_BASE_EXEMPT.has(row))

		expect(
			violations,
			`take \`ComponentProps<'tag'>\` of the element that the component renders (CONVENTIONS §4.3):\n  ${violations.join('\n  ')}`,
		).toEqual([])

		const stale = [...NO_BASE_BACKLOG, ...NO_BASE_EXEMPT.keys()].filter(
			(row) => !found.includes(row),
		)

		expect(stale, `rows that no longer apply; remove them:\n  ${stale.join('\n  ')}`).toEqual([])
	})

	it('a props type does not declare again a key that its native base gives', () => {
		const found = redeclaredKeys(project)

		const violations = found.filter((row) => !REDECLARED_BACKLOG.has(row))

		expect(
			violations,
			`remove the key, and its \`Omit\` (CONVENTIONS §4.3):\n  ${violations.join('\n  ')}`,
		).toEqual([])

		const stale = [...REDECLARED_BACKLOG].filter((row) => !found.includes(row))

		expect(stale, `rows that no longer apply; remove them:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
