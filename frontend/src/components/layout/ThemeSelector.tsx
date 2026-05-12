import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme, COLOR_THEMES, COLOR_THEME_SWATCHES } from '@/hooks/useTheme'
import type { ColorTheme } from '@/hooks/useTheme'

export function ThemeSelector() {
  const { t } = useTranslation()
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <Select value={colorTheme} onValueChange={v => setColorTheme(v as ColorTheme)}>
      <SelectTrigger className="h-8 w-[110px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COLOR_THEMES.map(ct => (
          <SelectItem key={ct} value={ct}>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0 border border-border"
                style={{ backgroundColor: COLOR_THEME_SWATCHES[ct] }}
              />
              {t(`theme.${ct}`)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
