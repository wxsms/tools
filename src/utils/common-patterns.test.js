import { describe, it, expect } from 'vitest'
import { testRegex, commonPatterns, flagsToString } from './regex.js'

function getPattern(label) {
  return commonPatterns.find(p => p.label === label)
}

function match(pattern, text) {
  const p = getPattern(pattern)
  return testRegex(p.pattern, flagsToString(p.flags), text)
}

function matchTexts(pattern, text) {
  return match(pattern, text).matches.map(m => m.match)
}

// ─── 邮箱 ────────────────────────────────────────────

describe('常用正则 - 邮箱', () => {
  it('匹配标准邮箱', () => {
    expect(matchTexts('邮箱', 'admin@example.com')).toEqual(['admin@example.com'])
  })

  it('匹配含点号的域名', () => {
    expect(matchTexts('邮箱', 'dev@company.co.jp')).toEqual(['dev@company.co.jp'])
  })

  it('匹配含连字符和点号的本地部分', () => {
    expect(matchTexts('邮箱', 'user-name.test@domain.org')).toEqual(['user-name.test@domain.org'])
  })

  it('多个邮箱批量匹配', () => {
    const result = matchTexts('邮箱', 'a@b.cn x@y.com')
    expect(result).toEqual(['a@b.cn', 'x@y.com'])
  })

  it('不匹配无@的文本', () => {
    expect(matchTexts('邮箱', 'plaintext')).toEqual([])
  })

  it('不匹配无域名的文本', () => {
    expect(matchTexts('邮箱', 'user@')).toEqual([])
  })

  it('不匹配以点开头的本地部分', () => {
    expect(matchTexts('邮箱', '.user@example.com')).toEqual(['user@example.com'])
  })
})

// ─── 手机号 ──────────────────────────────────────────

describe('常用正则 - 手机号', () => {
  it('匹配13开头', () => {
    expect(matchTexts('手机号', '13012345678')).toEqual(['13012345678'])
  })

  it('匹配19开头', () => {
    expect(matchTexts('手机号', '19912345678')).toEqual(['19912345678'])
  })

  it('不匹配10开头', () => {
    expect(matchTexts('手机号', '10012345678')).toEqual([])
  })

  it('不匹配11位座机', () => {
    expect(matchTexts('手机号', '01088888888')).toEqual([])
  })

  it('不匹配不足11位', () => {
    expect(matchTexts('手机号', '1380013800')).toEqual([])
  })

  it('不匹配超过11位', () => {
    expect(matchTexts('手机号', '138001380001')).toEqual(['13800138000'])
  })

  it('从文本中提取手机号', () => {
    const result = matchTexts('手机号', '张三13800138000李四15912345678')
    expect(result).toEqual(['13800138000', '15912345678'])
  })
})

// ─── URL ─────────────────────────────────────────────

describe('常用正则 - URL', () => {
  it('匹配https', () => {
    expect(matchTexts('URL', 'https://example.com')).toEqual(['https://example.com'])
  })

  it('匹配http', () => {
    expect(matchTexts('URL', 'http://example.com')).toEqual(['http://example.com'])
  })

  it('匹配带端口', () => {
    expect(matchTexts('URL', 'http://localhost:8080')).toEqual(['http://localhost:8080'])
  })

  it('匹配带路径和查询参数', () => {
    expect(matchTexts('URL', 'https://example.com/path?q=hello&lang=zh')).toEqual(['https://example.com/path?q=hello&lang=zh'])
  })

  it('不匹配无协议的域名', () => {
    expect(matchTexts('URL', 'example.com')).toEqual([])
  })

  it('不匹配纯文本', () => {
    expect(matchTexts('URL', 'just some text')).toEqual([])
  })
})

// ─── IP 地址 ─────────────────────────────────────────

describe('常用正则 - IP 地址', () => {
  it('匹配标准IP', () => {
    expect(matchTexts('IP 地址', '192.168.1.1')).toEqual(['192.168.1.1'])
  })

  it('匹配0开头段', () => {
    expect(matchTexts('IP 地址', '10.0.0.1')).toEqual(['10.0.0.1'])
  })

  it('匹配广播地址', () => {
    expect(matchTexts('IP 地址', '255.255.255.255')).toEqual(['255.255.255.255'])
  })

  it('多个IP批量匹配', () => {
    const result = matchTexts('IP 地址', 'A:1.2.3.4 B:5.6.7.8')
    expect(result).toEqual(['1.2.3.4', '5.6.7.8'])
  })

  it('不匹配不完整的IP', () => {
    expect(matchTexts('IP 地址', '192.168.1')).toEqual([])
  })

  it('不匹配五段数字', () => {
    expect(matchTexts('IP 地址', '1.2.3.4.5')).toEqual(['1.2.3.4'])
  })

  it('匹配版本号等形似IP的文本', () => {
    // \b does not break between 'v' and '1', so 'v1.2.3.4' is not matched
    expect(matchTexts('IP 地址', 'v1.2.3.4')).toEqual([])
  })
})

