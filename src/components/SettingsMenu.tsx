import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import type { Settings } from '../useSettings';
import SettingsPanel from './SettingsPanel';
import { useT } from '../i18n/translate';

interface SettingsMenuProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

function SettingsMenu({ settings, onChange }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('openSettings')}
        className='settings-trigger'
        title={t('settings')}
      >
        <SettingsIcon size={16} />
      </button>
      {open && (
        <SettingsPanel
          settings={settings}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default SettingsMenu;
