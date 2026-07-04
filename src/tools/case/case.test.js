import { describe, it, expect } from 'vitest'
import { tokenize, convertCases } from './case.js'

describe('tokenize', () => {
  it('splits on spaces', () => {
    expect(tokenize('hello world')).toEqual(['hello', 'world'])
  })

  it('splits on underscores', () => {
    expect(tokenize('hello_world')).toEqual(['hello', 'world'])
  })

  it('splits on hyphens', () => {
    expect(tokenize('hello-world')).toEqual(['hello', 'world'])
  })

  it('splits camelCase', () => {
    expect(tokenize('helloWorld')).toEqual(['hello', 'world'])
  })

  it('splits PascalCase', () => {
    expect(tokenize('HelloWorld')).toEqual(['hello', 'world'])
  })

  it('splits SCREAMING_SNAKE_CASE', () => {
    expect(tokenize('HELLO_WORLD')).toEqual(['hello', 'world'])
  })

  it('handles consecutive uppercase before lowercase (e.g. XMLHttpRequest)', () => {
    expect(tokenize('XMLHttpRequest')).toEqual(['xml', 'http', 'request'])
  })

  it('handles mixed separators', () => {
    expect(tokenize('hello-world_foo bar')).toEqual(['hello', 'world', 'foo', 'bar'])
  })

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('returns empty array for whitespace only', () => {
    expect(tokenize('   ')).toEqual([])
  })

  it('trims leading/trailing whitespace', () => {
    expect(tokenize('  hello  ')).toEqual(['hello'])
  })

  it('handles single word', () => {
    expect(tokenize('hello')).toEqual(['hello'])
  })

  it('handles consecutive separators (e.g. hello__world)', () => {
    expect(tokenize('hello__world')).toEqual(['hello', 'world'])
    expect(tokenize('hello--world')).toEqual(['hello', 'world'])
    expect(tokenize('hello  world')).toEqual(['hello', 'world'])
  })

  it('handles numbers adjacent to letters', () => {
    expect(tokenize('v2Component')).toEqual(['v2', 'component'])
    expect(tokenize('hello2world')).toEqual(['hello2world'])
    expect(tokenize('html5Parser')).toEqual(['html5', 'parser'])
  })

  it('handles all-uppercase word like API or URL', () => {
    expect(tokenize('API')).toEqual(['api'])
    expect(tokenize('APIResponse')).toEqual(['api', 'response'])
  })

  it('handles Chinese/Unicode as single token when no separators', () => {
    expect(tokenize('你好世界')).toEqual(['你好世界'])
    expect(tokenize('hello 世界')).toEqual(['hello', '世界'])
  })

  it('handles leading/trailing separators', () => {
    expect(tokenize('_hello_world_')).toEqual(['hello', 'world'])
  })
})

describe('convertCases', () => {
  it('returns empty strings for empty input', () => {
    const result = convertCases('')
    expect(result.upper).toBe('')
    expect(result.lower).toBe('')
    expect(result.camel).toBe('')
    expect(result.pascal).toBe('')
    expect(result.snake).toBe('')
    expect(result.screamingSnake).toBe('')
    expect(result.kebab).toBe('')
    expect(result.title).toBe('')
  })

  it('converts space-separated words', () => {
    const result = convertCases('hello world')
    expect(result.upper).toBe('HELLO WORLD')
    expect(result.lower).toBe('hello world')
    expect(result.camel).toBe('helloWorld')
    expect(result.pascal).toBe('HelloWorld')
    expect(result.snake).toBe('hello_world')
    expect(result.screamingSnake).toBe('HELLO_WORLD')
    expect(result.kebab).toBe('hello-world')
    expect(result.title).toBe('Hello World')
  })

  it('converts camelCase input', () => {
    const result = convertCases('helloWorld')
    expect(result.upper).toBe('HELLO WORLD')
    expect(result.lower).toBe('hello world')
    expect(result.camel).toBe('helloWorld')
    expect(result.pascal).toBe('HelloWorld')
    expect(result.snake).toBe('hello_world')
    expect(result.screamingSnake).toBe('HELLO_WORLD')
    expect(result.kebab).toBe('hello-world')
    expect(result.title).toBe('Hello World')
  })

  it('converts SCREAMING_SNAKE input', () => {
    const result = convertCases('HELLO_WORLD')
    expect(result.upper).toBe('HELLO WORLD')
    expect(result.lower).toBe('hello world')
    expect(result.camel).toBe('helloWorld')
    expect(result.pascal).toBe('HelloWorld')
    expect(result.snake).toBe('hello_world')
    expect(result.screamingSnake).toBe('HELLO_WORLD')
    expect(result.kebab).toBe('hello-world')
    expect(result.title).toBe('Hello World')
  })

  it('converts kebab-case input', () => {
    const result = convertCases('hello-world-foo')
    expect(result.upper).toBe('HELLO WORLD FOO')
    expect(result.lower).toBe('hello world foo')
    expect(result.camel).toBe('helloWorldFoo')
    expect(result.pascal).toBe('HelloWorldFoo')
    expect(result.snake).toBe('hello_world_foo')
    expect(result.screamingSnake).toBe('HELLO_WORLD_FOO')
    expect(result.kebab).toBe('hello-world-foo')
    expect(result.title).toBe('Hello World Foo')
  })

  it('converts PascalCase input', () => {
    const result = convertCases('MyComponent')
    expect(result.upper).toBe('MY COMPONENT')
    expect(result.lower).toBe('my component')
    expect(result.camel).toBe('myComponent')
    expect(result.pascal).toBe('MyComponent')
    expect(result.snake).toBe('my_component')
    expect(result.screamingSnake).toBe('MY_COMPONENT')
    expect(result.kebab).toBe('my-component')
    expect(result.title).toBe('My Component')
  })

  it('handles all-uppercase word (API becomes Api in title/pascal)', () => {
    const result = convertCases('APIResponse')
    expect(result.upper).toBe('API RESPONSE')
    expect(result.lower).toBe('api response')
    expect(result.camel).toBe('apiResponse')
    expect(result.pascal).toBe('ApiResponse')
    expect(result.snake).toBe('api_response')
    expect(result.screamingSnake).toBe('API_RESPONSE')
    expect(result.kebab).toBe('api-response')
    expect(result.title).toBe('Api Response')
  })

  it('handles Chinese input', () => {
    const result = convertCases('你好 世界')
    expect(result.lower).toBe('你好 世界')
    expect(result.upper).toBe('你好 世界')
    expect(result.camel).toBe('你好世界')
    expect(result.pascal).toBe('你好世界')
    expect(result.snake).toBe('你好_世界')
  })

  it('handles three-word input', () => {
    const result = convertCases('hello world foo')
    expect(result.camel).toBe('helloWorldFoo')
    expect(result.pascal).toBe('HelloWorldFoo')
    expect(result.snake).toBe('hello_world_foo')
    expect(result.screamingSnake).toBe('HELLO_WORLD_FOO')
    expect(result.kebab).toBe('hello-world-foo')
  })
})
