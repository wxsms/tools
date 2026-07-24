 
// One-shot fix-up script: run AFTER replace-heroicons.cjs to handle
// (1) 6 icons missing from the first pass mapping
// (2) adding missing `import { Icon } from '@iconify/vue'` (CRLF broke the first pass)
const fs = require('fs')
const path = require('path')

const EXTRA = {
  DocumentTextIcon: 'file-text',
  ArrowUpTrayIcon: 'upload',
  ArrowLeftIcon: 'arrow-left',
  ChevronDownIcon: 'chevron-down',
  ArrowDownIcon: 'arrow-down',
  ArrowsPointingInIcon: 'minimize-2',
}

const SRC_DIR = path.resolve(__dirname, '..', 'src')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf-8')
  let changed = false

  // Replace leftover <XxxIcon ...> in templates
  for (const [name, lucide] of Object.entries(EXTRA)) {
    const re = new RegExp(`<${name}(\\s|/|>)`, 'g')
    const before = src
    src = src.replace(re, `<Icon icon="lucide:${lucide}"$1`)
    if (src !== before) changed = true
  }

  // If template uses <Icon but no @iconify/vue import, add it
  const usesIcon = /<Icon[\s>]/.test(src)
  const hasImport = /from\s*['"]@iconify\/vue['"]/.test(src)
  if (usesIcon && !hasImport) {
    // Insert right after <script setup> (CRLF or LF)
    const scriptMatch = src.match(/<script setup>\r?\n/)
    if (scriptMatch) {
      const insertAt = scriptMatch.index + scriptMatch[0].length
      src = src.slice(0, insertAt) +
        "import { Icon } from '@iconify/vue'\n" +
        src.slice(insertAt)
      changed = true
    } else {
      console.warn(`[${path.relative(SRC_DIR, file)}] no <script setup> found, cannot add Icon import`)
    }
  }

  if (changed) {
    fs.writeFileSync(file, src, 'utf-8')
    return true
  }
  return false
}

const files = walk(SRC_DIR)
let touched = 0
for (const f of files) {
  if (processFile(f)) touched++
}
console.log(`Processed ${files.length} .vue files, modified ${touched}`)
