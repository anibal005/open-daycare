import type { ChangeEvent } from "react";

interface AuthFieldBaseProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  inputClassName?: string;
  name?: string;
  autoComplete?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

// An input can't be controlled and uncontrolled at the same time, and every
// controlled input needs an onChange handler. The union makes that explicit.
interface ControlledAuthFieldProps extends AuthFieldBaseProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: never;
}

interface UncontrolledAuthFieldProps extends AuthFieldBaseProps {
  value?: never;
  onChange?: never;
  defaultValue?: string;
}

type AuthFieldProps = ControlledAuthFieldProps | UncontrolledAuthFieldProps;

export default function AuthField({
  id,
  label,
  type = "text",
  defaultValue,
  value,
  onChange,
  placeholder,
  inputClassName = "",
  name,
  autoComplete,
  ariaInvalid,
  ariaDescribedBy,
}: AuthFieldProps) {
  return (
    <>
      <label
        htmlFor={id}
        className="mb-2 block text-[12px] font-bold tracking-[.7px] text-muted-dark"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`mb-[18px] w-full rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-auth-link ${inputClassName}`}
      />
    </>
  );
}
