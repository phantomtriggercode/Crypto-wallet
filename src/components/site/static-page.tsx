import { Card } from "@/components/ui/card";
import type { StaticPageContent } from "@/lib/cms";

// Body text saved by the WYSIWYG CMS editor is HTML; content saved before that editor existed
// is plain text with blank-line-separated paragraphs. Detect which one we've got so both render.
const isHtml = (text: string) => /^\s*<[a-z][\s\S]*>/i.test(text);

function RichText({ text, className }: { text: string; className?: string }) {
  if (isHtml(text)) {
    return <div className={`prose-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: text }} />;
  }
  return (
    <div className={className}>
      {text.split("\n\n").filter(Boolean).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function StaticPageBody({ content, extra }: { content: StaticPageContent; extra?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <Card className="space-y-3 text-sm text-muted">
        <RichText text={content.intro} />
        {extra}
      </Card>
      {content.sections.map((s) => (
        <Card key={s.heading}>
          {s.heading && <p className="mb-1 text-sm font-medium text-foreground">{s.heading}</p>}
          <RichText text={s.body} className="text-sm text-muted" />
        </Card>
      ))}
    </div>
  );
}
