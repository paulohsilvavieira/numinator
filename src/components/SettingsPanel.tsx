import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { Settings } from '../useSettings';
import { useSystemFonts } from '../useSystemFonts';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const fonts = useSystemFonts();

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
          <span>Settings</span>
          <button
            className='settings-close'
            onClick={onClose}
            aria-label='Close'
          >
            <X size={14} />
          </button>
        </div>

        <label className='settings-row'>
          <span>Font</span>
          <select
            value={settings.fontFamily}
            onChange={(e) =>
              onChange({ ...settings, fontFamily: e.target.value })
            }
          >
            {monospaceFonts.length > 0 && (
              <optgroup label='Monospace'>
                {monospaceFonts.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            )}
            {otherFonts.length > 0 && (
              <optgroup label='Other fonts'>
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
          <span>Size ({settings.fontSize}px)</span>
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
          <span>Decimal separator</span>
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
            <option value='.'>Dot (1.5)</option>
            <option value=','>Comma (1,5)</option>
          </select>
        </label>

        <label className='settings-row'>
          <span>Thousands separator</span>
          <select
            value={settings.thousands}
            onChange={(e) =>
              onChange({
                ...settings,
                thousands: e.target.value as Settings['thousands'],
              })
            }
          >
            {settings.decimal !== ',' && <option value=','>Comma (11,000)</option>}
            {settings.decimal !== '.' && <option value='.'>Dot (11.000)</option>}
            <option value=' '>Space (11 000)</option>
            <option value=''>None (11000)</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export default SettingsPanel;
