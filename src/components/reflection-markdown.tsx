"use client";

import { useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { dayKey } from "@/lib/domain";
import {
  parseJournalMentionHref,
  createJournalReferenceCatalog,
} from "@/lib/journal-mentions";
import {
  createJournalReferenceAliases,
  remarkJournalReferences,
} from "@/lib/journal-reference-markdown";
import { JournalReference } from "@/components/journal-reference";
import { useJournal } from "@/components/journal-provider";
import styles from "./reflection-markdown.module.css";

/** User Markdown is rendered as React nodes; HTML and remote image loads stay off. */
export function ReflectionMarkdown({
  value,
  day,
}: {
  value: string;
  day: string;
}) {
  const { data, now } = useJournal();
  const aliases = useMemo(() => createJournalReferenceAliases(data), [data]);
  const today = data && now ? dayKey(now, data.settings.timezone) : "";
  const catalog = useMemo(
    () => createJournalReferenceCatalog(data, today || undefined),
    [data, today],
  );
  return (
    <div className={styles.prose}>
      <Markdown
        remarkPlugins={[
          remarkGfm,
          [remarkJournalReferences, { aliases, today, referenceDay: day }],
        ]}
        skipHtml
        components={{
          a: ({ href, children, title }) => {
            if (!href) return <span>{children}</span>;
            const reference = parseJournalMentionHref(href);
            if (!reference)
              return (
                <a
                  href={href}
                  title={title}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
            return (
              <JournalReference
                href={href}
                reference={reference}
                catalog={catalog}
                title={title}
              >
                {children}
              </JournalReference>
            );
          },
          img: ({ alt, src }) =>
            typeof src === "string" && src ? (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.imageLink}
              >
                {alt || "Image link"} <span>(image)</span>
              </a>
            ) : (
              <span>{alt || "Image"}</span>
            ),
          pre: ({ children }) => (
            <pre tabIndex={0} role="region" aria-label="Code block">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div
              className={styles.tableScroll}
              tabIndex={0}
              role="region"
              aria-label="Markdown table"
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {value}
      </Markdown>
    </div>
  );
}
