import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { Settings } from '../useSettings';
import { useSystemFonts } from '../useSystemFonts';
import { useT } from '../i18n/translate';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const fonts = useSystemFonts();
  const t = useT();

  const { monospaceFonts, otherFonts } = useMemo(() => {
    const sorted = [...fonts].sort((a, b) => a.name.localeCompare(b.name));
    return {
      monospaceFonts: sorted.filter((f) => f.monospace),
      otherFonts: sorted.filter((f) => !f.monospace),
    };
  }, [fonts]);

  return (
    <div className='settings-overlay' onClick={onClose}>
      <div className='settings-panel' onClick={(e) => e.stopPropagation()}>
        <div className='settings-header'>
          <span>{t('settings')}</span>
          <button
            className='settings-close'
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={14} />
          </button>
        </div>

        <label className='settings-row'>
          <span>{t('font')}</span>
          <select
            value={settings.fontFamily}
            onChange={(e) =>
              onChange({ ...settings, fontFamily: e.target.value })
            }
          >
            {monospaceFonts.length > 0 && (
              <optgroup label={t('fontMonospace')}>
                {monospaceFonts.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            )}
            {otherFonts.length > 0 && (
              <optgroup label={t('fontOther')}>
                {otherFonts.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className='settings-row'>
          <span>
            {t('size')} ({settings.fontSize}px)
          </span>
          <input
            type='range'
            min={11}
            max={24}
            value={settings.fontSize}
            onChange={(e) =>
              onChange({ ...settings, fontSize: Number(e.target.value) })
            }
          />
        </label>
        <label className='settings-row'>
          <span>{t('decimalSeparator')}</span>
          <select
            value={settings.decimal}
            onChange={(e) => {
              const decimal = e.target.value as Settings['decimal'];
              // the two marks can't be the same character
              const thousands =
                settings.thousands === decimal
                  ? settings.decimal
                  : settings.thousands;
              onChange({ ...settings, decimal, thousands });
            }}
          >
            <option value='.'>{t('dot')} (1.5)</option>
            <option value=','>{t('comma')} (1,5)</option>
          </select>
        </label>

        <label className='settings-row'>
          <span>{t('thousandsSeparator')}</span>
          <select
            value={settings.thousands}
            onChange={(e) =>
              onChange({
                ...settings,
                thousands: e.target.value as Settings['thousands'],
              })
            }
          >
            {settings.decimal !== ',' && <option value=','>{t('comma')} (11,000)</option>}
            {settings.decimal !== '.' && <option value='.'>{t('dot')} (11.000)</option>}
            <option value=' '>{t('space')} (11 000)</option>
            <option value=''>{t('none')} (11000)</option>
          </select>
        </label>
        <label className='settings-row'>
          <span>{t('dateFormat')}</span>
          <select
            value={settings.date}
            onChange={(e) =>
              onChange({ ...settings, date: e.target.value as Settings['date'] })
            }
          >
            <option value='system'>{t('system')} (Oct 30, 2026)</option>
            <option value='dmy'>DD/MM/YYYY (30/10/2026)</option>
            <option value='mdy'>MM/DD/YYYY (10/30/2026)</option>
            <option value='ymd'>YYYY-MM-DD (2026-10-30)</option>
          </select>
        </label>
        <label className='settings-row'>
          <span>{t('language')}</span>
          <select
            value={settings.language}
            onChange={(e) =>
              onChange({
                ...settings,
                language: e.target.value as Settings['language'],
              })
            }
          >
            <option value='system'>{t('system')}</option>
            <option value='en'>English</option>
            <option value='pt-BR'>Português (Brasil)</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export default SettingsPanel;
