import { bodyFontClass, copy, nutrientLabels, t } from '../lib/copy.ts'
import type { Language } from '../lib/language.tsx'
import type { ParsedItem } from '../lib/types.ts'

interface MealPreviewProps {
  items: ParsedItem[]
  language: Language
  isLoading: boolean
  onChange: (items: ParsedItem[]) => void
  onConfirm: () => void
  onCancel: () => void
}

function recomputeItem(item: ParsedItem, qtyG: number): ParsedItem {
  const ratio = qtyG / 100
  return {
    ...item,
    qty_g: qtyG,
    energy_kcal: Math.round(item.per_100g_energy_kcal * ratio * 100) / 100,
    protein_g: Math.round(item.per_100g_protein_g * ratio * 100) / 100,
    iron_mg: Math.round(item.per_100g_iron_mg * ratio * 100) / 100,
    calcium_mg: Math.round(item.per_100g_calcium_mg * ratio * 100) / 100,
    vit_d_iu: Math.round(item.per_100g_vit_d_iu * ratio * 100) / 100,
    b12_mcg: Math.round(item.per_100g_b12_mcg * ratio * 100) / 100,
  }
}

function totals(items: ParsedItem[]) {
  return {
    energy: items.reduce((sum, item) => sum + item.energy_kcal, 0),
    protein: items.reduce((sum, item) => sum + item.protein_g, 0),
    iron: items.reduce((sum, item) => sum + item.iron_mg, 0),
    calcium: items.reduce((sum, item) => sum + item.calcium_mg, 0),
    vit_d: items.reduce((sum, item) => sum + item.vit_d_iu, 0),
    b12: items.reduce((sum, item) => sum + item.b12_mcg, 0),
  }
}

export function MealPreview({
  items,
  language,
  isLoading,
  onChange,
  onConfirm,
  onCancel,
}: MealPreviewProps) {
  const handleQtyChange = (index: number, value: string) => {
    const qty = parseFloat(value)
    if (Number.isNaN(qty) || qty < 0) return
    const next = [...items]
    next[index] = recomputeItem(next[index], qty)
    onChange(next)
  }

  const handleRemove = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onChange(next)
  }

  const tTotals = totals(items)
  const canConfirm = items.length > 0 && items.some((item) => item.matched)

  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-medium text-text-main dark:text-[#F5F1F7]">
        {t(copy.dashboard.previewTitle, language)}
      </h3>
      <p className={`${bodyFontClass(language)} text-sm text-text-muted dark:text-[#C5BECF]`}>
        {t(copy.dashboard.confirmHint, language)}
      </p>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="border border-border rounded-data p-3 space-y-2 dark:bg-[#272731] dark:border-[#34313D] dark:rounded-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`${bodyFontClass(language)} text-sm font-medium text-text-main dark:text-[#F5F1F7]`}>
                  {item.food_name}
                  {!item.matched && (
                    <span className="ml-2 text-xs text-rose dark:text-[#F08B9C]">
                      ({t(copy.dashboard.notMatched, language)})
                    </span>
                  )}
                </p>
                <p className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF]`}>
                  {item.serving_description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={isLoading}
                className={`${bodyFontClass(language)} text-xs text-rose dark:text-[#F08B9C] hover:text-rose/80 dark:hover:text-[#F08B9C]/80 disabled:opacity-50`}
              >
                {t(copy.dashboard.remove, language)}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF]`}>
                {t(copy.dashboard.quantity, language)}
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={item.qty_g}
                  onChange={(e) => handleQtyChange(index, e.target.value)}
                  disabled={isLoading}
                  className="ml-2 w-24 px-2 py-1 bg-background border border-border rounded-data text-sm text-text-main focus-visible:outline-text-main disabled:opacity-60 dark:bg-[#18181F] dark:text-[#F5F1F7] dark:border-[#34313D] dark:rounded-lg"
                />
              </label>
              <span className={`${bodyFontClass(language)} text-xs text-text-muted dark:text-[#C5BECF]`}>
                {Math.round(item.iron_mg)}mg {t(nutrientLabels.iron, language)} ·{' '}
                {Math.round(item.calcium_mg)}mg {t(nutrientLabels.calcium, language)} ·{' '}
                {Math.round(item.vit_d_iu)}IU {t(nutrientLabels.vit_d, language)} ·{' '}
                {Math.round(item.b12_mcg)}mcg {t(nutrientLabels.b12, language)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className={`${bodyFontClass(language)} flex flex-wrap gap-4 text-sm text-text-muted dark:text-[#C5BECF] border-t border-border dark:border-[#34313D] pt-3`}>
        <span>{Math.round(tTotals.iron)}mg {t(nutrientLabels.iron, language)}</span>
        <span>
          {Math.round(tTotals.calcium)}mg {t(nutrientLabels.calcium, language)}
        </span>
        <span>
          {Math.round(tTotals.vit_d)}IU {t(nutrientLabels.vit_d, language)}
        </span>
        <span>
          {Math.round(tTotals.b12)}mcg {t(nutrientLabels.b12, language)}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !canConfirm}
          className={`${bodyFontClass(language)} flex-1 px-4 py-3 bg-primary hover:bg-primary-hover text-white dark:bg-[#E9A5D1] dark:hover:bg-[#CE8BB8] dark:text-[#121216] rounded-data dark:rounded-xl text-base font-medium disabled:opacity-50 transition-colors`}
        >
          {isLoading
            ? t(copy.dashboard.logging, language)
            : t(copy.dashboard.confirmLog, language)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={`${bodyFontClass(language)} flex-1 px-4 py-3 bg-card border border-border text-text-main rounded-data dark:rounded-xl font-medium disabled:opacity-50 hover:bg-background dark:bg-[#272731] dark:border-[#34313D] dark:text-[#F5F1F7] dark:hover:bg-[#302D39] transition-colors`}
        >
          {t(copy.dashboard.cancel, language)}
        </button>
      </div>
    </div>
  )
}
