import { Card } from "@/components/ui/card";
import type { StaticPageContent } from "@/lib/cms";

export function StaticPageBody({ content, extra }: { content: StaticPageContent; extra?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <Card className="space-y-3 text-sm text-muted">
        {content.intro.split("\n\n").filter(Boolean).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {extra}
      </Card>
      {content.sections.map((s) => (
        <Card key={s.heading}>
          {s.heading && <p className="mb-1 text-sm font-medium text-foreground">{s.heading}</p>}
          {s.body.split("\n\n").filter(Boolean).map((p, i) => (
            <p key={i} className="text-sm text-muted">
              {p}
            </p>
          ))}
        </Card>
      ))}
    </div>
  );
}
