import { useRef } from "react";

// The editor's syntax-highlight layer and the results column are both
// plain scrollable divs stacked/positioned next to the real <textarea>;
// keeping them in lockstep is just copying scrollTop on every scroll event.
export function useSyncedScroll() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop } = textareaRef.current;
    if (highlightRef.current) highlightRef.current.scrollTop = scrollTop;
    if (resultsRef.current) resultsRef.current.scrollTop = scrollTop;
  };

  return { textareaRef, highlightRef, resultsRef, syncScroll };
}
