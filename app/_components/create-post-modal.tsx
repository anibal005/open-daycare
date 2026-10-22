"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { AVATAR_TONES, children } from "@/lib/children";
import {
  POST_TYPE_CHIP_LABELS,
  POST_TYPE_CHIP_STYLES,
  POST_TYPE_ORDER,
  type PostType,
} from "@/lib/posts";

const RECIPIENTS = children.slice(0, 3);

// A discriminated union keeps the two valid states apart: either one or more
// children are selected, or the whole room is (never both at once).
type RecipientSelection =
  | { kind: "children"; childIds: string[] }
  | { kind: "room" };

const INITIAL_RECIPIENT: RecipientSelection = {
  kind: "children",
  childIds: [RECIPIENTS[0].id],
};

const SECTION_LABEL_CLASS =
  "mb-[10px] text-[12px] font-extrabold tracking-[.7px] text-muted-dark";
const RECIPIENT_CHIP_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line bg-card py-[6px] pr-[14px] pl-[6px] text-[14px] font-bold text-[#6E6359] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink";
const ROOM_CHIP_CLASS =
  "flex cursor-pointer items-center rounded-full border-[1.5px] border-line bg-card px-4 py-[6px] text-[14px] font-bold text-[#6E6359] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink";

const RECIPIENTS_ERROR_MESSAGE = "Elegí al menos un destinatario";
const DESCRIPTION_ERROR_MESSAGE = "Escribí la descripción de la publicación";

const CAMERA_PATH =
  "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z";

type TriggerVariant = "sidebar" | "feedBar";

export default function CreatePostModal({
  variant,
}: {
  variant: TriggerVariant;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The dialog is only mounted while open, so closing it resets the whole form
  // (recipients, type, description and errors) without manual cleanup.
  function handleClose() {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <CreatePostTrigger
        variant={variant}
        triggerRef={triggerRef}
        onOpen={() => setIsOpen(true)}
      />
      {isOpen && <CreatePostDialog onClose={handleClose} />}
    </>
  );
}

function CreatePostTrigger({
  variant,
  triggerRef,
  onOpen,
}: {
  variant: TriggerVariant;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}) {
  if (variant === "feedBar") {
    return (
      <button
        type="button"
        ref={triggerRef}
        onClick={onOpen}
        className="mb-6 flex w-full cursor-pointer items-center gap-[14px] rounded-[18px] border border-line bg-card px-[18px] py-[14px] text-left shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]"
      >
        <div className="font-fredoka flex size-10 flex-none items-center justify-center rounded-full bg-coral text-[16px] font-semibold text-white">
          C
        </div>
        <span className="flex-1 text-[15px] text-muted">
          Compartí un momento…
        </span>
        <span className="flex size-[38px] items-center justify-center rounded-[12px] bg-coral-soft text-[#E0654A]">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={CAMERA_PATH} />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      ref={triggerRef}
      onClick={onOpen}
      className="mb-[18px] flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]"
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
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      Nueva publicación
    </button>
  );
}

function CreatePostDialog({ onClose }: { onClose: () => void }) {
  const [recipients, setRecipients] =
    useState<RecipientSelection>(INITIAL_RECIPIENT);
  const [selectedType, setSelectedType] = useState<PostType>("meal");
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const firstRecipientRef = useRef<HTMLInputElement>(null);

  // On mount: focus the description (the field where the user writes), close on
  // Escape, keep the Tab focus inside the card and lock the page scroll.
  useEffect(() => {
    // `preventScroll` keeps the background page at the same scroll offset:
    // the modal lives inside the `main` scroll container in the DOM.
    descriptionRef.current?.focus({ preventScroll: true });

    // The trap is recalculated on every keydown: the real tab order changes as
    // the radio selection and the error focus targets change. Hidden radios are
    // skipped because the browser exposes one tab stop per radio group.
    function getFocusableElements() {
      const card = cardRef.current;
      if (!card) return [];

      return Array.from(
        card.querySelectorAll<HTMLElement>(
          "button, input, textarea, select, a[href]",
        ),
      ).filter((element) => {
        if (element.hasAttribute("disabled")) return false;
        if (
          element instanceof HTMLInputElement &&
          element.type === "radio" &&
          !element.checked
        ) {
          return false;
        }
        return element.getClientRects().length > 0;
      });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableElements();
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
  }, [onClose]);

  function isChildSelected(childId: string) {
    return (
      recipients.kind === "children" && recipients.childIds.includes(childId)
    );
  }

  function toggleChild(childId: string) {
    setRecipientsError(null);
    setRecipients((current) => {
      // Picking a child while the whole room is selected deselects the room.
      if (current.kind !== "children") {
        return { kind: "children", childIds: [childId] };
      }

      if (current.childIds.includes(childId)) {
        return {
          kind: "children",
          childIds: current.childIds.filter((id) => id !== childId),
        };
      }

      return { kind: "children", childIds: [...current.childIds, childId] };
    });
  }

  function toggleRoom() {
    setRecipientsError(null);
    setRecipients((current) =>
      current.kind === "room"
        ? { kind: "children", childIds: [] }
        : { kind: "room" },
    );
  }

  // The textarea stays uncontrolled, so its value is read from the DOM on
  // demand. The error only recalculates after a failed submit.
  function handleDescriptionChange() {
    if (!descriptionError) return;
    setDescriptionError(
      descriptionRef.current?.value.trim() ? null : DESCRIPTION_ERROR_MESSAGE,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextRecipientsError =
      recipients.kind === "children" && recipients.childIds.length === 0
        ? RECIPIENTS_ERROR_MESSAGE
        : null;
    const nextDescriptionError = descriptionRef.current?.value.trim()
      ? null
      : DESCRIPTION_ERROR_MESSAGE;

    setRecipientsError(nextRecipientsError);
    setDescriptionError(nextDescriptionError);

    if (nextRecipientsError) {
      firstRecipientRef.current?.focus({ preventScroll: true });
      return;
    }

    if (nextDescriptionError) {
      descriptionRef.current?.focus({ preventScroll: true });
      return;
    }

    // Visual only: nothing is created or persisted, the modal just closes.
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] p-6"
    >
      <div
        ref={cardRef}
        className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-line bg-modal-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]"
      >
        <div className="flex items-center justify-between border-b border-line px-[26px] py-[20px]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[15px] font-bold text-muted-dark"
          >
            Cancelar
          </button>
          <span
            id="create-post-title"
            className="font-fredoka text-[18px] font-semibold text-ink"
          >
            Nueva publicación
          </span>
          {/* The header lives outside the <form>, so the submit button is
              linked to it with the `form` attribute. */}
          <button
            type="submit"
            form="create-post-form"
            className="cursor-pointer text-[15px] font-extrabold text-coral-dark"
          >
            Publicar
          </button>
        </div>

        {/* `noValidate` keeps the browser from showing its own bubbles: the
            validation and its messages are handled here. */}
        <form
          id="create-post-form"
          noValidate
          onSubmit={handleSubmit}
          className="px-[26px] py-[24px]"
        >
          <div className="mb-[22px]">
            <div id="create-post-recipients-label" className={SECTION_LABEL_CLASS}>
              PARA
            </div>
            <div
              role="group"
              aria-labelledby="create-post-recipients-label"
              aria-describedby={
                recipientsError ? "create-post-recipients-error" : undefined
              }
              className="flex flex-wrap gap-[9px]"
            >
              {RECIPIENTS.map((child) => (
                <label key={child.id} className="relative">
                  <input
                    type="checkbox"
                    name="create-post-recipients"
                    id={"create-post-recipient-" + child.id}
                    checked={isChildSelected(child.id)}
                    onChange={() => toggleChild(child.id)}
                    ref={
                      child.id === RECIPIENTS[0].id
                        ? firstRecipientRef
                        : undefined
                    }
                    className="peer absolute size-0 opacity-0"
                  />
                  <span className={RECIPIENT_CHIP_CLASS}>
                    <span
                      className={`font-fredoka flex size-[26px] flex-none items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[child.tone].bg} ${AVATAR_TONES[child.tone].text}`}
                    >
                      {child.avatarLetter}
                    </span>
                    {child.name.split(" ")[0]}
                  </span>
                </label>
              ))}
              <label className="relative flex">
                <input
                  type="checkbox"
                  name="create-post-recipients"
                  id="create-post-recipient-room"
                  checked={recipients.kind === "room"}
                  onChange={toggleRoom}
                  className="peer absolute size-0 opacity-0"
                />
                <span className={ROOM_CHIP_CLASS}>Toda la sala</span>
              </label>
            </div>
            {recipientsError && (
              <p
                id="create-post-recipients-error"
                role="alert"
                className="mt-[8px] text-[13px] font-bold text-error"
              >
                {recipientsError}
              </p>
            )}
          </div>

          <div className="mb-[22px]">
            <div id="create-post-type-label" className={SECTION_LABEL_CLASS}>
              TIPO
            </div>
            <div
              role="radiogroup"
              aria-labelledby="create-post-type-label"
              className="flex flex-wrap gap-[9px]"
            >
              {POST_TYPE_ORDER.map((type) => (
                <label key={type} className="relative">
                  <input
                    type="radio"
                    name="create-post-type"
                    value={type}
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)}
                    className="peer absolute size-0 opacity-0"
                  />
                  {/* Only one of the two variants is applied: two background
                      (or text) color utilities on the same element would
                      resolve by stylesheet order instead of by intent. */}
                  <span
                    className={`block cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-extrabold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                      selectedType === type
                        ? POST_TYPE_CHIP_STYLES[type].selected
                        : POST_TYPE_CHIP_STYLES[type].rest
                    }`}
                  >
                    {POST_TYPE_CHIP_LABELS[type]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label
            htmlFor="create-post-description"
            className={`block ${SECTION_LABEL_CLASS}`}
          >
            DESCRIPCIÓN
          </label>
          <textarea
            id="create-post-description"
            name="description"
            ref={descriptionRef}
            required
            placeholder="Contá cómo le fue hoy…"
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={
              descriptionError ? "create-post-description-error" : undefined
            }
            onChange={handleDescriptionChange}
            className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] leading-[1.5] text-ink placeholder:text-[#B6A99B] focus:outline-none ${
              descriptionError ? "border-error-line mb-[8px]" : "border-input-line mb-[22px]"
            }`}
          />
          {descriptionError && (
            <p
              id="create-post-description-error"
              role="alert"
              className="mb-[22px] text-[13px] font-bold text-error"
            >
              {descriptionError}
            </p>
          )}

          <div className={SECTION_LABEL_CLASS}>FOTOS</div>
          {/* Decorative tiles: there is no file picker and no photo state, so
              they stay out of the tab order. */}
          <div className="flex gap-3">
            <div
              aria-hidden="true"
              className="flex size-24 items-center justify-center rounded-[14px] border border-line bg-[#F4ECE1] text-[#CBB89F]"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
              </svg>
            </div>
            <div
              aria-hidden="true"
              className="flex size-24 flex-col items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C5503A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[12px]">Agregar</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
