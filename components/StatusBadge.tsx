export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pending:  { color: 'bg-gray-100 text-gray-600',   label: '未送信' },
    sent:     { color: 'bg-green-100 text-green-700',  label: '送信済' },
    failed:   { color: 'bg-red-100 text-red-700',      label: '失敗' },
    skipped:  { color: 'bg-yellow-100 text-yellow-700',label: 'スキップ' },
    success:  { color: 'bg-green-100 text-green-700',  label: '成功' },
  }
  const { color, label } = map[status] ?? { color: 'bg-gray-100 text-gray-500', label: status }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}