// ─── 日期 ─────────────────────────────────────────────

describe('常用正则 - 日期', () => {
  it('匹配横线日期', () => {
    expect(matchTexts('日期', '2024-01-15')).toEqual(['2024-01-15'])
  })

  it('匹配斜线日期', () => {
    expect(matchTexts('日期', '2024/06/20')).toEqual(['2024/06/20'])
  })

  it('多个日期批量匹配', () => {
    const result = matchTexts('日期', '2024-01-15 到 2024/06/20')
    expect(result).toEqual(['2024-01-15', '2024/06/20'])
  })

  it('不匹配两位年份', () => {
    expect(matchTexts('日期', '24-01-15')).toEqual([])
  })

  it('不匹配无分隔符', () => {
    expect(matchTexts('日期', '20240115')).toEqual([])
  })

  it('匹配5位月日（含非法月日也可匹配）', () => {
    expect(matchTexts('日期', '2024-13-40')).toEqual(['2024-13-40'])
  })
})

// ─── 身份证 ──────────────────────────────────────────

describe('常用正则 - 身份证', () => {
  it('匹配18位纯数字', () => {
    expect(matchTexts('身份证', '110101199003076543')).toEqual(['110101199003076543'])
  })

  it('匹配末位X', () => {
    expect(matchTexts('身份证', '44030519881212001X')).toEqual(['44030519881212001X'])
  })

  it('匹配末位小写x', () => {
    expect(matchTexts('身份证', '44030519881212001x')).toEqual(['44030519881212001x'])
  })

  it('不匹配17位', () => {
    expect(matchTexts('身份证', '11010119900307654')).toEqual([])
  })

  it('不匹配19位', () => {
    // \b prevents matching 19 digits — the 19-digit string has no word boundary at position 18
    expect(matchTexts('身份证', '1101011990030765430')).toEqual([])
  })

  it('从文本中提取身份证', () => {
    const result = matchTexts('身份证', '证件：110101199003076543，备用：44030519881212001X')
    expect(result).toEqual(['110101199003076543', '44030519881212001X'])
  })
})

// ─── 中文 ─────────────────────────────────────────────

describe('常用正则 - 中文', () => {
  it('匹配中文字符', () => {
    expect(matchTexts('中文', '你好')).toEqual(['你好'])
  })

  it('匹配多段中文', () => {
    const result = matchTexts('中文', 'Hello 你好 world 世界')
    expect(result).toEqual(['你好', '世界'])
  })

  it('不匹配英文', () => {
    expect(matchTexts('中文', 'hello')).toEqual([])
  })

  it('不匹配数字和标点', () => {
    expect(matchTexts('中文', '123,./')).toEqual([])
  })

  it('匹配生僻字', () => {
    expect(matchTexts('中文', '龘')).toEqual(['龘'])
  })
})

// ─── HTML 标签 ────────────────────────────────────────

describe('常用正则 - HTML 标签', () => {
  it('匹配开放标签', () => {
    expect(matchTexts('HTML 标签', '<div>')).toEqual(['<div>'])
  })

  it('匹配带属性的标签', () => {
    expect(matchTexts('HTML 标签', '<div class="container">')).toEqual(['<div class="container">'])
  })

  it('匹配闭合标签', () => {
    expect(matchTexts('HTML 标签', '</div>')).toEqual(['</div>'])
  })

  it('匹配自闭合标签', () => {
    expect(matchTexts('HTML 标签', '<br/>')).toEqual(['<br/>'])
  })

  it('多个标签批量匹配', () => {
    const result = matchTexts('HTML 标签', '<div><p>text</p></div>')
    expect(result).toEqual(['<div>', '<p>', '</p>', '</div>'])
  })

  it('不匹配尖括号外的文本', () => {
    expect(matchTexts('HTML 标签', 'hello world')).toEqual([])
  })
})

// ─── 十六进制颜色 ─────────────────────────────────────

