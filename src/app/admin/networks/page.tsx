import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminNetworksPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card className="text-center">
        <p className="mb-3 text-sm text-muted">
          Networks and deposit addresses are managed inline under each asset.
        </p>
        <Link href="/admin/assets">
          <Button size="sm">Go to Assets</Button>
        </Link>
      </Card>
    </div>
  );
}
