import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as yamlLoad } from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const YAML_PATH = resolve(ROOT, 'src/tools/kv-cache/models.yaml')
const JSON_PATH = resolve(ROOT, 'src/tools/kv-cache/models.json')

export function buildModelsJson() {
  if (!existsSync(YAML_PATH)) {
    throw new Error(`models.yaml not found at ${YAML_PATH}`)
  }
  const text = readFileSync(YAML_PATH, 'utf8')
  const data = yamlLoad(text)
  const json = JSON.stringify(data, null, 2) + '\n'
  let existing = ''
  if (existsSync(JSON_PATH)) {
    existing = readFileSync(JSON_PATH, 'utf8')
  }
  if (existing === json) {
    return { changed: false, path: JSON_PATH }
  }
  writeFileSync(JSON_PATH, json, 'utf8')
  return { changed: true, path: JSON_PATH }
}

// Run directly: node scripts/build-models-json.mjs
import { fileURLToPath as _fileURLToPath } from 'node:url'
const isMain = process.argv[1] && _fileURLToPath(import.meta.url) === _fileURLToPath(`file://${process.argv[1].replace(/\\/g, '/')}`)
if (isMain) {
  const result = buildModelsJson()
  console.log(result.changed ? `Wrote ${result.path}` : `Up to date: ${result.path}`)
}
