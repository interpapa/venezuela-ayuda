import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import StatusBadge from "@/components/StatusBadge";
import SourceBadge from "@/components/SourceBadge";
import { timeAgo } from "@/lib/format";
import { CHECKIN_STATUSES, FOUND_BADGE } from "@/lib/constants";
import type { MergedPerson } from "@/lib/people";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// A person, possibly merged from several sources. Mirrors CheckinCard's layout:
// avatar · name · location/updated line · status badge · quoted description ·
// a small "Fuente:" link at the bottom (with "+N fuentes más" when merged).
export default function PersonResultCard({ p }: { p: MergedPerson }) {
  const t = useTranslations("search");
  const tD = useTranslations("domain");
  const s = CHECKIN_STATUSES[p.status];
  const primary = p.sources[0];
  const extra = p.sources.length - 1;

  return (
    <div className="min-w-0 rounded-2xl border border-[#e6ecf2] bg-white p-4">
      <div className="flex items-center gap-3.5">
        {p.photoUrl ? (
          <Image
            src={p.photoUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-semibold"
            style={{ backgroundColor: s.tintBg, color: s.tintText }}
          >
            {initials(p.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[#14212e]">{p.name}</h3>
          <p className="mt-0.5 text-xs text-[#8190a0]">
            {p.locations.length > 0 && `🏢 ${p.locations.join(" · ")} · `}
            {p.updated ? t("card.metaUpdated", { time: timeAgo(p.updated) }) : t("card.noDate")}
          </p>
        </div>
        {p.found ? (
          <span
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: FOUND_BADGE.tintBg, color: FOUND_BADGE.tintText }}
          >
            {FOUND_BADGE.emoji} {tD("foundBadge")}
          </span>
        ) : (
          <StatusBadge status={p.status} />
        )}
      </div>

      {p.description && (
        <p className="mt-3 line-clamp-2 text-sm text-[#5b6b7b]">“{p.description}”</p>
      )}

      {primary && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
          {primary.label === "la app" && primary.href ? (
            <Link
              href={primary.href}
              className="inline-block font-medium text-[#2563a8] underline"
            >
              {t("card.viewInApp")}
            </Link>
          ) : (
            <SourceBadge source={primary.label} url={primary.href} />
          )}
          {extra > 0 && (
            <span className="text-slate-400">· {t("card.moreSources", { count: extra })}</span>
          )}
        </div>
      )}
    </div>
  );
}
