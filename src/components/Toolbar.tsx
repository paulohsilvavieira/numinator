import { FileText } from "lucide-react";

interface ToolbarProps {
  fileName: string | null;
  isDirty: boolean;
}

function Toolbar({ fileName, isDirty }: ToolbarProps) {
  return (
    <div className="numi-toolbar">
      <span className="numi-filename">
        <FileText size={14} className="numi-file-icon" />
        {fileName ?? "Untitled"}
        {isDirty && <span className="numi-dirty-dot" title="Unsaved changes" />}
      </span>
    </div>
  );
}

export default Toolbar;
