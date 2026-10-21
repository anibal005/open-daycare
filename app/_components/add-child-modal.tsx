"use client";

import { useEffect, useRef, useState } from "react";
import { ROOMS } from "@/lib/rooms";

const FIELD_LABEL_CLASS = "mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark";
const INPUT_CLASS =
  "w-full rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none";

export default function AddChildModal() {
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const birthDateInputRef = useRef<HTMLInputElement>(null);
  const roomSelectRef = useRef<HTMLSelectElement>(null);
  const allergiesInputRef = useRef<HTMLInputElement>(null);
  const medicalNotesRef = useRef<HTMLTextAreaElement>(null);

  const wasOpenRef = useRef(false);

  // While the modal is open: focus the first field, close on Escape, keep the
  // Tab focus inside the dialog and lock the page scroll.
  useEffect(() => {
    if (!isOpen) return;

    const candidates: (HTMLElement | null)[] = [
      cancelButtonRef.current,
      saveButtonRef.current,
      nameInputRef.current,
      birthDateInputRef.current,
      roomSelectRef.current,
      allergiesInputRef.current,
      medicalNotesRef.current,
    ];
    const focusables = candidates.filter(
      (element): element is HTMLElement => element !== null,
    );

    // `preventScroll` keeps the background page at the same scroll offset:
    // the modal lives inside the `main` scroll container in the DOM.
    nameInputRef.current?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      const activeIndex = focusables.indexOf(
        document.activeElement as HTMLElement,
      );

      if (activeIndex === -1) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && activeIndex === 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeIndex === focusables.length - 1) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  // Give the focus back to the trigger once the modal is closed.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.7)]"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar niño
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-child-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] p-6"
        >
          <div className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-line bg-modal-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
            <div className="flex items-center justify-between border-b border-line px-[26px] py-[20px]">
              <button
                type="button"
                ref={cancelButtonRef}
                onClick={() => setIsOpen(false)}
                className="cursor-pointer text-[15px] font-bold text-muted-dark"
              >
                Cancelar
              </button>
              <span
                id="add-child-title"
                className="font-fredoka text-[18px] font-semibold text-ink"
              >
                Agregar niño
              </span>
              {/* The header lives outside the <form>, so the submit button is
                  linked to it with the `form` attribute. */}
              <button
                type="submit"
                form="add-child-form"
                ref={saveButtonRef}
                className="cursor-pointer text-[15px] font-extrabold text-coral-dark"
              >
                Guardar
              </button>
            </div>

            <form
              id="add-child-form"
              onSubmit={(event) => {
                event.preventDefault();
                setIsOpen(false);
              }}
              className="px-[26px] py-[24px]"
            >
              <label htmlFor="child-name" className={FIELD_LABEL_CLASS}>
                NOMBRE COMPLETO
              </label>
              <input
                id="child-name"
                ref={nameInputRef}
                type="text"
                placeholder="Ej. Martina López"
                className={`mb-[18px] ${INPUT_CLASS}`}
              />

              <div className="flex gap-[14px]">
                <div className="min-w-0 flex-1">
                  <label htmlFor="child-birth-date" className={FIELD_LABEL_CLASS}>
                    FECHA DE NACIMIENTO
                  </label>
                  <input
                    id="child-birth-date"
                    ref={birthDateInputRef}
                    type="text"
                    placeholder="dd/mm/aaaa"
                    className={`mb-[18px] min-w-0 ${INPUT_CLASS}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="child-room" className={FIELD_LABEL_CLASS}>
                    SALA
                  </label>
                  <div className="relative">
                    <select
                      id="child-room"
                      ref={roomSelectRef}
                      className="w-full appearance-none rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] pr-[42px] text-[15px] font-bold text-ink focus:outline-none"
                    >
                      {ROOMS.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#B0A290"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <label htmlFor="child-allergies" className={FIELD_LABEL_CLASS}>
                ALERGIAS (ETIQUETAS)
              </label>
              <input
                id="child-allergies"
                ref={allergiesInputRef}
                type="text"
                placeholder="Ej. Maní, Lactosa"
                className={`mb-[18px] ${INPUT_CLASS}`}
              />

              <label htmlFor="child-medical-notes" className={FIELD_LABEL_CLASS}>
                NOTAS MÉDICAS
              </label>
              <textarea
                id="child-medical-notes"
                ref={medicalNotesRef}
                placeholder="Indicaciones, medicación, contactos…"
                className="min-h-[90px] w-full resize-y rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] text-[15px] leading-[1.5] text-ink placeholder:text-[#B6A99B] focus:outline-none"
              />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
