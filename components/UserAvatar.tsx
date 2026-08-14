import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback aria-hidden="true">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
