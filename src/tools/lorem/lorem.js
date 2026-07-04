const LATIN_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
  'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
  'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
  'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
  'explicabo', 'nemo', 'ipsam', 'voluptas', 'aspernatur', 'aut', 'odit',
  'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi',
  'nesciunt', 'neque', 'porro', 'quisquam', 'nihil', 'impedit', 'quo', 'minus',
]

const ZH_SENTENCES = [
  '在这个快速发展的时代，技术的进步改变了我们的生活方式。',
  '每一个伟大的项目都始于一个简单的想法。',
  '代码不仅仅是工具，更是表达思想的媒介。',
  '持续学习是保持竞争力的关键所在。',
  '优秀的设计往往来自于对细节的极致追求。',
  '团队协作能够将个体的力量成倍放大。',
  '解决问题的第一步是准确定义问题本身。',
  '简洁是可靠的先决条件，复杂是可靠的敌人。',
  '用户体验的核心在于理解用户的真实需求。',
  '数据驱动的决策比直觉更加可靠。',
  '每一次失败都是通往成功的垫脚石。',
  '好的架构让扩展变得简单，坏的架构让修改变得困难。',
  '测试不是负担，而是质量的保障。',
  '文档是代码和用户之间的桥梁。',
  '提前规划可以避免后期大量的返工。',
  '创造性思维需要跳出已有的思维框架。',
  '沟通是解决大多数技术争议的最佳方式。',
  '在正确的时间做正确的事情，比单纯的努力更重要。',
  '技术的选择应当服务于业务目标，而非反过来。',
  '保持好奇心，是持续成长的动力源泉。',
  '迭代式开发让我们能够快速验证假设。',
  '代码审查是知识共享和质量保证的重要环节。',
  '自动化测试为重构提供了安全网。',
  '好的命名让代码自己说话，减少了对注释的依赖。',
  '模块化设计让系统更容易理解和维护。',
  '拥抱变化，而不是抗拒变化，是敏捷的核心。',
  '性能优化应该基于数据，而不是猜测。',
  '日志是生产环境中的眼睛和耳朵。',
  '安全不是功能，而是基础要求。',
  '微服务不是银弹，合适才是最好的。',
  '把复杂的问题拆解成简单的小问题，逐个击破。',
  '可观测性是现代系统运维的基石。',
  '持续的代码重构让系统保持健康。',
  '开放源码社区是创新的重要驱动力。',
  '合理的抽象层次让代码更易于理解。',
  '错误处理是健壮系统的必要组成部分。',
  '依赖管理是项目健康度的重要指标。',
  '配置和代码的分离提高了系统的灵活性。',
  '渐进式交付降低了发布的风险。',
  '基础设施即代码让环境管理更加可靠。',
  '好的 API 设计让集成变得愉悦。',
  '监控和告警是保障系统稳定运行的眼睛。',
  '技术债务需要主动管理，而不是忽视。',
  '文档化的决策记录减少了团队的重复讨论。',
  '持续集成让每次提交都充满信心。',
  '设计模式是前人智慧的结晶，但不要过度使用。',
  '回滚策略是发布计划中不可或缺的一部分。',
  '容量规划是避免线上事故的重要手段。',
  '混沌工程帮助我们发现系统中的隐患。',
]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEnglishSentence(wordCount) {
  const words = []
  for (let i = 0; i < wordCount; i++) {
    words.push(LATIN_WORDS[randInt(0, LATIN_WORDS.length - 1)])
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(' ') + '.'
}

function generateChineseSentence() {
  return ZH_SENTENCES[randInt(0, ZH_SENTENCES.length - 1)]
}

/** Generate placeholder text in English (Lorem Ipsum) or Chinese.
 * @param {Object} opts
 * @param {'en'|'zh'} opts.lang - Language
 * @param {number} opts.paragraphs - Number of paragraphs
 * @param {[number, number]} opts.sentencesPerParagraph - [min, max] sentences per paragraph
 * @returns {string[]} Array of paragraph strings
 */
export function generateLorem({ lang, paragraphs, sentencesPerParagraph }) {
  if (paragraphs <= 0) return []
  const [minS, maxS] = sentencesPerParagraph
  const result = []

  for (let p = 0; p < paragraphs; p++) {
    const sentenceCount = randInt(minS, maxS)
    const sentences = []

    if (lang === 'en') {
      for (let s = 0; s < sentenceCount; s++) {
        const wordCount = randInt(5, 15)
        sentences.push(generateEnglishSentence(wordCount))
      }
    } else {
      for (let s = 0; s < sentenceCount; s++) {
        sentences.push(generateChineseSentence())
      }
    }

    result.push(sentences.join(' '))
  }

  return result
}
