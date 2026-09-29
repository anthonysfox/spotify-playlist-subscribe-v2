export const IconButton = ({
  label,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="border-line text-ink-35 hover:border-line-strong hover:bg-ground-alt hover:text-ink-70 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 disabled:opacity-50"
      disabled={disabled}
    >
      {children}
    </button>
  );
};
