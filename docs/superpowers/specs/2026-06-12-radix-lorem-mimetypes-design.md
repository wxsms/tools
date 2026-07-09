# New Tools Design: Radix, Lorem, MimeTypes

Three new tools for wxsm's Kit, covering number base conversion, placeholder text generation, and MIME type lookup.

## Tool 1: Radix (数字进制转换)

**Route:** `/radix`
**View:** `src/views/Radix.vue`
**Sidebar group:** 编码转换

### Interaction

Follows the Case tool pattern — single input at top, multiple result rows below, each with copy button.

**Layout:**

1. Input area: text input + radio buttons for input base (BIN/OCT/DEC/HEX, default DEC)
2. Standard results: four rows showing BIN, OCT, DEC, HEX — each `input[readonly]` + copy button
3. Advanced section: collapsible panel with a number input (2-36) for target base, showing conversion result

### Behavior

- Real-time conversion on input
- Input validation: invalid digits for selected base show error state (e.g. "2" in BIN mode)
- Integer-only conversion for non-decimal bases; if decimal input has fractional part, convert integer part only and show a note
- Large number handling: if value exceeds `Number.MAX_SAFE_INTEGER`, show a warning badge
- Clear button resets all fields
- Copy button per result row (same pattern as Case.vue)

### Technical notes

- Use `parseInt(str, fromBase).toString(toBase)` for conversion
- For the advanced section, validate target base is 2-36
- No external dependencies needed

---

## Tool 2: Lorem (占位文本生成)

**Route:** `/lorem`
**View:** `src/views/Lorem.vue`
**Sidebar group:** 生成转换

### Interaction

Configuration panel on top, preview area below with copy button.

**Layout:**

1. Language toggle: 中文 / English (radio or tab)
2. Paragraph count: range slider or number input (1-20, default 3)
3. Sentences per paragraph: range or number input (2-8, default 3-5)
4. Generate button
5. Preview area: textarea or div showing generated text, with copy button

### Behavior

- Click generate (or auto-generate on config change? — manual button, consistent with Password/UUID tools)
- Chinese text pool: sentences curated from common programming/writing contexts, mixed length
- English text pool: standard Lorem Ipsum word list
- Each generation is random — clicking generate again produces new text
- Copy button copies all generated text

### Technical notes

- Chinese text: array of ~50 sentences, randomly pick and combine into paragraphs
- English text: standard Lorem Ipsum word list, generate sentences of target length
- No external dependencies needed

---

## Tool 3: MimeTypes (MIME 类型速查)

**Route:** `/mime-types`
**View:** `src/views/MimeTypes.vue`
**Sidebar group:** 网络

### Interaction

Reuses the HttpStatus tool pattern — left list with search + right detail panel (desktop), inline expansion (mobile).

**Layout:**

1. Search input at top
2. Left panel: MIME types grouped by category (application, audio, font, image, message, model, multipart, text, video)
3. Each group: collapsible section with chevron, group name + count badge
4. Each item row: MIME type (monospace badge) + primary extension + short description
5. Right panel (desktop only): detail card showing MIME type, all associated extensions, description
6. Mobile: inline expansion on tap

### Behavior

- Search filters by MIME type string, extension, or description
- Hover on item (desktop) or tap (mobile) shows detail
- Groups auto-expand when search is active; collapsible when no search
- ~200 common MIME types covering all major categories

### Data structure

```js
{ type: 'application/pdf', exts: ['pdf'], desc: 'PDF 文档' }
```

Grouped by the prefix before `/`.

### Technical notes

- MIME data as a static array in the component (like STATUS_CODES in HttpStatus.vue)
- No external dependencies or API calls needed
- Reuse the same collapsible group + detail panel pattern from HttpStatus.vue

---

## Implementation Order

1. Radix — simplest, follows Case pattern closely
2. Lorem — moderate, needs text pool curation
3. MimeTypes — most work (data entry), follows HttpStatus pattern

## Sidebar Entries

All three need:
1. View file in `src/views/`
2. Route in `src/router.js`
3. Entry in `src/tools.js` with icon from `@heroicons/vue/24/outline`

### Icon selections

- Radix: `CalculatorIcon` (math/number association)
- Lorem: `DocumentTextIcon` — already used by Markdown. Alternative: `LanguageIcon` — already used by Unicode. Use `Bars3Icon`? No. Use `QueueListIcon` (list of text lines)
- MimeTypes: `DocumentIcon` or `CubeIcon` — better: `TagIcon` (type labeling)

Final icon choices to confirm during implementation based on what's available and not already used.
