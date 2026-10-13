# Bug audit — 2026-10-13

Letter sweep I of the `packages/ui` components: `components/icon` and `components/input`. Two scopes, 8 files, 536 lines, 6 claims. 5 findings are rows below, all `low`; 1 claim was refuted. All 3 questions are settled; all 5 rows are open.

## Scope

The area is the two component folders of the letter I. Each scope is one component, because the two share no file and no mechanism. Tests, benchmarks, and the docs tree are out, per §1.2. Wrappers of Input (`password-input`, `search-input`, `combobox-input`, and the rest) are out: they are their own letters, and the verifiers read them only as shipped defaults for reach.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Icon | 2 | 65 | 2 |
| B02 | Input | 6 | 471 | 4 |

This is a letter sweep, not a Clean pass: no lens set and no floor. Every confirmed finding is a row, whatever its severity.

## Method

One sweeper per scope, a blind verifier per scope on the stripped claims, an overturn pass per scope with the sweep evidence, and one merge pass across the two sheets. A script removed the `evidence` field and checked the stripped text for line references before the blind pass; the blind inputs sat in their own files. Every sweeper read every file in its list (2/2, 6/6). The digest was empty: no open record covers icon or input, the ledger rows for `icon` and `input` are "Not started" with empty "Known, not chasing" cells, and no open pull request touches either folder.

Two notes on the passes. The B01 overturn verifier ran one grep over all of `packages/ui/src`, which printed one line of a benchmark path (`__benchmarks__/browser/icon-mount.bench.tsx`); it did not open the file, and later greps excluded the tree. `node_modules` was not installed in the audit checkout, so no verifier read the lucide-react sources; neither Icon claim depends on them.

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 2 scopes | 6 claims, 0 leads |
| Verify | 6 stripped claims | 5 confirmed (all low), 1 refuted (B02-C01) |
| Overturn | 2 sheets plus evidence | no verdict, severity, or reach changed; S3 gained a constraint on the `data-slot` order |
| Merge | 2 sheets | 2 groups, 5 steps, 3 questions |
| Settle | 3 answers | S2 becomes a TSDoc change; S4 drops `clearable &&` from the reset gate; S5 stays in `input-frame.tsx` |

## Findings

5 rows: 0 high, 0 medium, 5 low. Reach: all `none`. No consumer root and no shipped default constructs any trigger; each row is a gap between the code and its own contract.

`◯ OPEN` waits on a question or a fix. `◐ FIXED` is fixed on a branch. `✅ RESOLVED` cites the merged pull request.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | `components/icon/icon.tsx` | `Icon` label branch | CONFIRMED | low | none | G1 | ◯ OPEN |
| R2 | `components/icon/icon.tsx` | `Icon` numeric `size` | CONFIRMED | low | none | G1 | ◯ OPEN |
| R3 | `components/input/input.tsx` | `Input` spread order | CONFIRMED | low | none | G2 | ◯ OPEN |
| R4 | `components/input/input.tsx` | `Input` `ownFilled` | CONFIRMED | low | none | G2 | ◯ OPEN |
| R5 | `components/input/input-frame.tsx` | `InputFrame` present test | CONFIRMED | low | none | — | ◯ OPEN |

All paths are under `packages/ui/src/`.

## Mechanisms

**R1 (B01-C01).** File: `components/icon/icon.tsx`. Mechanism: `cloneElement` merges the props of Icon over the props of the element, and the label branch writes no `aria-hidden` key: `icon.tsx:47` `...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }),`. An `aria-hidden` already on the element survives beside `role="img"`. The decorative branch overwrites the key, so only the label branch is open. Trigger: `<Icon icon={<SearchIcon aria-hidden="true" />} label="Search" />`, or a wrapper that sets `aria-hidden` on its element. Assistive technology does not announce the icon. Documented intent: `icon.tsx:27-29` "When set, the icon is exposed to assistive technology as `role="img"` with this label instead of being hidden."; `__tests__/components/icon.test.tsx:39` `expect(el).not.toHaveAttribute('aria-hidden')` (with a bare `<svg />`). Reach: none. Every shipped `<Icon` passes no `label`; the one `label=` site is test-only, `__tests__/a11y/cases/data-display.tsx:546` `<Icon key="ic" icon={<svg />} label="Information" />`, and its element has no `aria-hidden`. Severity: low; the cost would be medium, but no shipped surface constructs the trigger. Prior art: NONE.

