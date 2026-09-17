import { useMemo, type RefObject } from "react";
import { highlightLine } from "../highlight";

interface EditorProps {
  text: string;
  onChange: (text: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  highlightRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

// Two layers stacked on top of each other: a transparent-text <textarea>
// (so the caret/selection still work natively) sits over a read-only div
// that renders the same lines with syntax colors via the engine tokenizer.
function Editor({ text, onChange, textareaRef, highlightRef, onScroll }: EditorProps) {
  const lines = useMemo(() => text.split("\n"), [text]);

  return (
    <div className="numi-editor">
      <div className="numi-highlight" ref={highlightRef} aria-hidden="true">
        {lines.map((line, i) => (
          <div key={i} className="numi-line-src" dangerouslySetInnerHTML={{ __html: highlightLine(line) }} />
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="numi-input"
        value={text}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onScroll={onScroll}
      />
    </div>
  );
}

export default Editor;
