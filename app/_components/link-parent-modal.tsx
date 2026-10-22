"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { generateInviteCode } from "@/lib/invite-code";

const FIELD_LABEL_CLASS =
  "mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark";
const INPUT_CLASS =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none";
const ERROR_MESSAGE_CLASS = "mb-[18px] text-[13px] font-bold text-error";

const NAME_ERROR_MESSAGE = "Ingresá el nombre del padre/madre";
const EMAIL_EMPTY_ERROR_MESSAGE = "Ingresá el correo del padre/madre";
const EMAIL_FORMAT_ERROR_MESSAGE = "Ingresá un correo válido";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Kinship = "mother" | "father" | "tutor";

const KINSHIP_OPTIONS: { value: Kinship; label: string }[] = [
  { value: "mother", label: "Mamá" },
  { value: "father", label: "Papá" },
  { value: "tutor", label: "Tutor/a" },
];

// The border color is picked instead of layered on top of `border-input-line`:
// two border-color utilities in the same element would resolve by stylesheet
// order, not by the order they are written here.
function fieldClass(hasError: boolean, extra = "") {
  const borderClass = hasError ? "border-error-line" : "border-input-line";
  return `${INPUT_CLASS} ${borderClass} ${extra}`;
}

export default function LinkParentModal({ childName }: { childName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [kinship, setKinship] = useState<Kinship>("mother");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const motherRef = useRef<HTMLInputElement>(null);
  const fatherRef = useRef<HTMLInputElement>(null);
  const tutorRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const wasOpenRef = useRef(false);

  // The mockup shows the first name only in the info banner ("Solo verá el
  // feed de Mateo") and the full name in the header ("a Mateo Fernández").
  const childFirstName = childName.split(" ")[0];

  // While the modal is open: focus the first field, close on Escape, keep the
  // Tab focus inside the dialog and lock the page scroll.
  useEffect(() => {
    if (!isOpen) return;

    const candidates: (HTMLElement | null)[] = [
      closeButtonRef.current,
      nameInputRef.current,
      emailInputRef.current,
      motherRef.current,
      fatherRef.current,
      tutorRef.current,
      submitButtonRef.current,
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

  // The inputs stay uncontrolled, so their values are read on demand from the
  // DOM instead of from React state.
  function readName() {
    return nameInputRef.current?.value ?? "";
  }

  function readEmail() {
    return emailInputRef.current?.value ?? "";
  }

  function validateName(value: string) {
    return value.trim() ? null : NAME_ERROR_MESSAGE;
  }

  function validateEmail(value: string) {
    if (!value.trim()) return EMAIL_EMPTY_ERROR_MESSAGE;
    return EMAIL_PATTERN.test(value.trim()) ? null : EMAIL_FORMAT_ERROR_MESSAGE;
  }

  // Re-validate a field that already failed while the user corrects it, so the
  // error clears as soon as the value becomes valid.
  function handleNameChange() {
    if (!nameError) return;
    setNameError(validateName(readName()));
  }

  function handleEmailChange() {
    if (!emailError) return;
    setEmailError(validateEmail(readEmail()));
  }

  function handleOpen() {
    setInviteCode(generateInviteCode());
    setNameError(null);
    setEmailError(null);
    setIsOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextNameError = validateName(readName());
    const nextEmailError = validateEmail(readEmail());

    setNameError(nextNameError);
    setEmailError(nextEmailError);

    if (nextNameError) {
      nameInputRef.current?.focus({ preventScroll: true });
      return;
    }

    if (nextEmailError) {
      emailInputRef.current?.focus({ preventScroll: true });
      return;
    }

    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={handleOpen}
        className="flex cursor-pointer items-center gap-3 pt-2"
      >
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
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="text-[14.5px] font-extrabold text-alert-title">
          Vincular otro padre
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-parent-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] p-6"
        >
          <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-line bg-modal-bg shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
            <div className="flex items-center justify-between border-b border-line px-[26px] py-[20px]">
              <div>
                <div
                  id="link-parent-title"
                  className="font-fredoka text-[18px] font-semibold text-ink"
                >
                  Vincular padre
                </div>
                <div className="text-[13px] text-muted">a {childName}</div>
              </div>
              <button
                type="button"
                ref={closeButtonRef}
                onClick={() => setIsOpen(false)}
                className="flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-[10px] bg-line-soft text-muted-dark"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* `noValidate` keeps the browser from showing its own bubbles:
                the validation and its messages are handled here. */}
            <form
              id="link-parent-form"
              noValidate
              onSubmit={handleSubmit}
              className="px-[26px] py-[22px]"
            >
              <div className="mb-[20px] flex gap-[11px] rounded-[14px] bg-info-bg px-[16px] py-[13px]">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4E72C8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-[1px] flex-none"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span className="text-[13.5px] leading-[1.45] text-info-text">
                  {
                    "Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de " +
                    childFirstName +
                    "."
                  }
                </span>
              </div>

              <label htmlFor="link-parent-name" className={FIELD_LABEL_CLASS}>
                NOMBRE DEL PADRE/MADRE
              </label>
              <input
                id="link-parent-name"
                ref={nameInputRef}
                type="text"
                required
                autoComplete="name"
                placeholder="Ej. Diego Fernández"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "link-parent-name-error" : undefined}
                onChange={handleNameChange}
                className={fieldClass(
                  Boolean(nameError),
                  nameError ? "mb-[6px]" : "mb-[18px]",
                )}
              />
              {nameError && (
                <p
                  id="link-parent-name-error"
                  role="alert"
                  className={ERROR_MESSAGE_CLASS}
                >
                  {nameError}
                </p>
              )}

              <label htmlFor="link-parent-email" className={FIELD_LABEL_CLASS}>
                EMAIL
              </label>
              <input
                id="link-parent-email"
                ref={emailInputRef}
                type="email"
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={
                  emailError ? "link-parent-email-error" : undefined
                }
                onChange={handleEmailChange}
                className={fieldClass(
                  Boolean(emailError),
                  emailError ? "mb-[6px]" : "mb-[18px]",
                )}
              />
              {emailError && (
                <p
                  id="link-parent-email-error"
                  role="alert"
                  className={ERROR_MESSAGE_CLASS}
                >
                  {emailError}
                </p>
              )}

              <div className="mb-[10px] block text-[12px] font-extrabold tracking-[.7px] text-muted-dark">
                PARENTESCO
              </div>
              <div className="mb-[20px] flex gap-[9px]">
                {KINSHIP_OPTIONS.map((option) => (
                  <label key={option.value} className="relative flex-1">
                    <input
                      type="radio"
                      name="link-parent-kinship"
                      value={option.value}
                      checked={kinship === option.value}
                      onChange={() => setKinship(option.value)}
                      ref={(element) => {
                        if (option.value === "mother") motherRef.current = element;
                        if (option.value === "father") fatherRef.current = element;
                        if (option.value === "tutor") tutorRef.current = element;
                      }}
                      className="peer absolute size-0 opacity-0"
                    />
                    <span className="block rounded-full border-[1.5px] border-line bg-card px-[11px] py-[11px] text-center text-[14px] font-extrabold text-[#6E6359] peer-checked:border-chip-line peer-checked:bg-chip-bg peer-checked:text-info-icon peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#4E72C8]">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mb-[20px] rounded-[16px] border-[1.5px] border-dashed border-invite-line bg-invite-bg p-[18px] text-center">
                <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-invite-label">
                  CÓDIGO DE INVITACIÓN
                </div>
                <div className="font-fredoka text-[34px] font-semibold tracking-[7px] text-invite-code">
                  {inviteCode}
                </div>
                <div className="mt-[6px] text-[13px] text-invite-label">
                  Vence en 7 días
                </div>
              </div>

              <button
                type="submit"
                ref={submitButtonRef}
                className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m22 2-7 20-4-9-9-4z" />
                  <path d="M22 2 11 13" />
                </svg>
                Enviar invitación
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
