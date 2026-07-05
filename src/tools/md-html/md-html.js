export function htmlToMarkdown(htmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlStr, 'text/html')
  return nodeToMd(doc.body).trim()
}

function nodeToMd(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const tag = node.tagName.toLowerCase()
  const children = Array.from(node.childNodes).map(nodeToMd).join('')

  switch (tag) {
    case 'h1': return `# ${children.trim()}\n\n`
    case 'h2': return `## ${children.trim()}\n\n`
    case 'h3': return `### ${children.trim()}\n\n`
    case 'h4': return `#### ${children.trim()}\n\n`
    case 'h5': return `##### ${children.trim()}\n\n`
    case 'h6': return `###### ${children.trim()}\n\n`
    case 'p': return `${children.trim()}\n\n`
    case 'strong': case 'b': return `**${children}**`
    case 'em': case 'i': return `*${children}*`
    case 'del': case 's': return `~~${children}~~`
    case 'code': {
      if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') return children
      return `\`${children}\``
    }
    case 'pre': {
      const codeEl = node.querySelector('code')
      const lang = codeEl?.className?.replace('language-', '') || ''
      const code = codeEl ? codeEl.textContent : node.textContent
      return `\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`
    }
    case 'a': return `[${children}](${node.getAttribute('href') || ''})`
    case 'img': return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`
    case 'ul': {
      const items = Array.from(node.children)
        .map(li => `- ${nodeToMd(li).trim()}`)
        .join('\n')
      return `${items}\n\n`
    }
    case 'ol': {
      const items = Array.from(node.children)
        .map((li, i) => `${i + 1}. ${nodeToMd(li).trim()}`)
        .join('\n')
      return `${items}\n\n`
    }
    case 'li': return children
    case 'blockquote': {
      const lines = children.trim().split('\n')
      return lines.map(l => `> ${l}`).join('\n') + '\n\n'
    }
    case 'hr': return '---\n\n'
    case 'br': return '\n'
    case 'table': return convertTable(node)
    case 'div': case 'span': case 'section': case 'article': case 'main': case 'header': case 'footer': case 'nav':
      return children
    default: return children
  }
}

function convertTable(tableNode) {
  const rows = Array.from(tableNode.querySelectorAll('tr'))
  if (!rows.length) return ''

  const parseRow = (tr) => Array.from(tr.querySelectorAll('th, td')).map(cell => nodeToMd(cell).trim())

  const headerCells = parseRow(rows[0])
  const colCount = headerCells.length
  const separator = '|' + headerCells.map(() => '----------|').join('')
  const headerLine = '| ' + headerCells.join(' | ') + ' |'

  const bodyLines = rows.slice(1).map(row => {
    const cells = parseRow(row)
    while (cells.length < colCount) cells.push('')
    return '| ' + cells.slice(0, colCount).join(' | ') + ' |'
  })

  return `${headerLine}\n${separator}\n${bodyLines.join('\n')}\n\n`
}
