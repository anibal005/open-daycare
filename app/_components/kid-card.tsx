import type { Child } from "@/lib/children";
import { AVATAR_TONES } from "@/lib/children";

function buildParentsLabel(parentsCount: number): string {
  if (parentsCount === 0) return "sin padres vinculados";
  if (parentsCount === 1) return "1 padre vinculado";
  return `${parentsCount} padres vinculados`;
}

export default function KidCard({ child }: { child: Child }) {
  const tone = AVATAR_TONES[child.tone];

  return (
    <a
      href={`/kid/${child.id}`}
      className="flex min-w-0 items-center gap-[14px] rounded-[18px] border border-line bg-card p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition duration-150 hover:-translate-y-0.5 hover:border-kid-hover"
    >
      <div
        className={`font-fredoka flex size-12 flex-none items-center justify-center rounded-full text-[19px] font-semibold ${tone.bg} ${tone.text}`}
      >
        {child.avatarLetter}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-fredoka text-[16px] font-semibold text-ink">
          {child.name}
        </div>
        <div className="text-[13px] text-muted">
          {child.ageLabel} · {buildParentsLabel(child.parentsCount)}
        </div>
      </div>

      {child.allergyTag ? (
        <span className="flex-none rounded-full bg-[#FBD8CC] px-[9px] py-[5px] text-[11px] font-extrabold text-[#D9684A]">
          {child.allergyTag}
        </span>
      ) : child.needsParentLink ? (
        <span className="flex-none rounded-full bg-[#F9D2DE] px-[9px] py-[5px] text-[11px] font-extrabold text-[#C56486]">
          VINCULAR
        </span>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#CBB89F"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-none"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </a>
  );
}
