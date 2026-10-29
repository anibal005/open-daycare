import AddChildModal from "@/app/_components/add-child-modal";
import KidCard from "@/app/_components/kid-card";
import Sidebar from "@/app/_components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { connection } from "next/server";

async function KidsContent() {
  await connection();
  const supabase = await createClient();
  const [{ data: roomsData }, { data: childrenData }] = await Promise.all([
    supabase.from("rooms").select("*").order("name"),
    supabase
      .from("children")
      .select("*, rooms(name)")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);
  const rooms = roomsData || [];

  interface ChildRow {
    id: string;
    full_name: string;
    birth_date: string;
    enrolled_at: string;
    allergy_tags?: string[] | null;
    medical_notes?: string | null;
    rooms?: { name: string } | null;
  }

  interface RoomRow {
    id: string;
    name: string;
  }

  const now = new Date();
  const childrenList = ((childrenData || []) as ChildRow[]).map((child) => {
    const birthDate = new Date(child.birth_date);
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    const ageLabel = age === 1 ? "1 año" : `${age} años`;

    return {
      id: child.id,
      name: child.full_name,
      avatarLetter: child.full_name?.charAt(0)?.toUpperCase() || "?",
      tone: "blue" as const,
      ageLabel,
      parentsCount: 0,
      allergyTag: child.allergy_tags?.[0]?.toUpperCase(),
      needsParentLink: false,
      profile: {
        birthDate: birthDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
        room: child.rooms?.name || "",
        admission: new Date(child.enrolled_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
        allergyNote: child.medical_notes || undefined,
        parents: [],
      },
    };
  });

  const roomList = (rooms as RoomRow[]).map((room) => ({
    id: room.id,
    name: room.name,
  }));
  const roomToShow = roomList.find((r) => r.name === "Sala Soles") || roomList[0];

  return (
    <>
      <div className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-coral-dark">
            GESTIÓN
          </div>
          <h1 className="font-fredoka m-0 text-[30px] font-semibold text-ink">
            Niños
          </h1>
        </div>
        <AddChildModal rooms={roomList} />
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
          {(roomToShow?.name || "SALA SOLES").toUpperCase()}
        </span>
        <span className="text-[13px] text-muted">{childrenList.length} niños</span>
        <span className="h-px flex-1 bg-line-divider" />
      </div>

      <div className="grid grid-cols-2 gap-[14px]">
        {childrenList.map((child) => (
          <KidCard key={child.id} child={child} />
        ))}
      </div>
    </>
  );
}

export default function KidsPage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar activeItem="kids" />

      <main className="h-screen flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-10 pt-[34px] pb-20">
          <Suspense fallback={<div>Cargando...</div>}>
            <KidsContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
