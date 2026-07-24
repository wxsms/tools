 
// One-shot script: replace @heroicons/vue with @iconify/vue in all .vue files.
// Run: node scripts/replace-heroicons.cjs
const fs = require('fs')
const path = require('path')

const HEROICON_TO_LUCIDE = {
  ArrowDownTrayIcon: 'download',
  ArrowPathIcon: 'refresh-cw',
  ArrowsRightLeftIcon: 'arrow-left-right',
  ArrowsUpDownIcon: 'arrow-up-down',
  Bars3Icon: 'menu',
  CheckIcon: 'check',
  ClipboardDocumentIcon: 'clipboard',
  EyeDropperIcon: 'pipette',
  InformationCircleIcon: 'info',
  MagnifyingGlassIcon: 'search',
  MoonIcon: 'moon',
  PlayIcon: 'play',
  PlusIcon: 'plus',
  SparklesIcon: 'sparkles',
  SunIcon: 'sun',
  TrashIcon: 'trash-2',
  WrenchScrewdriverIcon: 'wrench',
  XMarkIcon: 'x',
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

// Match `import { ... } from '@heroicons/vue/24/outline'` (single or multi-line)
const HEROICON_IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*['"]@heroicons\/vue\/24\/outline['"]\s*;?/g

function processFile(file) {
  let src = fs.readFileSync(file, 'utf-8')
  let changed = false
  const replacedNames = new Set()

  src = src.replace(HEROICON_IMPORT_RE, (full, names) => {
    const list = names.split(',').map(s => s.trim()).filter(Boolean)
    for (const name of list) {
      if (!HEROICON_TO_LUCIDE[name]) {
        console.warn(`[${path.relative(SRC_DIR, file)}] unknown icon: ${name}`)
        continue
      }
      replacedNames.add(name)
    }
    changed = true
    return '' // remove the import; we'll add Icon import below if needed
  })

  if (!changed) return false

  // Replace template usages: <XxxIcon ... /> -> <Icon icon="lucide:xxx" ... />
  for (const name of replacedNames) {
    const lucide = HEROICON_TO_LUCIDE[name]
    // Match <XxxIcon followed by space, /, or >
    const re = new RegExp(`<${name}(\\s|/|>)`, 'g')
    src = src.replace(re, `<Icon icon="lucide:${lucide}"$1`)
  }

  // Add `import { Icon } from '@iconify/vue'` if not present
  if (!/from\s*['"]@iconify\/vue['"]/.test(src)) {
    // Insert after the first import line in <script setup> or at top of script
    const scriptMatch = src.match(/<script setup>\n/)
    if (scriptMatch) {
      const insertAt = scriptMatch.index + scriptMatch[0].length
      src = src.slice(0, insertAt) +
        "import { Icon } from '@iconify/vue'\n" +
        src.slice(insertAt)
    } else {
      console.warn(`[${path.relative(SRC_DIR, file)}] no <script setup> found, skipping Icon import`)
    }
  }

  // Clean up: remove up to 2 consecutive blank lines that the removed import may have left
  src = src.replace(/\n{3,}/g, '\n\n')

  fs.writeFileSync(file, src, 'utf-8')
  return true
}

const files = walk(SRC_DIR)
let touched = 0
for (const f of files) {
  if (processFile(f)) touched++
}
console.log(`Processed ${files.length} .vue files, modified ${touched}`)
