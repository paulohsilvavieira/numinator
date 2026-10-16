import { FileText } from "lucide-react";
import { useT } from "../i18n/translate";

interface ToolbarProps {
  fileName: string | null;
  isDirty: boolean;
}

function Toolbar({ fileName, isDirty }: ToolbarProps) {
  const t = useT();
  return (
    <div className="numi-toolbar">
      <span className="numi-filename">
        <FileText size={14} className="numi-file-icon" />
        {fileName ?? t("untitled")}
        {isDirty && <span className="numi-dirty-dot" title={t("unsavedChanges")} />}
      </span>
    </div>
  );
}

export default Toolbar;
