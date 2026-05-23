export type StatCardColor =
  | "primary"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "muted";

const COLOR_MAP: Record<StatCardColor, string> = {
  primary: "bg-primary",
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
  purple: "bg-purple",
  muted: "bg-border-strong",
};

export type StatCardProps = {
  value: string | number;
  label: string;
  sublabel?: string;
  color?: StatCardColor;
  pulse?: boolean;
  className?: string;
};

export default function StatCard({
  value,
  label,
  sublabel,
  color = "primary",
  pulse = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={
        "card relative overflow-hidden p-card " + (className ?? "")
      }
    >
      <span
        aria-hidden
        className={
          "absolute top-0 left-0 right-0 h-1 " +
          COLOR_MAP[color] +
          (pulse ? " animate-pulse" : "")
        }
      />
      <div className="text-page-title text-text-primary leading-tight">{value}</div>
      <div className="text-label mt-1">{label}</div>
      {sublabel && (
        <div className="text-body text-text-secondary mt-1">{sublabel}</div>
      )}
    </div>
  );
}
