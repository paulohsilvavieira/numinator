import { X } from 'lucide-react';
import { FONT_OPTIONS, type Settings } from '../useSettings';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
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
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
      </div>
    </div>
  );
}

export default SettingsPanel;