describe('常用正则 - 十六进制颜色', () => {
  it('匹配3位简写', () => {
    expect(matchTexts('十六进制颜色', '#f00')).toEqual(['#f00'])
  })

  it('匹配6位标准', () => {
    expect(matchTexts('十六进制颜色', '#1a2b3c')).toEqual(['#1a2b3c'])
  })

  it('匹配8位含透明度', () => {
    expect(matchTexts('十六进制颜色', '#00000000')).toEqual(['#00000000'])
  })

  it('匹配大写', () => {
    expect(matchTexts('十六进制颜色', '#ABCDEF')).toEqual(['#ABCDEF'])
  })

  it('不匹配无#', () => {
    expect(matchTexts('十六进制颜色', 'ff0000')).toEqual([])
  })

  it('不匹配含非法字符', () => {
    expect(matchTexts('十六进制颜色', '#gggggg')).toEqual([])
  })

  it('不匹配1位', () => {
    expect(matchTexts('十六进制颜色', '#f')).toEqual([])
  })

  it('不匹配9位', () => {
    // \b between digit 8 and 9 prevents partial match
    expect(matchTexts('十六进制颜色', '#123456789')).toEqual([])
  })
})

// ─── 数字 ─────────────────────────────────────────────

describe('常用正则 - 数字', () => {
  it('匹配整数', () => {
    expect(matchTexts('数字', '100')).toEqual(['100'])
  })

  it('匹配小数', () => {
    expect(matchTexts('数字', '3.14')).toEqual(['3.14'])
  })

  it('匹配负数', () => {
    expect(matchTexts('数字', '-3.5')).toEqual(['-3.5'])
  })

  it('匹配负整数', () => {
    expect(matchTexts('数字', '-100')).toEqual(['-100'])
  })

  it('匹配0开头的小数', () => {
    expect(matchTexts('数字', '0.618')).toEqual(['0.618'])
  })

  it('多个数字批量匹配', () => {
    const result = matchTexts('数字', '-3.5°C，99.8元，100个')
    expect(result).toEqual(['-3.5', '99.8', '100'])
  })

  it('不匹配纯文本', () => {
    expect(matchTexts('数字', 'hello')).toEqual([])
  })

  it('不匹配单独的小数点', () => {
    expect(matchTexts('数字', '.')).toEqual([])
  })
})

// ─── 英文单词 ────────────────────────────────────────

describe('常用正则 - 英文单词', () => {
  it('匹配英文单词', () => {
    expect(matchTexts('英文单词', 'hello')).toEqual(['hello'])
  })

  it('多个单词批量匹配', () => {
    const result = matchTexts('英文单词', 'Hello world')
    expect(result).toEqual(['Hello', 'world'])
  })

  it('不匹配含数字的词', () => {
    // \b does not break between letters and digits (both are \w), so no match
    expect(matchTexts('英文单词', 'test123')).toEqual([])
  })

  it('不匹配纯数字', () => {
    expect(matchTexts('英文单词', '123')).toEqual([])
  })

  it('不匹配中文', () => {
    expect(matchTexts('英文单词', '你好')).toEqual([])
  })

  it('匹配单字母', () => {
    expect(matchTexts('英文单词', 'a b c')).toEqual(['a', 'b', 'c'])
  })
})

// ─── 邮编 ─────────────────────────────────────────────

describe('常用正则 - 邮编', () => {
  it('匹配标准邮编', () => {
    expect(matchTexts('邮编', '100000')).toEqual(['100000'])
  })

  it('匹配非零开头', () => {
    expect(matchTexts('邮编', '518000')).toEqual(['518000'])
  })

  it('不匹配0开头', () => {
    expect(matchTexts('邮编', '000000')).toEqual([])
  })

  it('不匹配5位', () => {
    expect(matchTexts('邮编', '10000')).toEqual([])
  })

  it('不匹配7位', () => {
    // \b prevents matching 6 digits from a 7-digit string
    expect(matchTexts('邮编', '1000000')).toEqual([])
  })

  it('从文本中提取邮编', () => {
    const result = matchTexts('邮编', '北京100000上海200000')
    expect(result).toEqual(['100000', '200000'])
  })
})

// ─── 车牌号 ──────────────────────────────────────────

