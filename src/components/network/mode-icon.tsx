import { Bus, TrainFront, TrainTrack, TramFront } from "lucide-react";
import type { TransportMode } from "@/server/domain/types";

const MODE_ICON: Record<TransportMode, typeof TrainFront> = {
  TUBE: TrainFront,
  OVERGROUND: TrainFront,
  ELIZABETH_LINE: TrainFront,
  DLR: TrainTrack,
  BUS: Bus,
  TRAM: TramFront,
};

export function ModeIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  const Icon = MODE_ICON[mode];
  return <Icon aria-hidden className={className} />;
}

export function modeLabel(mode: TransportMode): string {
  switch (mode) {
    case "TUBE":
      return "Underground";
    case "OVERGROUND":
      return "Overground";
    case "ELIZABETH_LINE":
      return "Elizabeth line";
    case "DLR":
      return "DLR";
    case "BUS":
      return "Bus";
    case "TRAM":
      return "Tram";
  }
}
