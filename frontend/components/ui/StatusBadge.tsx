type Variant = "gold" | "green" | "red" | "blue" | "purple" | "muted";
const MAP: Record<Variant, string> = {
  gold: "badge-gold", green: "badge-green", red: "badge-red",
  blue: "badge-blue", purple: "badge-purple", muted: "badge-muted",
};
const DOT: Record<Variant, string> = {
  gold: "status-warning", green: "status-online", red: "status-error",
  blue: "status-online", purple: "status-warning", muted: "status-idle",
};
export default function StatusBadge({ label, variant = "gold", dot }: { label: string; variant?: Variant; dot?: boolean }) {
  return (
    <span className={`badge ${MAP[variant]}`}>
      {dot && <span className={`status-dot ${DOT[variant]}`} />}
      {label}
    </span>
  );
}