**R2 (B01-C02).** File: `components/icon/icon.tsx`. Mechanism: a numeric size goes into inline style, and the ramp class drops: `icon.tsx:44` `const isNumeric = typeof size === 'number'`, `icon.tsx:52` `!isNumeric && k.ramp,`, `icon.tsx:56-61` `...(isNumeric && { style: { ...(icon.props as { style?: CSSProperties }).style, width: size, height: size, }, }),`. The host projections are plain class rules: `recipes/kiso/dan/size.ts:31` `slot: '*:data-[slot=icon]:density-size-[4,4.5,5,5.5,6]',` and `recipes/kiso/shaku/icon.ts:36` `md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',`. An inline declaration beats every rule that is not important, so no host can set or override a numeric size. Trigger: `size={14}` on an Icon inside a Button, Badge, Nav, a menu or option row, or CommandPalette. Documented intent: `icon.tsx:16` "A density step, or a size in pixels."; `icon.tsx:19-20` "Inside such a host, the `data-slot=icon` projection sets the size, and it can override this." Reach: none inside a host. The one numeric site in the roots is standalone: `docs/pages/components/icon/custom-size.tsx:5` `return <Icon icon={<Star />} size={32} />`. Shipped components pass steps only (`file-upload-drop.tsx:34` `size="lg"`). Severity: low. Prior art: NONE.

**R3 (B02-C02).** File: `components/input/input.tsx`. Mechanism: `{...rest}` spreads after the resolved wiring: `input.tsx:144` `{...field.attrs}`, then `input.tsx:147` `{...rest}`. Input takes `id`, `name`, `value`, `defaultValue`, `onChange`, `onBlur`, `disabled`, `required`, `readOnly`, `autoComplete`, `aria-describedby`, and `invalid` out of its props, so only the validation keys can sit in both: `core/invalid-attrs.ts:1` `{ 'data-invalid': '', 'aria-invalid': true }` and the `data-warning` and `data-valid` keys of `core/validation-attrs.ts`. Trigger: `<Control severity="error"><Input aria-invalid={false} /></Control>`. The control reads not-invalid to assistive technology while the field has errors; a stray `data-invalid` paints an error ring on a valid control. Documented intent: `CONVENTIONS.md` §3.9 "The load-bearing structural attributes come after `{...props}`: … and the resolved wiring of the §7.2 cascade. Then a stray prop cannot … clobber a bound field." The reference orders it the other way: `switch.tsx:126` `{...props}` before `switch.tsx:140` `{...validation}`. Reach: none. No root passes a validation key to Input. The one wrapper that does, `password-confirm-repeat.tsx:54` `{...(showWarning ? { 'data-warning': true } : {})}`, never collides (see Ruled out). Severity: low. Prior art: NONE.

**R4 (B02-C03).** File: `components/input/input.tsx`. Mechanism: `ownFilled` follows edits only while `clearable` holds. `input.tsx:121` `const [ownFilled, setOwnFilled] = useState(() => \`${defaultValue ?? ''}\` !== '')`; `input.tsx:125` `const filled = uncontrolled ? ownFilled : \`${field.attrs.value}\` !== ''`; `input.tsx:131-137` calls `setOwnFilled` only in the clearable branch, and the other branch is `: field.attrs.onChange`; `input.tsx:129` `useFormResetSync(inputRef, clearable && uncontrolled, ...)`. Trigger: an uncontrolled, unbound `<Input defaultValue="" clearable={flag} />`; type "abc" while `flag` is false, then set it true. The clear button stays hidden over "abc". The reverse case shows the button on an empty input. Documented intent: `input.tsx:31` "Shows a clear button in the suffix while the input holds a value."; `input.tsx:119-120` "An uncontrolled input keeps its value in the element, so the clear button follows each edit to know when the input is empty." Reach: none. The one wrapper that toggles `clearable` is controlled: `search-input.tsx:130` `clearable={clearable && !loading}` with `search-input.tsx:124` `value={current ?? ''}`; `date-input.tsx:277` is controlled too. Severity: low. Prior art: NONE.

**R5 (B02-C04).** File: `components/input/input-frame.tsx`. Mechanism: the present test passes an empty string: `input-frame.tsx:39` `const hasPrefix = prefix != null && prefix !== false`, `input-frame.tsx:41` `const hasSuffix = suffix != null && suffix !== false`. The frame then takes `hasAffix && k.frame` (`input-frame.tsx:50`) and renders a slot span whose recipe pads it (`recipes/kiso/control/affix.ts:91` `dan.space.affix.suffix,`). Trigger: `<Input suffix={unit} />` with `unit === ''`. Blank padding shows in the field. Documented intent: `input-frame.tsx:23-26` names null, false, and `0` only; `__tests__/components/input.test.tsx:26` "treats a null/false affix as absent, and renders a 0 affix". Nothing makes `''` present on purpose. Reach: none. Every affix in the roots is a node; `currency-input.tsx:79` wraps the symbol in a span, and `tag-input.tsx:271-272` gives `undefined` with no tags. Severity: low. Prior art: NONE.

