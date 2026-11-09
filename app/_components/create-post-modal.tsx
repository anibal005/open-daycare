"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";
import {
  getPostRecipients,
  type PostRecipient,
} from "@/app/actions/get-post-recipients";
import { createPost } from "@/app/actions/create-post";
import { AVATAR_TONES, getAvatarToneForName } from "@/lib/children";
import {
  compressPhoto,
  MAX_PHOTOS,
  PhotoError,
  type CompressedPhoto,
} from "@/lib/image-compression";
import {
  POST_TYPE_CHIP_LABELS,
  POST_TYPE_CHIP_STYLES,
  POST_TYPE_ORDER,
  type PostType,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// A discriminated union keeps the two valid states apart: either one or more
// children are selected, or the whole room is (never both at once).
type RecipientSelection =
  | { kind: "children"; childIds: string[] }
  | { kind: "room" };

type RecipientsState =
  | { status: "loading" }
  | { status: "ready"; daycareId: string; recipients: PostRecipient[] }
  | { status: "error" };

interface SelectedPhoto extends CompressedPhoto {
  id: string;
  previewUrl: string;
}

const INITIAL_RECIPIENT: RecipientSelection = {
  kind: "children",
  childIds: [],
};

const LOADING_CHIP_CLASS =
  "h-[40px] w-[112px] animate-pulse rounded-full bg-[#F0E6D8]";

const PHOTO_ERROR_MESSAGES: Record<string, string> = {
  too_large: "La foto supera los 5 MB",
  too_large_after_compression: "La foto supera los 5 MB",
  unsupported_type: "Formato no soportado: usá JPEG, PNG o WebP",
  decode_failed: "No se pudo procesar la imagen",
  encode_failed: "No se pudo procesar la imagen",
};

function getPhotoErrorMessage(error: unknown) {
  if (error instanceof PhotoError) {
    return PHOTO_ERROR_MESSAGES[error.code] ?? "No se pudo procesar la imagen";
  }
  return "No se pudo procesar la imagen";
}

// "Thiago", "Thiago y Celeste", "Thiago, Celeste y Ana".
function joinNameList(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

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
  const [recipientsState, setRecipientsState] = useState<RecipientsState>({
    status: "loading",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedType, setSelectedType] = useState<PostType>("meal");
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const router = useRouter();

  const blockedRecipients =
    recipients.kind === "children" && recipientsState.status === "ready"
      ? recipientsState.recipients.filter(
          (child) =>
            recipients.childIds.includes(child.id) && !child.photoConsent,
        )
      : [];
  const blockedNames = joinNameList(
    blockedRecipients.map((child) => child.fullName.split(" ")[0]),
  );
  const consentMessage =
    blockedRecipients.length > 0
      ? `${
          photos.length > 0
            ? "Quitá las fotos para publicar"
            : "No podés adjuntar fotos"
        }: ${blockedNames} ${
          blockedRecipients.length === 1 ? "no tiene" : "no tienen"
        } autorización de imagen.`
      : null;
  // The consent notice and file errors share the same slot and id, so screen
  // readers announce whichever is current without duplicating the text.
  const photosMessage = photoError ?? consentMessage;

  const cardRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const firstRecipientRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const cancelledRef = useRef(false);
  const submittingRef = useRef(false);

  // Preview object URLs live until the dialog unmounts; the upside is that
  // closing the modal frees every one of them at once. The flag is reset on
  // mount because Strict Mode runs the cleanup once before re-mounting.
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current = [];
    };
  }, []);

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
        if (!submittingRef.current) onClose();
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

  // Recipients are loaded when the dialog mounts, not when the page renders:
  // `/staff` and `/staff/children` never query children just to show the trigger button.
  useEffect(() => {
    let cancelled = false;

    getPostRecipients()
      .then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          setRecipientsState({ status: "error" });
          return;
        }

        setRecipientsState({
          status: "ready",
          daycareId: result.daycareId,
          recipients: result.recipients,
        });
        setRecipients(
          result.recipients.length > 0
            ? { kind: "children", childIds: [result.recipients[0].id] }
            : { kind: "room" },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setRecipientsState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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

  async function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    // Allows picking the same file again after removing it.
    input.value = "";

    if (files.length === 0) return;

    setPhotoError(null);

    const availableSlots = MAX_PHOTOS - photos.length;

    if (availableSlots <= 0) {
      setPhotoError("Podés agregar hasta 2 fotos");
      return;
    }

    if (files.length > availableSlots) {
      setPhotoError("Podés agregar hasta 2 fotos");
    }

    setIsProcessingPhotos(true);

    try {
      for (const file of files.slice(0, availableSlots)) {
        if (cancelledRef.current) return;

        try {
          const compressed = await compressPhoto(file);
          if (cancelledRef.current) return;

          const previewUrl = URL.createObjectURL(compressed.blob);
          previewUrlsRef.current.push(previewUrl);

          setPhotos((current) => [
            ...current,
            {
              ...compressed,
              id: crypto.randomUUID(),
              previewUrl,
            },
          ]);
          setPhotoError(null);
        } catch (error) {
          if (cancelledRef.current) return;
          setPhotoError(getPhotoErrorMessage(error));
        }
      }
    } finally {
      if (!cancelledRef.current) setIsProcessingPhotos(false);
    }
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (url) => url !== photo.previewUrl,
        );
      }
      return current.filter((item) => item.id !== photoId);
    });
    setPhotoError(null);
  }

  // The textarea stays uncontrolled, so its value is read from the DOM on
  // demand. The error only recalculates after a failed submit.
  function handleDescriptionChange() {
    if (!descriptionError) return;
    setDescriptionError(
      descriptionRef.current?.value.trim() ? null : DESCRIPTION_ERROR_MESSAGE,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;

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

    if (recipientsState.status !== "ready") {
      setSubmitError("Esperá a que se carguen los destinatarios");
      return;
    }

    if (isProcessingPhotos) {
      setSubmitError("Esperá a que se procesen las fotos");
      return;
    }

    if (blockedRecipients.length > 0 && photos.length > 0) {
      setPhotoError(consentMessage);
      cardRef.current
        ?.querySelector<HTMLButtonElement>('button[aria-label^="Quitar foto"]')
        ?.focus();
      return;
    }

    // The narrowing of the state does not survive the `await`s below.
    const daycareId = recipientsState.daycareId;
    const body = descriptionRef.current?.value ?? "";
    const postId = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    const supabase = createClient();

    async function removeUploadedPhotos() {
      if (uploadedPaths.length === 0) return;

      try {
        const { error } = await supabase.storage
          .from("post-photos")
          .remove(uploadedPaths);
        if (error) {
          console.error("[create-post] Failed to remove uploaded photos");
        }
      } catch {
        console.error("[create-post] Failed to remove uploaded photos");
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      for (const [index, photo] of photos.entries()) {
        const path = `${daycareId}/${postId}/${index}.${photo.extension}`;
        const { error } = await supabase.storage
          .from("post-photos")
          .upload(path, photo.blob, {
            contentType: photo.contentType,
            upsert: false,
            cacheControl: "3600",
          });

        if (error) throw new Error("upload_failed");
        uploadedPaths.push(path);
      }
    } catch {
      await removeUploadedPhotos();
      if (!cancelledRef.current) {
        setSubmitError("No se pudieron subir las fotos. Intentá nuevamente.");
      }
      submittingRef.current = false;
      if (!cancelledRef.current) setIsSubmitting(false);
      return;
    }

    try {
      const result = await createPost({
        postId,
        type: selectedType,
        body,
        recipientChildIds:
          recipients.kind === "children" ? recipients.childIds : [],
        photos: photos.map((photo, index) => ({
          storagePath: `${daycareId}/${postId}/${index}.${photo.extension}`,
          alt: `${body.slice(0, 280)}${
            photos.length === 2 ? ` (foto ${index + 1} de 2)` : ""
          }`.slice(0, 300),
          width: photo.width,
          height: photo.height,
        })),
      });

      if (!result.ok) {
        await removeUploadedPhotos();
        if (!cancelledRef.current) setSubmitError(result.error);
        return;
      }

      onClose();
      router.refresh();
    } catch {
      await removeUploadedPhotos();
      if (!cancelledRef.current) {
        setSubmitError("No se pudo publicar. Intentá nuevamente.");
      }
    } finally {
      submittingRef.current = false;
      if (!cancelledRef.current) setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
      onClick={(event) => {
        if (submittingRef.current) return;
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
            disabled={isSubmitting}
            className="cursor-pointer text-[15px] font-bold text-muted-dark disabled:opacity-50"
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
            disabled={recipientsState.status !== "ready" || isSubmitting}
            className="cursor-pointer text-[15px] font-extrabold text-coral-dark disabled:opacity-50"
          >
            {isSubmitting ? "Publicando…" : "Publicar"}
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
              {recipientsState.status === "loading" && (
                <div role="status" className="flex flex-wrap gap-[9px]">
                  <span className="sr-only">Cargando niños…</span>
                  <span aria-hidden="true" className={LOADING_CHIP_CLASS} />
                  <span aria-hidden="true" className={LOADING_CHIP_CLASS} />
                  <span aria-hidden="true" className={LOADING_CHIP_CLASS} />
                </div>
              )}

              {recipientsState.status === "error" && (
                <div className="flex flex-col gap-[6px]">
                  <p className="text-[13px] font-bold text-error">
                    No se pudieron cargar los niños
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientsState({ status: "loading" });
                      setRecipientsError(null);
                      setReloadKey((key) => key + 1);
                    }}
                    className="cursor-pointer self-start text-[13px] font-extrabold text-coral-dark"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {recipientsState.status === "ready" && (
                <>
                  {recipientsState.recipients.map((child, index) => {
                    const firstName = child.fullName.split(" ")[0];
                    const tone = AVATAR_TONES[getAvatarToneForName(firstName)];

                    return (
                      <label key={child.id} className="relative">
                        <input
                          type="checkbox"
                          name="create-post-recipients"
                          id={"create-post-recipient-" + child.id}
                          checked={isChildSelected(child.id)}
                          onChange={() => toggleChild(child.id)}
                          ref={index === 0 ? firstRecipientRef : undefined}
                          className="peer absolute size-0 opacity-0"
                        />
                        <span className={RECIPIENT_CHIP_CLASS}>
                          <span
                            className={`font-fredoka flex size-[26px] flex-none items-center justify-center rounded-full text-[13px] font-semibold ${tone.bg} ${tone.text}`}
                          >
                            {firstName.charAt(0).toUpperCase()}
                          </span>
                          {firstName}
                        </span>
                      </label>
                    );
                  })}
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
                </>
              )}
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
            maxLength={2000}
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
          {/* `hidden` takes the input out of the focus trap: it has no rects,
              and the "Agregar" button opens the picker instead. */}
          <input
            type="file"
            id="create-post-photo-input"
            ref={photoInputRef}
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={handlePhotosChange}
          />
          <div
            aria-describedby={
              photosMessage ? "create-post-photos-error" : undefined
            }
            className="flex gap-3"
          >
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative size-24">
                <img
                  src={photo.previewUrl}
                  alt=""
                  className="size-full rounded-[14px] object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  disabled={isSubmitting}
                  aria-label={"Quitar foto " + (index + 1)}
                  className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-[14px] leading-none font-bold text-ink shadow-[0_2px_6px_-2px_rgba(63,54,46,.4)] disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ))}

            {isProcessingPhotos && (
              <div
                role="status"
                className="flex size-24 animate-pulse flex-col items-center justify-center rounded-[14px] border border-line bg-[#F4ECE1] text-[12px] text-[#B0A290]"
              >
                Procesando…
              </div>
            )}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={
                  isProcessingPhotos ||
                  isSubmitting ||
                  blockedRecipients.length > 0
                }
                aria-label="Agregar foto"
                className="flex size-24 cursor-pointer flex-col items-center justify-center gap-[6px] rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290] disabled:cursor-not-allowed disabled:opacity-50"
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
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-[12px]">Agregar</span>
              </button>
            )}
          </div>
          {photosMessage && (
            <p
              id="create-post-photos-error"
              role={photoError ? "alert" : "status"}
              className={`mt-[8px] font-bold text-error ${
                photoError ? "text-[13px]" : "text-[12.5px]"
              }`}
            >
              {photosMessage}
            </p>
          )}
          {submitError && (
            <p role="alert" className="mt-[14px] text-[13px] font-bold text-error">
              {submitError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
