import { describe, it, expect } from 'vitest'
import { buildSearchIndex } from './search.js'
import { toolGroups } from '../tools.js'

describe('buildSearchIndex', () => {
  const index = buildSearchIndex(toolGroups)

  it('returns one entry per tool across all groups', () => {
    const totalTools = toolGroups.reduce((sum, g) => sum + g.tools.length, 0)
    expect(index).toHaveLength(totalTools)
  })

  it('each entry has name, desc, path, groupName, icon', () => {
    for (const entry of index) {
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('desc')
      expect(entry).toHaveProperty('path')
      expect(entry).toHaveProperty('groupName')
      expect(entry).toHaveProperty('icon')
    }
  })

  it('preserves order: first entry is the first tool of the first group', () => {
    expect(index[0].name).toBe(toolGroups[0].tools[0].name)
    expect(index[0].groupName).toBe(toolGroups[0].name)
  })

  it('preserves order: last entry is the last tool of the last group', () => {
    const lastGroup = toolGroups[toolGroups.length - 1]
    const lastTool = lastGroup.tools[lastGroup.tools.length - 1]
    expect(index[index.length - 1].name).toBe(lastTool.name)
    expect(index[index.length - 1].groupName).toBe(lastGroup.name)
  })
})
