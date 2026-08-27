import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { marked } from "marked";

/**
 * Renders streamed markdown without re-parsing the whole message on every
 * token. `marked.lexer` splits the text into top-level blocks (paragraphs,
 * list items, ...); each block is memoized independently, so a token
 * appended to the last block doesn't re-render the ones before it.
 */
const MarkdownBlock = memo(
  ({ content }: { content: string }) => <ReactMarkdown>{content}</ReactMarkdown>,
  (prev, next) => prev.content === next.content,
);
MarkdownBlock.displayName = "MarkdownBlock";

export const MemoizedMarkdown = memo(({ content, id }: { content: string; id: string }) => {
  const blocks = useMemo(() => marked.lexer(content).map((token) => token.raw), [content]);

  return blocks.map((block, i) => (
    <MarkdownBlock content={block} key={`${id}-block_${i}`} />
  ));
});
MemoizedMarkdown.displayName = "MemoizedMarkdown";
