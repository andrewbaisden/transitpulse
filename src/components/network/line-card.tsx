import Link from "next/link";
import { ModeIcon, modeLabel } from "@/components/network/mode-icon";
import { ServiceStatusBadge } from "@/components/network/service-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeToNow } from "@/lib/time";
import type { LineWithStatus } from "@/server/queries/network";

export function LineCard({ line }: { line: LineWithStatus }) {
  return (
    <Link href={`/lines/${line.id}`} className="block" data-testid="line-card">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: line.color ?? "#52525b" }}
            />
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <ModeIcon mode={line.mode} className="size-4 text-muted-foreground" />
                {line.name}
              </div>
              <p className="text-xs text-muted-foreground">{modeLabel(line.mode)}</p>
            </div>
          </div>
          <div className="text-right">
            <ServiceStatusBadge status={line.status} />
            <p className="mt-0.5 text-xs text-muted-foreground">
              Updated {formatRelativeToNow(line.statusRecordedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
