import AddChildModal from "@/app/_components/add-child-modal";
import KidCard from "@/app/_components/kid-card";
import Sidebar from "@/app/_components/sidebar";
import { children } from "@/lib/children";

export default function KidsPage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar activeItem="kids" />

      <main className="h-screen flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-10 pt-[34px] pb-20">
          <div className="mb-[22px] flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-coral-dark">
                GESTIÓN
              </div>
              <h1 className="font-fredoka m-0 text-[30px] font-semibold text-ink">
                Niños
              </h1>
            </div>
            <AddChildModal />
          </div>

          <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-line bg-card px-4 py-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B0A290"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-none"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              readOnly
              placeholder="Buscar niño…"
              className="min-w-0 flex-1 bg-transparent px-[2px] py-[1px] text-[15px] text-ink placeholder:text-[#B6A99B]"
            />
          </div>

          <div className="mb-[14px] flex items-center gap-3">
            <span className="text-[12.5px] font-extrabold tracking-[.8px] text-ink">
              SALA SOLES
            </span>
            <span className="text-[13px] text-muted">{children.length} niños</span>
            <span className="h-px flex-1 bg-line-divider" />
          </div>

          <div className="grid grid-cols-2 gap-[14px]">
            {children.map((child) => (
              <KidCard key={child.id} child={child} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
