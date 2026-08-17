import { Fragment, type ReactNode } from "react";
import {
  romanSectionHeadingPattern,
  romanSubsectionHeadingPattern,
} from "../lore-subsections";

type LoreContentSection = {
  id: string;
  lineIndex: number;
  numeral: string;
  title: string;
  level: 2 | 3;
};

function extractLoreContentSections(lines: string[]) {
  const occurrenceByNumeral = new Map<string, number>();

  return lines.flatMap<LoreContentSection>((line, lineIndex) => {
    const subsectionMatch = line.trim().match(romanSubsectionHeadingPattern);
    const sectionMatch = subsectionMatch ? null : line.trim().match(romanSectionHeadingPattern);
    const match = subsectionMatch ?? sectionMatch;
    if (!match) return [];

    const numeral = subsectionMatch
      ? `${match[1].toUpperCase()}-${match[2].toUpperCase()}`
      : match[1].toUpperCase();
    const occurrence = (occurrenceByNumeral.get(numeral) ?? 0) + 1;
    occurrenceByNumeral.set(numeral, occurrence);

    return [{
      id: `chronicle-section-${numeral.toLowerCase()}${occurrence > 1 ? `-${occurrence}` : ""}`,
      lineIndex,
      numeral,
      title: match[subsectionMatch ? 3 : 2].trim(),
      level: subsectionMatch ? 3 : 2,
    }];
  });
}

function renderInlineFormatting(value: string, keyPrefix: string) {
  const tokens = value.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{token}</Fragment>;
  });
}

function renderTextWithBreaks(value: string, keyPrefix: string): ReactNode[] {
  return value.split("\n").flatMap((line, index, lines) => [
    ...renderInlineFormatting(line, `${keyPrefix}-line-${index}`),
    ...(index < lines.length - 1
      ? [<br key={`${keyPrefix}-break-${index}`} />]
      : []),
  ]);
}

function isBlockStart(line: string, recognizeRomanSections: boolean) {
  return (
    /^#{1,3}\s+/.test(line) ||
    (recognizeRomanSections && (
      romanSubsectionHeadingPattern.test(line.trim()) ||
      romanSectionHeadingPattern.test(line.trim())
    )) ||
    /^[-*]\s+/.test(line) ||
    /^\d+\.\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*---\s*$/.test(line)
  );
}

export function LoreFormattedContent({
  content,
  showTableOfContents = false,
}: {
  content: string;
  showTableOfContents?: boolean;
}) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const sections = showTableOfContents ? extractLoreContentSections(lines) : [];
  const sectionByLine = new Map(sections.map((section) => [section.lineIndex, section]));

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s*---\s*$/.test(line)) {
      blocks.push(<hr key={`rule-${index}`} />);
      index += 1;
      continue;
    }

    const romanSection = sectionByLine.get(index);
    if (romanSection) {
      const children = <>
          <span className="chronicle-section-numeral">{romanSection.numeral}.</span>{" "}
          {renderInlineFormatting(romanSection.title, `roman-section-${index}`)}
        </>;
      blocks.push(romanSection.level === 2
        ? <h2 id={romanSection.id} key={`roman-section-${index}`}>{children}</h2>
        : <h3 id={romanSection.id} key={`roman-section-${index}`}>{children}</h3>);
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const children = renderInlineFormatting(heading[2], `heading-${index}`);
      blocks.push(
        level === 1 ? <h2 key={`heading-${index}`}>{children}</h2>
          : level === 2 ? <h3 key={`heading-${index}`}>{children}</h3>
            : <h4 key={`heading-${index}`}>{children}</h4>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      const listStart = index;
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        const item = lines[index].replace(/^[-*]\s+/, "");
        items.push(<li key={`unordered-${index}`}>{renderInlineFormatting(item, `unordered-${index}`)}</li>);
        index += 1;
      }
      blocks.push(<ul key={`unordered-list-${listStart}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      const listStart = index;
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        const item = lines[index].replace(/^\d+\.\s+/, "");
        items.push(<li key={`ordered-${index}`}>{renderInlineFormatting(item, `ordered-${index}`)}</li>);
        index += 1;
      }
      blocks.push(<ol key={`ordered-list-${listStart}`}>{items}</ol>);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteStart = index;
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${quoteStart}`}>
          {renderTextWithBreaks(quoteLines.join("\n"), `quote-${quoteStart}`)}
        </blockquote>,
      );
      continue;
    }

    const paragraphStart = index;
    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      (index === paragraphStart || !isBlockStart(lines[index], showTableOfContents))
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${paragraphStart}`}>
        {renderTextWithBreaks(paragraphLines.join("\n"), `paragraph-${paragraphStart}`)}
      </p>,
    );
  }

  return (
    <>
      {sections.length > 1 && (
        <nav className="chronicle-record-contents" aria-label="Table of contents">
          <details>
            <summary>
              <span>TABLE OF CONTENTS</span>
              <small>{String(sections.length).padStart(2, "0")} RECORD DIVISIONS</small>
            </summary>
            <ol>
              {sections.map((section) => (
                <li key={section.id} className={section.level === 3 ? "is-subsection" : undefined}>
                  <a href={`#${section.id}`}>
                    <span>{section.numeral}</span>
                    <strong>{section.title}</strong>
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </nav>
      )}
      <div className="chronicle-record-content">{blocks}</div>
    </>
  );
}
