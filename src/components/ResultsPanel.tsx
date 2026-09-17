import type { RefObject } from "react";
import type { LineResult } from "../engine";

interface ResultsPanelProps {
  results: LineResult[];
  resultsRef: RefObject<HTMLDivElement | null>;
}

function ResultsPanel({ results, resultsRef }: ResultsPanelProps) {
  return (
    <div className="numi-results" ref={resultsRef}>
      {results.map((r, i) => (
        <div key={i} className={"numi-line" + (r.error ? " error" : "")} title={r.error}>
          {r.error ? "!" : r.output}
        </div>
      ))}
    </div>
  );
}

export default ResultsPanel;