## Root-cause groups

- **G1:** both defects sit in the props object that `Icon` hands to `cloneElement` (`icon.tsx:46`); each branch writes a part of the element without accounting for what the element or a host already sets. Members: R1, R2. Two steps, because R1 is ungated and R2 waits on Q1.
- **G2:** both defects sit in how `Input` builds the props of its `<input>`; R3's spread order and R4's change handler meet on one JSX element (`input.tsx:145` `onChange={handleChange}` sits between the two spreads). Members: R3, R4. Two steps, because R3 is ungated and R4 waits on Q2.

## Recommended resolution

- **S1.** Change: the label branch also writes `'aria-hidden': undefined`. Rows closed: R1. Files: `components/icon/icon.tsx`, `__tests__/components/icon.test.tsx`. Order: 1. Depends on: none. Gate: none. Test seam: a synchronous render of `icon={<svg aria-hidden="true" />}` with a `label`.
- **S2.** Change: rewrite the `size` TSDoc of `Icon` so it names the exception: a pixel size is an explicit caller override, written as inline `width` and `height`, and it wins over a host projection; only a step `size` stays overridable by the host. No code change; `__tests__/components/icon.test.tsx:42-47` "applies numeric size as inline style" already pins the behavior. The surface index entry (`packages/ui/docs/COMPONENTS.md` `` `icon` ``) holds the bare unit name, so it needs no edit (§12.2 asks for one only when an export is added, removed, or renamed). Rows closed: R2, against the pull request that carries the TSDoc. Files: `components/icon/icon.tsx`. Order: after S1. Depends on: S1 (shared file). Gate: none (Q1 settled). Test seam: none needed.
- **S3.** Change: move `{...rest}` after `data-slot="input"` and before `{...field.attrs}`; keep `className` merged through `cn`. `rest` must stay after `data-slot`, because the wrappers set their own slot through it (`combobox-input.tsx:167` `data-slot="combobox-input"`, and `password-input`, `search-input`, `number-input`, `mask-input`, `currency-input`, `date-input`, the credit-card inputs, the color inputs, `command-palette`). Rows closed: R3. Files: `components/input/input.tsx`, `__tests__/components/input.test.tsx`. Order: 1 in the input chain. Depends on: none. Gate: none. Test seam: `<Control severity="error"><Input aria-invalid={false} /></Control>` keeps `aria-invalid="true"`; a wrapper's `data-slot` still wins.
- **S4.** Change: the change handler tracks `ownFilled` whenever the input is uncontrolled (`uncontrolled ? (event) => { field.attrs.onChange?.(event); setOwnFilled(event.target.value !== '') } : field.attrs.onChange`), and the reset sync gate drops `clearable &&` to `useFormResetSync(inputRef, uncontrolled, ...)`. The gate change is needed: with `clearable` off, type, reset the form, then turn `clearable` on, and the old gate leaves the button over an empty input. Reword the two comments that tie tracking to `clearable`. Side effect: a controlled `clearable` Input with no `onChange` and no `readOnly` no longer hides React's read-only warning. Rows closed: R4. Files: `components/input/input.tsx`, `__tests__/components/input.test.tsx`. Order: after S3. Depends on: S3 (same JSX element). Gate: none (Q2 settled). Test seam: `user.type` with `clearable={false}`, then `rerender` with `clearable`; and the reset path, after the pattern of the reset test with `await act(() => new Promise(requestAnimationFrame))`.
- **S5.** Change: the present test of `InputFrame` adds `&& prefix !== ''` and `&& suffix !== ''`, and its `@internal` TSDoc names `''` beside null and false. `input.tsx` needs no edit: its own merge test hands `''` to the frame when there is no clear button, and a fragment renders `''` as nothing when there is one. Rows closed: R5. Files: `components/input/input-frame.tsx`, `__tests__/components/input.test.tsx`. Order: after S4. Depends on: none in code; shares `input.test.tsx`. Gate: none (Q3 settled). Test seam: extend "treats a null/false affix as absent, and renders a 0 affix" with `suffix=""`.

The icon chain (S1, S2) and the input chain (S3, S4, S5) share no file and can run in parallel.

## Open questions

