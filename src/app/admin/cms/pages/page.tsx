"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type PageRow = { slug: string; title: string; enabled: boolean; updatedAt: string | null };

export default function AdminCmsPagesList() {
  const [pages, setPages] = useState<PageRow[]>([]);

  useEffect(() => {
    apiFetch<{ pages: PageRow[] }>("/api/admin/cms/pages").then((res) => setPages(res.pages));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Pages</h1>
      <Card className="divide-y divide-border p-0">
        {pages.map((p) => (
          <Link key={p.slug} href={`/admin/cms/pages/${p.slug}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2/60">
            <div>
              <p className="text-sm font-medium">{p.title}</p>
              <p className="text-xs text-muted">/{p.slug}</p>
            </div>
            <p className="text-xs text-muted">{p.updatedAt ? `Edited ${formatDate(p.updatedAt)}` : "Default content"}</p>
          </Link>
        ))}
      </Card>
    </div>
  );
}
