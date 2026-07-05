export const STATUS_CODES = [
  // 1xx Informational
  { code: 100, name: 'Continue', desc: '继续发送请求', detail: '客户端应继续发送请求的剩余部分，或忽略此响应（如果请求已完成）。通常在发送大请求体前，先发送带 Expect: 100-continue 的请求头，服务器返回 100 表示可以继续发送。' },
  { code: 101, name: 'Switching Protocols', desc: '切换协议', detail: '服务器同意客户端的 Upgrade 请求头，正在切换到客户端指定的协议。常见于 WebSocket 握手，从 HTTP 升级到 WebSocket 协议。' },
  { code: 102, name: 'Processing', desc: '处理中', detail: 'WebDAV 扩展状态码。服务器已收到请求并正在处理，但尚未完成。用于长时间操作，防止客户端超时断开。' },
  { code: 103, name: 'Early Hints', desc: '早期提示', detail: '用于在服务器准备响应前，通过 Link 头让客户端预加载资源或预连接到源站。可显著提升页面加载性能。' },

  // 2xx Success
  { code: 200, name: 'OK', desc: '请求成功', detail: '请求成功。含义取决于 HTTP 方法：GET 获取资源成功；HEAD 返回表示头；PUT/POST 返回操作结果；TRACE 返回收到的请求消息。' },
  { code: 201, name: 'Created', desc: '资源已创建', detail: '请求成功且创建了新资源。通常在 POST 或某些 PUT 请求后返回。响应应包含 Location 头指向新创建的资源，响应体可包含资源描述。' },
  { code: 202, name: 'Accepted', desc: '请求已接受', detail: '请求已被接受但尚未处理。属于非承诺性响应，适用于异步处理场景（如后台任务、批处理）。客户端需稍后查询处理结果。' },
  { code: 203, name: 'Non-Authoritative Information', desc: '非权威信息', detail: '返回的元信息不是来自源服务器，而是来自本地或第三方副本。主要用于镜像或备份场景，数据可能与源服务器不完全一致。' },
  { code: 204, name: 'No Content', desc: '无内容', detail: '请求成功但无内容返回。响应不应包含消息体。常用于 PUT 保存成功后返回，或 DELETE 删除成功后返回。浏览器不会刷新页面。' },
  { code: 205, name: 'Reset Content', desc: '重置内容', detail: '告诉用户代理重置发送此请求的文档视图。常用于表单提交后清空表单，让用户可以输入新内容。响应不应包含消息体。' },
  { code: 206, name: 'Partial Content', desc: '部分内容', detail: '服务器成功处理了范围请求（Range 请求）。响应包含 Content-Range 头，指定返回的数据范围。常用于大文件下载的断点续传。' },
  { code: 207, name: 'Multi-Status', desc: '多状态', detail: 'WebDAV 扩展状态码。在需要返回多个资源状态信息时使用，响应体为 XML 格式，包含每个子请求的独立状态码。' },
  { code: 208, name: 'Already Reported', desc: '已报告', detail: 'WebDAV 扩展状态码。在 DAV:propstat 响应元素中使用，避免重复枚举同一集合的多个绑定的内部成员。' },
  { code: 226, name: 'IM Used', desc: 'IM 已使用', detail: '服务器已对当前实例执行了一个或多个实例操作（如差分编码），返回的是操作后的表示。HTTP Delta 编码扩展。' },

  // 3xx Redirection
  { code: 300, name: 'Multiple Choices', desc: '多种选择', detail: '请求有多个可能的响应，用户代理或用户应从中选择一个。服务器可在响应中包含偏好列表。极少使用。' },
  { code: 301, name: 'Moved Permanently', desc: '永久重定向', detail: '请求的资源已永久移动到新 URL。浏览器会缓存此重定向，后续请求直接访问新 URL。搜索引擎会将权重转移到新地址。注意：POST 请求可能被改为 GET。' },
  { code: 302, name: 'Found', desc: '临时重定向', detail: '请求的资源临时移动到其他 URL。与 307 不同，302 可能将 POST 方法改为 GET。建议新代码使用 307 代替，以保持原始请求方法不变。' },
  { code: 303, name: 'See Other', desc: '查看其他', detail: '服务器将客户端引导到另一个 URI 以 GET 方式获取资源。典型场景：POST 表单提交后，用此响应引导到结果页面。方法始终变为 GET。' },
  { code: 304, name: 'Not Modified', desc: '未修改', detail: '资源未修改，客户端可使用缓存版本。由条件请求（If-None-Match、If-Modified-Since）触发。响应不包含消息体，节省带宽。' },
  { code: 307, name: 'Temporary Redirect', desc: '临时重定向（保留方法）', detail: '请求的资源临时在另一 URI。与 302 的关键区别：请求方法不变，POST 仍是 POST。推荐用于需要保持请求方法的临时重定向。' },
  { code: 308, name: 'Permanent Redirect', desc: '永久重定向（保留方法）', detail: '资源已永久移动到新 URI。与 301 的关键区别：请求方法不变，POST 仍是 POST。推荐用于需要保持请求方法的永久重定向。' },

  // 4xx Client Error
  { code: 400, name: 'Bad Request', desc: '错误请求', detail: '服务器无法或不愿处理请求，因为客户端发送了无效的请求（如格式错误的语法、无效的请求消息框架或欺骗性路由）。' },
  { code: 401, name: 'Unauthorized', desc: '未认证', detail: '虽然名称为"未授权"，但语义上表示"未认证"。客户端必须先进行身份认证才能获取请求的资源。响应必须包含 WWW-Authenticate 头。' },
  { code: 402, name: 'Payment Required', desc: '需要付款', detail: '最初为数字支付系统保留，目前尚无标准使用约定。部分服务（如 Stripe）用于表示需要付费才能访问。' },
  { code: 403, name: 'Forbidden', desc: '禁止访问', detail: '服务器理解请求但拒绝执行。与 401 不同，客户端身份已知但权限不足。服务器有时用 404 代替 403，以隐藏资源的存在。' },
  { code: 404, name: 'Not Found', desc: '未找到', detail: '服务器找不到请求的资源。浏览器中表示 URL 不存在，API 中表示端点有效但资源不存在。服务器也可能用此码隐藏本应返回 403 的资源。' },
  { code: 405, name: 'Method Not Allowed', desc: '方法不允许', detail: '请求方法被服务器识别但目标资源不支持。如对只读资源发送 DELETE。响应必须包含 Allow 头，列出该资源支持的方法。' },
  { code: 406, name: 'Not Acceptable', desc: '不可接受', detail: '服务器执行内容协商后，找不到符合客户端 Accept 头指定条件的内容。如客户端只接受 XML，但服务器只有 JSON。' },
  { code: 407, name: 'Proxy Authentication Required', desc: '需要代理认证', detail: '与 401 类似，但认证需要由代理服务器完成。响应必须包含 Proxy-Authenticate 头，指示可用的认证方案。' },
  { code: 408, name: 'Request Timeout', desc: '请求超时', detail: '服务器在等待请求时超时。服务器希望关闭此空闲连接。客户端可在后续连接中重新发送请求。' },
  { code: 409, name: 'Conflict', desc: '冲突', detail: '请求与服务器当前状态冲突。常见于 PUT 请求的编辑冲突，或创建已存在的资源。响应体应包含冲突信息，帮助用户解决冲突。' },
  { code: 410, name: 'Gone', desc: '资源已删除', detail: '请求的资源已永久删除且没有转发地址。与 404 不同，410 表示资源曾存在但已被刻意移除。客户端应删除缓存和指向此资源的链接。' },
  { code: 411, name: 'Length Required', desc: '需要内容长度', detail: '服务器拒绝请求，因为未定义 Content-Length 头。服务器要求客户端在请求中包含有效的 Content-Length 头。' },
  { code: 412, name: 'Precondition Failed', desc: '前提条件失败', detail: '条件请求中，客户端在请求头中指定的前提条件（如 If-Match、If-Unmodified-Since）不满足。常用于乐观并发控制。' },
  { code: 413, name: 'Content Too Large', desc: '内容过大', detail: '请求体超过了服务器定义的大小限制。服务器可能关闭连接或返回 Retry-After 头提示客户端稍后重试。' },
  { code: 414, name: 'URI Too Long', desc: 'URI 过长', detail: '客户端请求的 URI 超过了服务器愿意解析的长度。常见于 GET 请求将大量数据编码到查询字符串中，应改用 POST 请求。' },
  { code: 415, name: 'Unsupported Media Type', desc: '不支持的媒体类型', detail: '请求数据的媒体格式不被服务器支持。如发送 XML 但服务器只接受 JSON。Content-Type 或 Content-Encoding 不匹配。' },
  { code: 416, name: 'Range Not Satisfiable', desc: '范围不可满足', detail: '请求的 Range 头指定的范围无法满足。如请求文件中不存在的字节范围。响应应包含 Content-Range 头说明资源的实际大小。' },
  { code: 417, name: 'Expectation Failed', desc: '期望失败', detail: '服务器无法满足 Expect 请求头指示的期望。常见于客户端发送 Expect: 100-continue 但服务器不支持此扩展。' },
  { code: 418, name: "I'm a Teapot", desc: '我是茶壶', detail: 'HTCPCP（超文本咖啡壶控制协议）定义的玩笑状态码。服务器拒绝用茶壶煮咖啡。有时也被用作 Easter Egg 或拒绝某些请求的幽默方式。' },
  { code: 421, name: 'Misdirected Request', desc: '错误路由的请求', detail: '请求被发送到无法产生响应的服务器。常见于 HTTP/2 连接复用场景，请求的域名与服务器配置不匹配。' },
  { code: 422, name: 'Unprocessable Content', desc: '无法处理的内容', detail: '请求格式正确但因语义错误无法处理。如 JSON 语法正确但字段值不合法。WebDAV 中也有使用。' },
  { code: 423, name: 'Locked', desc: '已锁定', detail: 'WebDAV 扩展状态码。正在访问的资源被锁定，无法操作。响应应包含锁定的相关信息。' },
  { code: 424, name: 'Failed Dependency', desc: '依赖失败', detail: 'WebDAV 扩展状态码。请求因前一个请求失败而失败。当操作依赖其他操作的结果时使用。' },
  { code: 425, name: 'Too Early', desc: '太早', detail: '服务器不愿处理可能被重放的请求。用于 TLS 1.3 的 0-RTT 数据场景，防止重放攻击。' },
  { code: 426, name: 'Upgrade Required', desc: '需要升级', detail: '服务器拒绝使用当前协议执行请求，但客户端升级协议后可能愿意执行。响应应包含 Upgrade 头指明所需协议。' },
  { code: 428, name: 'Precondition Required', desc: '需要前提条件', detail: '源服务器要求请求是条件性的。旨在防止"丢失更新"问题——客户端应先 GET 获取资源版本，再带条件（如 If-Match）提交修改。' },
  { code: 429, name: 'Too Many Requests', desc: '请求过多', detail: '用户在给定时间内发送了过多请求（速率限制）。响应应包含 Retry-After 头，告知客户端何时可以重试。' },
  { code: 431, name: 'Request Header Fields Too Large', desc: '请求头字段过大', detail: '服务器不愿处理请求，因为请求头字段过大。可能发生在 Cookie 过大或请求头过多时。客户端可在减小请求头后重试。' },
  { code: 451, name: 'Unavailable For Legal Reasons', desc: '因法律原因不可用', detail: '用户请求的资源因法律原因无法提供。如因政府审查、版权主张或法院命令被封锁。状态码源于《华氏451度》，象征审查制度。' },

  // 5xx Server Error
  { code: 500, name: 'Internal Server Error', desc: '服务器内部错误', detail: '服务器遇到无法处理的意外情况。通用错误码，当没有更合适的 5xx 状态码时使用。通常是服务端代码异常或配置错误。' },
  { code: 501, name: 'Not Implemented', desc: '未实现', detail: '服务器不支持请求的方法。GET 和 HEAD 方法不得返回此状态码，因为它们必须被所有服务器支持。常见于服务器不支持 PUT、DELETE 等方法。' },
  { code: 502, name: 'Bad Gateway', desc: '网关错误', detail: '服务器作为网关或代理，从上游服务器收到了无效响应。常见于反向代理（如 Nginx）后端服务崩溃或返回了无法解析的响应。' },
  { code: 503, name: 'Service Unavailable', desc: '服务不可用', detail: '服务器暂时无法处理请求（通常因过载或维护）。此状态应为临时性的，响应最好包含 Retry-After 头，告知客户端预计恢复时间。' },
  { code: 504, name: 'Gateway Timeout', desc: '网关超时', detail: '服务器作为网关或代理，未能及时从上游服务器获取响应。常见于后端服务响应超时，Nginx 等代理服务器会返回此码。' },
  { code: 505, name: 'HTTP Version Not Supported', desc: 'HTTP 版本不支持', detail: '服务器不支持请求中使用的 HTTP 版本。如客户端使用 HTTP/2 但服务器只支持 HTTP/1.1。' },
  { code: 506, name: 'Variant Also Negotiates', desc: '变体也协商', detail: '服务器内部配置错误：内容协商时，选中的变体自身也参与了内容协商，导致循环引用。透明内容协商的配置问题。' },
  { code: 507, name: 'Insufficient Storage', desc: '存储不足', detail: 'WebDAV 扩展状态码。服务器无法存储完成请求所需的表示。磁盘空间不足等原因导致。' },
  { code: 508, name: 'Loop Detected', desc: '检测到循环', detail: 'WebDAV 扩展状态码。服务器在处理请求时检测到无限循环。如 WebDAV 绑定导致循环引用。' },
  { code: 510, name: 'Not Extended', desc: '未扩展', detail: '客户端请求声明了 HTTP 扩展，但服务器不支持该扩展。需客户端移除扩展要求后重试。' },
  { code: 511, name: 'Network Authentication Required', desc: '需要网络认证', detail: '客户端需要进行网络级认证才能获得访问权限。常见于公共 Wi-Fi 的强制门户（Captive Portal），需要先登录才能上网。' },
]

export const CLASS_NAMES = {
  1: '信息性',
  2: '成功',
  3: '重定向',
  4: '客户端错误',
  5: '服务器错误',
}

export function badgeClass(code) {
  const cls = Math.floor(code / 100)
  if (cls === 1) return 'badge-info'
  if (cls === 2) return 'badge-success'
  if (cls === 3) return 'badge-warning'
  if (cls === 4) return 'badge-secondary'
  if (cls === 5) return 'badge-error'
  return ''
}

// query is expected to already be trimmed + lowercased by the caller.
// Empty query returns all items.
export function filterStatusCodes(items, query) {
  if (!query) return items
  return items.filter(item =>
    String(item.code).includes(query) ||
    item.name.toLowerCase().includes(query) ||
    item.desc.includes(query) ||
    item.detail.includes(query),
  )
}

export function groupByClass(items) {
  const groups = []
  for (const item of items) {
    const cls = Math.floor(item.code / 100)
    let group = groups.find(g => g.classCode === cls)
    if (!group) {
      group = { classCode: cls, className: CLASS_NAMES[cls] || '', items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}