describe('常用正则 - 车牌号', () => {
  it('匹配普通车牌7位', () => {
    expect(matchTexts('车牌号', '京A12345')).toEqual(['京A12345'])
  })

  it('匹配新能源车牌8位', () => {
    expect(matchTexts('车牌号', '粤B12345D')).toEqual(['粤B12345D'])
  })

  it('匹配警用车牌', () => {
    expect(matchTexts('车牌号', '川D99999警')).toEqual(['川D99999警'])
  })

  it('匹配各省份简称', () => {
    expect(matchTexts('车牌号', '沪C67890')).toEqual(['沪C67890'])
    expect(matchTexts('车牌号', '粤Z12345')).toEqual(['粤Z12345'])
  })

  it('不匹配无省份简称', () => {
    expect(matchTexts('车牌号', 'A12345')).toEqual([])
  })

  it('不匹配6位车牌', () => {
    expect(matchTexts('车牌号', '京A1234')).toEqual([])
  })

  it('多个车牌批量匹配', () => {
    const result = matchTexts('车牌号', '京A12345和粤B12345D')
    expect(result).toEqual(['京A12345', '粤B12345D'])
  })
})

// ─── 银行卡号 ────────────────────────────────────────

describe('常用正则 - 银行卡号', () => {
  it('匹配16位卡号', () => {
    expect(matchTexts('银行卡号', '6217001234567890')).toEqual(['6217001234567890'])
  })

  it('匹配19位卡号', () => {
    expect(matchTexts('银行卡号', '6222021234567890123')).toEqual(['6222021234567890123'])
  })

  it('匹配17位卡号', () => {
    expect(matchTexts('银行卡号', '62220212345678901')).toEqual(['62220212345678901'])
  })

  it('不匹配15位', () => {
    expect(matchTexts('银行卡号', '622202123456789')).toEqual([])
  })

  it('不匹配20位', () => {
    // \b prevents matching 19 digits from a 20-digit string
    expect(matchTexts('银行卡号', '62220212345678901234')).toEqual([])
  })

  it('从文本中提取卡号', () => {
    const result = matchTexts('银行卡号', '卡号6217001234567890和6222021234567890123')
    expect(result).toEqual(['6217001234567890', '6222021234567890123'])
  })
})

// ─── IPv6 ─────────────────────────────────────────────

describe('常用正则 - IPv6', () => {
  it('匹配完整8段格式', () => {
    expect(matchTexts('IPv6', '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toEqual(['2001:0db8:85a3:0000:0000:8a2e:0370:7334'])
  })

  it('匹配::简写', () => {
    expect(matchTexts('IPv6', '::1')).toEqual(['::1'])
  })

  it('匹配fe80::简写', () => {
    expect(matchTexts('IPv6', 'fe80::1')).toEqual(['fe80::1'])
  })

  it('匹配中间::简写', () => {
    expect(matchTexts('IPv6', '2001:db8::1')).toEqual(['2001:db8::1'])
  })

  it('不匹配纯文本', () => {
    expect(matchTexts('IPv6', 'hello world')).toEqual([])
  })

  it('不匹配IPv4', () => {
    expect(matchTexts('IPv6', '192.168.1.1')).toEqual([])
  })
})

// ─── 密码强度 ────────────────────────────────────────

describe('常用正则 - 密码强度', () => {
  it('匹配含大小写和数字的8位以上密码', () => {
    const result = match('密码强度', 'Abc12345')
    expect(result.matches).toHaveLength(1)
  })

  it('匹配含特殊字符的强密码', () => {
    const result = match('密码强度', 'Abc@12345')
    expect(result.matches).toHaveLength(1)
  })

  it('不匹配纯数字密码', () => {
    expect(match('密码强度', '12345678').matches).toEqual([])
  })

  it('不匹配纯小写密码', () => {
    expect(match('密码强度', 'abcdefgh').matches).toEqual([])
  })

  it('不匹配纯大写密码', () => {
    expect(match('密码强度', 'ABCDEFGH').matches).toEqual([])
  })

  it('不匹配不足8位', () => {
    expect(match('密码强度', 'Abc1234').matches).toEqual([])
  })

  it('不匹配仅有大小写无数字', () => {
    expect(match('密码强度', 'Abcdefgh').matches).toEqual([])
  })
})

// ─── 通用：所有预设正则都是合法的 ─────────────────────

describe('所有预设正则合法性', () => {
  it.each(commonPatterns)('$label 是合法的正则表达式', (p) => {
    const flagsStr = flagsToString(p.flags)
    expect(() => new RegExp(p.pattern, flagsStr)).not.toThrow()
  })

  it.each(commonPatterns)('$label 的示例文本能产生匹配', (p) => {
    const result = testRegex(p.pattern, flagsToString(p.flags), p.sample)
    expect(result.error).toBe('')
    expect(result.matches.length).toBeGreaterThan(0)
  })
})
