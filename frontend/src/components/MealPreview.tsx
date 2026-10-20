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
      <div>
        <h3 className="font-display text-lg font-bold text-dark-text">
          {t(copy.dashboard.previewTitle, language)}
        </h3>
        <p className={`${bodyFontClass(language)} text-xs sm:text-sm text-muted mt-0.5`}>
          {t(copy.dashboard.confirmHint, language)}
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="border border-border/80 bg-background/50 rounded-2xl p-4 space-y-3 transition-all hover:border-primary/40 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`${bodyFontClass(language)} text-sm font-bold text-dark-text`}>
                  {item.food_name}
                  {!item.matched && (
                    <span className="ml-2 text-xs font-semibold text-rose">
                      ({t(copy.dashboard.notMatched, language)})
                    </span>
                  )}
                </p>
                <p className={`${bodyFontClass(language)} text-xs text-muted mt-0.5`}>
                  {item.serving_description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={isLoading}
                className={`${bodyFontClass(language)} px-2.5 py-1 rounded-full text-xs font-semibold text-rose hover:bg-rose/10 transition-colors disabled:opacity-50`}
              >
                {t(copy.dashboard.remove, language)}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
              <label className={`${bodyFontClass(language)} text-xs text-muted font-medium flex items-center`}>
                {t(copy.dashboard.quantity, language)}:
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={item.qty_g}
                  onChange={(e) => handleQtyChange(index, e.target.value)}
                  disabled={isLoading}
                  className="ml-2 w-20 px-2.5 py-1 bg-white border border-border rounded-xl text-xs font-bold text-dark-text focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
                />
              </label>

              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-muted">
                <span className="bg-soft-pink px-2 py-0.5 rounded-md text-primary-dark">{Math.round(item.iron_mg)}mg iron</span>
                <span className="bg-light-olive px-2 py-0.5 rounded-md text-olive-deep border border-olive/20">{Math.round(item.calcium_mg)}mg calcium</span>
                <span className="bg-amber/10 px-2 py-0.5 rounded-md text-amber">{Math.round(item.vit_d_iu)}IU vit D</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Totals Summary */}
      <div className={`${bodyFontClass(language)} p-3.5 bg-soft-pink/50 rounded-2xl flex flex-wrap gap-3 text-xs font-bold text-primary-dark border border-border/60`}>
        <span>💧 {Math.round(tTotals.iron)}mg {t(copy.dashboard.iron, language)}</span>
        <span>🦴 {Math.round(tTotals.calcium)}mg {t(nutrientLabels.calcium, language)}</span>
        <span>☀️ {Math.round(tTotals.vit_d)}IU {t(nutrientLabels.vit_d, language)}</span>
        <span>✨ {Math.round(tTotals.b12)}mcg {t(nutrientLabels.b12, language)}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !canConfirm}
          className={`${bodyFontClass(language)} flex-1 px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-sm font-semibold shadow-fab hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50`}
        >
          {isLoading
            ? t(copy.dashboard.logging, language)
            : t(copy.dashboard.confirmLog, language)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={`${bodyFontClass(language)} px-6 py-3.5 bg-card border border-border text-dark-text hover:bg-soft-pink/50 rounded-full text-sm font-semibold transition-all disabled:opacity-50`}
        >
          {t(copy.dashboard.cancel, language)}
        </button>
      </div>
    </div>
  )
}
