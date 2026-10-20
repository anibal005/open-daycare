import type { Parent } from "@/lib/children";
import {
  AVATAR_TONES,
  PARENT_STATUS_LABELS,
  PARENT_STATUS_META,
} from "@/lib/children";

export default function LinkedParents({ parents }: { parents: Parent[] }) {
  return (
    <div className="rounded-[16px] border border-line bg-card p-[16px] px-[18px]">
      <div className="mb-[14px] text-[12.5px] font-extrabold tracking-[.8px] text-muted-mid">
        PADRES VINCULADOS
      </div>

      <div className="flex flex-col gap-[14px]">
        {parents.map((parent) => {
          const tone = AVATAR_TONES[parent.tone];
          const status = PARENT_STATUS_LABELS[parent.status];

          return (
            <div key={parent.name} className="flex items-center gap-3">
              <div
                className={`font-fredoka flex size-10 flex-none items-center justify-center rounded-full text-[16px] font-semibold ${tone.bg} ${tone.text}`}
              >
                {parent.avatarLetter}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-extrabold text-ink">
                  {parent.name}
                </div>
                <div className="text-[12.5px] text-muted">
                  {parent.roleLabel} · {PARENT_STATUS_META[parent.status]}
                </div>
              </div>
              <span
                className={`flex-none rounded-full px-[9px] py-1 text-[10.5px] font-extrabold ${status.bg} ${status.text}`}
              >
                {status.label}
              </span>
            </div>
          );
        })}

        <a href="#" className="flex items-center gap-3 pt-2">
          <span className="flex size-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="text-[14.5px] font-extrabold text-alert-title">
            Vincular otro padre
          </span>
        </a>
      </div>
    </div>
  );
}
