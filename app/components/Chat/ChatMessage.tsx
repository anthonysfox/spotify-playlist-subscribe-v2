import { MemoizedMarkdown } from "../MemoizedMarkdown";
import { PlaylistResultCards } from "./PlaylistPreviewCards";

export function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-[#CC5500] to-[#A0522D] text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {message.parts.map((part: any, i: number) => {
          if (part.type === "text") {
            if (isUser) {
              return (
                <span key={i} className="whitespace-pre-wrap">
                  {part.text}
                </span>
              );
            }
            return (
              <div
                key={i}
                className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-1.5 prose-pre:my-1.5 prose-a:text-[#CC5500]"
              >
                <MemoizedMarkdown content={part.text} id={`${message.id}-${i}`} />
              </div>
            );
          }
          // searchPlaylists results get real cards with a lazy-loaded track
          // preview; every other tool call just gets a status pill — showing
          // the agent's work without pretending to know how to render it.
          if (
            part.type === "tool-searchPlaylists" &&
            part.state === "output-available" &&
            Array.isArray(part.output)
          ) {
            return <PlaylistResultCards key={i} playlists={part.output} />;
          }
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            return <ToolPill key={i} name={part.type.replace("tool-", "")} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolPill({ name }: { name: string }) {
  return (
    <span className="my-1 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-black/5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CC5500]" />
      {name.replace(/_/g, " ")}
    </span>
  );
}

export function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3.5 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
