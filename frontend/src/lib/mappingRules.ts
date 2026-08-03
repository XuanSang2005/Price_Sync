// Logic THUẦN của trang mapping: kiểu dữ liệu cột nháp + "rule engine" chạy trên trình duyệt.
// File này KHÔNG import React và KHÔNG có JSX -> đọc/kiểm thử độc lập được.

import type { MappingRule } from '../types'

// Một cột MNT đang chỉnh (bản nháp cục bộ, chỉ ghi DB khi bấm Save)
export type Col = {
  key: string
  json_field: string
  mnt_column: string
  rule_type: string
  rule_value: string | null
  required: boolean
  locked: boolean // cột chuẩn (hợp đồng Oracle) — khoá cứng: không đổi nguồn, không xoá. Gắn lúc load, KHÔNG suy từ json_field.
}

// Toạ độ đường nối field nguồn -> cột đích, tương đối với khung hai panel.
export type Line = { key: string; x1: number; y1: number; x2: number; y2: number }

// Bộ đếm sinh key cho cột MỚI thêm (cột đã lưu thì dùng 'r' + id của DB).
// Để ở module scope nên tăng dần suốt phiên làm việc -> không bao giờ trùng key.
let nextKey = 1

// Đổi một luật lấy từ API thành một cột nháp trên màn hình
export function colFromRule(rule: MappingRule): Col {
  return {
    key: 'r' + rule.id,
    json_field: rule.json_field,
    mnt_column: rule.mnt_column,
    rule_type: rule.rule_type,
    rule_value: rule.rule_value,
    required: rule.required,
    locked: rule.locked,
  }
}

// Tạo một cột nháp MỚI (chưa có trong DB nên chưa có id -> tự sinh key 'c1', 'c2'...)
export function newDraftCol(json_field: string, mnt_column: string, required: boolean): Col {
  return {
    key: 'c' + (nextKey++),
    json_field,
    mnt_column,
    rule_type: 'DIRECT',
    rule_value: null,
    required,
    locked: false,
  }
}

// Dựng một snapshot cột theo đúng thứ tự server. Gom ở đây để cả lần tải đầu,
// đổi record type và xác minh sau Save đều dùng cùng một quy tắc.
export function columnsFromRules(rules: MappingRule[], recordType: string): Col[] {
  return rules
    .filter((rule) => rule.record_type === recordType)
    .sort((a, b) => a.position - b.position)
    .map(colFromRule)
}

// Kiểm tra toàn bộ draft trước khi bulk-replace. Trả về một câu lỗi thân thiện để UI
// có thể đặt inline lẫn toast; null nghĩa là payload an toàn để gửi.
export function validateMapping(columns: Col[], allowedRuleTypes: string[]): string | null {
  const missingSource = columns.find((column) => !column.json_field.trim())
  if (missingSource) return `Map ${missingSource.mnt_column} to a source field before saving`

  const seenColumns = new Set<string>()
  for (const column of columns) {
    const name = column.mnt_column.trim().toUpperCase()
    if (!name) return 'Every target column needs a name'
    if (seenColumns.has(name)) return `Target column ${name} is duplicated`
    seenColumns.add(name)

    if (!allowedRuleTypes.includes(column.rule_type)) {
      return `Rule type ${column.rule_type} is not supported for ${column.mnt_column}`
    }

    if (column.rule_type === 'VALUE_MAP' && !isStringMap(column.rule_value)) {
      return `${column.mnt_column} needs a valid JSON object such as {"STORE":"S"}`
    }
  }
  return null
}

// Rule engine chạy TRÊN FRONTEND — khớp Mapper.applyRule của backend, áp lên `fields` (đã format sẵn).
// Nhờ vậy bảng "After" cập nhật LIVE theo cột nháp, không cần Save. null = một luật báo không map được.
export function computeAfter(fields: Record<string, string>, columns: Col[]): string[] | null {
  const src = fields ?? {} // backend cũ (chưa restart) không có `fields` → tránh crash
  const out: string[] = []
  for (const c of columns) {
    // Target-only draft được phép tồn tại trong editor, nhưng chưa đủ dữ liệu để
    // mô phỏng output cho tới khi người dùng map một source.
    if (!c.json_field.trim()) return null
    const value = applyRule(src[c.json_field], c)
    if (value === null) return null // một cột hỏng -> cả bản ghi không map được
    out.push(value)
  }
  return out
}

// Áp DUY NHẤT một luật lên một giá trị nguồn. Trả về null nghĩa là "không map được".
function applyRule(raw: string | undefined, col: Col): string | null {
  switch (col.rule_type) {
    case 'DIRECT':
      return raw ?? ''

    case 'DEFAULT':
      // Có giá trị thì dùng, rỗng/thiếu thì lấy hằng số cấu hình trong rule_value
      return raw && raw !== '' ? raw : (col.rule_value ?? '')

    case 'VALUE_MAP': {
      // rule_value là một map JSON dạng {"STORE":"S","ZONE":"Z"}; tra theo tiền tố trước dấu '_'
      if (raw == null) return null
      const prefix = raw.split('_')[0].toUpperCase()
      const map = parseValueMap(col.rule_value)
      return prefix in map ? map[prefix] : null // tiền tố lạ -> unmappable
    }

    case 'SPLIT': {
      // Lấy phần SAU dấu '_' đầu tiên: 'STORE_001' -> '001'
      if (raw == null) return null
      const i = raw.indexOf('_')
      return i >= 0 ? raw.slice(i + 1) : ''
    }

    default:
      return raw ?? ''
  }
}

// rule_value do người dùng gõ tay nên có thể là JSON hỏng -> hỏng thì coi như map rỗng, đừng để văng lỗi
function parseValueMap(ruleValue: string | null): Record<string, string> {
  if (!ruleValue) return {}
  try {
    const parsed: unknown = JSON.parse(ruleValue)
    return isStringMapValue(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isStringMap(ruleValue: string | null): boolean {
  if (!ruleValue) return false
  try {
    return isStringMapValue(JSON.parse(ruleValue))
  } catch {
    return false
  }
}

function isStringMapValue(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.values(value).every((entry) => typeof entry === 'string')
}
