export const toolGroups = [
  { key: 'codec', name: '编码与转换' },
  { key: 'text', name: '文本处理' },
  { key: 'dev', name: '开发辅助' }
]

export const tools = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    file: 'JsonFormatter',
    icon: '🧱',
    group: 'codec',
    description: '格式化、压缩并校验 JSON 文本',
    tags: ['JSON', '格式化', '校验']
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    file: 'Base64Codec',
    icon: '🔤',
    group: 'codec',
    description: '文本与 Base64 互转，支持 URL 安全字符',
    tags: ['Base64', '编码']
  },
  {
    id: 'url-codec',
    name: 'URL 编解码',
    file: 'UrlCodec',
    icon: '🔗',
    group: 'codec',
    description: '对 URL 或查询参数进行编码与解码',
    tags: ['URL', 'encodeURIComponent']
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    file: 'TimestampConverter',
    icon: '🕒',
    group: 'dev',
    description: '时间戳与日期时间相互转换，支持本地与 UTC',
    tags: ['时间戳', '日期']
  },
  {
    id: 'color-converter',
    name: '颜色转换',
    file: 'ColorConverter',
    icon: '🎨',
    group: 'dev',
    description: 'HEX、RGB、HSL 颜色格式互转',
    tags: ['颜色', 'HEX', 'RGB', 'HSL']
  },
  {
    id: 'uuid',
    name: 'UUID 生成',
    file: 'UuidGenerator',
    icon: '🆔',
    group: 'dev',
    description: '批量生成 UUID v4，一键复制',
    tags: ['UUID', '随机']
  },
  {
    id: 'hash',
    name: '哈希摘要',
    file: 'HashGenerator',
    icon: '🧮',
    group: 'dev',
    description: '计算文本的 SHA-1 / SHA-256 / SHA-512 摘要',
    tags: ['哈希', 'SHA']
  },
  {
    id: 'password',
    name: '密码生成器',
    file: 'PasswordGenerator',
    icon: '🔐',
    group: 'dev',
    description: '自定义字符集，生成高强度随机密码',
    tags: ['密码', '安全']
  },
  {
    id: 'text-counter',
    name: '文本统计',
    file: 'TextCounter',
    icon: '📝',
    group: 'text',
    description: '统计字符、单词、行数与 UTF-8 字节数',
    tags: ['字数', '统计']
  }
]

const toolMap = new Map(tools.map((tool) => [tool.id, tool]))

export function getToolById(id) {
  return toolMap.get(id)
}
