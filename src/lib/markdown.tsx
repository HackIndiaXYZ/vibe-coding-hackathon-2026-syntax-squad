// Tiny markdown renderer to avoid extra deps. Handles headings, bold, italic,
// lists, code, links, paragraphs and basic tables.
import { type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  const push = (n: ReactNode) => nodes.push(<span key={key++}>{n}</span>);
  // bold **x**, italic *x*, code `x`, links [a](b)
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/;
  while (rest.length) {
    const m = rest.match(re);
    if (!m) { push(rest); break; }
    if (m.index! > 0) push(rest.slice(0, m.index));
    if (m[2]) push(<strong>{m[2]}</strong>);
    else if (m[3]) push(<em>{m[3]}</em>);
    else if (m[4]) push(<code className="rounded bg-muted px-1 py-0.5 text-xs">{m[4]}</code>);
    else if (m[5]) push(<a href={m[6]} target="_blank" rel="noreferrer" className="text-primary underline">{m[5]}</a>);
    rest = rest.slice(m.index! + m[0].length);
  }
  return nodes;
}

export default function ReactMarkdown({ children }: { children: string }) {
  const lines = children.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Table
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      const header = line.split("|").slice(1, -1).map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((s) => s.trim()));
        i++;
      }
      out.push(
        <table key={k++} className="my-3 w-full border-collapse text-sm">
          <thead>
            <tr>{header.map((h, j) => <th key={j} className="border-b px-2 py-1.5 text-left font-semibold">{inline(h)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b last:border-0">
                {r.map((c, ci) => <td key={ci} className="px-2 py-1.5 align-top">{inline(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const cls = lvl === 1 ? "text-xl font-bold mt-3" : lvl === 2 ? "text-lg font-semibold mt-3" : "text-base font-semibold mt-2";
      out.push(<div key={k++} className={cls}>{inline(h[2])}</div>);
      i++;
      continue;
    }
    // List
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={k++} className="my-2 list-disc pl-5 space-y-1">
          {items.map((it, idx) => <li key={idx}>{inline(it)}</li>)}
        </ul>,
      );
      continue;
    }
    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={k++} className="my-2 list-decimal pl-5 space-y-1">
          {items.map((it, idx) => <li key={idx}>{inline(it)}</li>)}
        </ol>,
      );
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    out.push(<p key={k++} className="my-2 leading-relaxed">{inline(line)}</p>);
    i++;
  }
  return <div>{out}</div>;
}
