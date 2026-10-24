interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  inputClassName?: string;
}

export default function AuthField({
  id,
  label,
  type = "text",
  defaultValue,
  value,
  onChange,
  placeholder,
  inputClassName = "",
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
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`mb-[18px] w-full rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:outline-none ${inputClassName}`}
      />
    </>
  );
}
