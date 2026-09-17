import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import type { Settings } from '../useSettings';
import SettingsPanel from './SettingsPanel';

interface SettingsMenuProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

function SettingsMenu({ settings, onChange }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        aria-label='Open settings'
        className='settings-trigger'
        title='Settings'
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
