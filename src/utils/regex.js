/**
 * Test a regex pattern against a string and return all matches.
 * @param {string} pattern - The regex pattern (without delimiters)
 * @param {string} flags - The regex flags (e.g. 'gi')
 * @param {string} testString - The string to test against
 * @returns {{ matches: Array<{match: string, index: number, groups: object|null}>, error: string }}
 */
export function testRegex(pattern, flags, testString) {
  if (!pattern) return { matches: [], error: '' }

  let regex
  try {
    regex = new RegExp(pattern, flags)
  } catch (e) {
    return { matches: [], error: e.message }
  }

  if (!testString) return { matches: [], error: '' }

  const matches = []

  if (flags.includes('g')) {
    let m
    while ((m = regex.exec(testString)) !== null) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: extractGroups(m),
      })
      if (m[0].length === 0) regex.lastIndex++
    }
  } else {
    const m = regex.exec(testString)
    if (m) {
      matches.push({
        match: m[0],
        index: m.index,
        groups: extractGroups(m),
      })
    }
  }

  return { matches, error: '' }
}

function extractGroups(matchResult) {
  const groups = {}
  let hasGroups = false

  if (matchResult.groups) {
    Object.assign(groups, matchResult.groups)
    hasGroups = true
  }

  for (let i = 1; i < matchResult.length; i++) {
    if (matchResult[i] !== undefined) {
      groups[i] = matchResult[i]
      hasGroups = true
    }
  }

  return hasGroups ? groups : null
}

/**
 * Build an array of text segments from the test string, marking matched regions.
 * @param {string} testString
 * @param {Array<{match: string, index: number}>} matches
 * @returns {Array<{text: string, isMatch: boolean, matchIndex: number}>}
 */
export function buildHighlightedSegments(testString, matches) {
  if (!matches.length) {
    return testString ? [{ text: testString, isMatch: false, matchIndex: -1 }] : []
  }

  const segments = []
  let cursor = 0

  for (let i = 0; i < matches.length; i++) {
    const { match, index } = matches[i]
    if (index > cursor) {
      segments.push({ text: testString.slice(cursor, index), isMatch: false, matchIndex: -1 })
    }
    segments.push({ text: match, isMatch: true, matchIndex: i })
    cursor = index + match.length
  }

  if (cursor < testString.length) {
    segments.push({ text: testString.slice(cursor), isMatch: false, matchIndex: -1 })
  }

  return segments
}

export const commonPatterns = [
  {
    label: '邮箱',
    pattern: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b',
    flags: { g: true },
    sample: '联系我们：admin@example.com 或 support@test.org，也可发至 dev@company.co.jp',
  },
  {
    label: '手机号',
    pattern: '1[3-9]\\d{9}',
    flags: { g: true },
    sample: '张三：13800138000，李四：15912345678，座机：010-88888888 不是手机',
  },
  {
    label: 'URL',
    pattern: 'https?://[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=%]+',
    flags: { g: true },
    sample: '访问 https://www.example.com/path?q=hello 或 http://api.test.org:8080/v1/users 获取数据',
  },
  {
    label: 'IP 地址',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: { g: true },
    sample: '服务器 A：192.168.1.100，服务器 B：10.0.0.1，DNS：8.8.8.8',
  },
  {
    label: '日期',
    pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}',
    flags: { g: true },
    sample: '创建于 2024-01-15，更新于 2024/06/20，截止 2025-12-31',
  },
  {
    label: '身份证',
    pattern: '\\b\\d{17}[\\dXx]\\b',
    flags: { g: true },
    sample: '张三：110101199003076543，李四：44030519881212001X',
  },
  {
    label: '中文',
    pattern: '[\\u4e00-\\u9fff]+',
    flags: { g: true },
    sample: 'Hello 你好，this is 一个 mixed 字符串 with 中文 and English。',
  },
  {
    label: 'HTML 标签',
    pattern: '<[^>]+>',
    flags: { g: true },
    sample: '<div class="container"><h1>标题</h1><p>段落内容</p><br/></div>',
  },
  {
    label: '十六进制颜色',
    pattern: '#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\\b',
    flags: { g: true },
    sample: '主色 #1a2b3c，强调色 #f00，背景 #ffffff，透明 #00000000',
  },
  {
    label: '数字',
    pattern: '-?\\d+(?:\\.\\d+)?',
    flags: { g: true },
    sample: '温度 -3.5°C，价格 99.8 元，数量 100，比例 0.618',
  },
  {
    label: '英文单词',
    pattern: '\\b[a-zA-Z]+\\b',
    flags: { g: true },
    sample: 'Hello world! This is a test123 and regex demo.',
  },
  {
    label: '邮编',
    pattern: '\\b[1-9]\\d{5}\\b',
    flags: { g: true },
    sample: '北京 100000，上海 200000，广州 510000，深圳 518000',
  },
  {
    label: '车牌号',
    pattern: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-Z][A-HJ-NP-Z0-9]{5}[A-HJ-NP-Z0-9挂学警港澳]?',
    flags: { g: true },
    sample: '京A12345，粤B12345D，沪C67890，川D99999警',
  },
  {
    label: '银行卡号',
    pattern: '\\b\\d{16,19}\\b',
    flags: { g: true },
    sample: '卡号1：6222021234567890123，卡号2：6217001234567890，卡号3：6228481234567890123',
  },
  {
    label: 'IPv6',
    pattern: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|:(:[0-9a-fA-F]{1,4}){1,7}|[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}|(?:[0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|(?:[0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}',
    flags: { g: true },
    sample: '本地回环 ::1，公网 2001:0db8:85a3:0000:0000:8a2e:0370:7334，简写 fe80::1',
  },
  {
    label: '密码强度',
    pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[\\s\\S]{8,}',
    flags: {},
    sample: '弱密码：12345678\n中等：abcdefgh\n强密码：Abc12345\n最强：Abc@12345',
  },
]

/**
 * Build a flags string from a flags object.
 * @param {{ g?: boolean, i?: boolean, m?: boolean, s?: boolean }} flagsObj
 * @returns {string}
 */
export function flagsToString(flagsObj) {
  return Object.entries(flagsObj).filter(([, v]) => v).map(([k]) => k).join('')
}