- **Q1 (S2).** Should a host `data-slot=icon` projection override a numeric `size`? (a) Yes: S2 changes the code, and the TSDoc at `icon.tsx:19-20` stays true. (b) No, a numeric size is an escape hatch: the code stays, S2 drops, and the TSDoc must name the exception.
  Answer (Charlie, 2026-10-13): no, escape hatch. "A pixel size is an explicit caller override and wins over the host. The code stays. S2 becomes a TSDoc fix that names the exception."
- **Q2 (S4).** How does `ownFilled` follow edits while `clearable` is off? (A) Call `setOwnFilled` on every change of an uncontrolled input: one batched state update per keystroke on every uncontrolled Input. (B) Read `inputRef.current.value` in a layout effect when `clearable` turns on: no work per keystroke, covers only the toggle. Either answer also decides the `clearable && uncontrolled` gate of `useFormResetSync`.
  Answer (Charlie, 2026-10-13): track every change. "Call setOwnFilled on each change of an uncontrolled Input. … the useFormResetSync gate can drop its `clearable &&` term."
- **Q3 (S5).** What is an absent affix? Axis 1: `''` only, or also empty arrays and empty fragments. Axis 2: must the other `ControlFrame` consumers share the definition? Yes on axis 2 widens S5 past `input-frame.tsx`.
  Answer (Charlie, 2026-10-13): `''` only, InputFrame. "Add '' to the present test in input-frame.tsx only."

## Ruled out

- **B02-C01.** An explicit `invalid={false}` drops a bound or ambient error and the warning and success rings (`use-input-control.ts:98` `...(invalid === undefined ? shared.validation : invalidAttrs(invalid)),`). Deliberate: `input.tsx:44` "Forces the invalid state. When omitted, inherits from Control / Form context."; `use-input-control.ts:45-47` "An explicit `invalid` sets the validation state on or off. When `invalid` is omitted, the state comes from the bound field and the Control cascade, which includes a warning or success severity of a Field."; `textarea.tsx:65-66` "… as on Input."; `__tests__/components/textarea.test.tsx:201` "lets `invalid={false}` win over an error from the enclosing Control"; `password-confirm-repeat.tsx:56-57` "A caller-supplied `invalid` still wins." The one disagreeing source is the `@remarks` at `input.tsx:66` (see below).
- **R3, reach through PasswordConfirmRepeat.** Guard: `password-confirm-repeat.tsx:57` `invalid={invalid ?? (showWarning || undefined)}`. `data-warning` goes in only when `invalid` resolves true, so `field.attrs` then holds no `data-warning` to overwrite.

## Surfaced, not judged

- Verifier B02: the `@remarks` at `input.tsx:66` "`invalid` OR's the prop, the bound field, and any ambient Control error." contradicts the force contract the code, the prop TSDoc, and the Textarea test follow.
- Verifier B02: `components/textarea/textarea.tsx:121` `{...field.attrs}` comes before `textarea.tsx:132` `{...rest}`, the same §3.9 order as R3. Route to the T sweep.
- Verifier B02: probe that no `rest` key a wrapper passes to Input (`combobox-input.tsx:148-169`) is also a key of `field.attrs` once S3 lands.
- Verifier B02 overturn: `password-confirm-repeat.tsx:54` and `:57` stamp `data-warning` and `data-invalid` on one input, against `use-control-props.ts:69-70` "The three validation rings therefore stay mutually exclusive."; the comment at `:55-56` says it is intended.
- Verifier B01: for a step `size`, whether a host projection beats Icon's own `k.ramp` class is unchecked; it decides whether `icon.tsx:19-20` holds for steps.
- Verifier B01: the label branch passes other inherited attributes (`aria-describedby`, `title`) through unchecked.
- Verifier B01: lucide-react's own `aria-hidden` default is unverified, because `node_modules` was absent.
- Verifier B01 overturn: Icon drops undeclared props without notice. `components/breadcrumb/breadcrumb-separator.tsx:17` passes `aria-hidden="true"` (dead, as the decorative branch writes it), and `__tests__/browser/geometry/nav-density.test.tsx:29` passes `aria-label="Add"`, which leaves that test icon hidden and unnamed.
- Merge pass: `input-clear-button.tsx:39` `<Icon icon={<X />} />` puts Icon's decorative branch inside Input; no step changes that branch.
- Settle pass: after S5, the merge test at `input.tsx:168` (`clear && suffix != null && suffix !== false`) still counts `''` as present, against "One definition of 'present'" at `input-frame.tsx:23-24`; no visible result.
- Settle pass: `ownFilled` keeps a stale value if an Input switches from controlled to uncontrolled; React warns on that switch already.
