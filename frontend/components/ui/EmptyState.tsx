interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 18, opacity: 0.7 }}>{icon}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 17, fontWeight: 800, color: "var(--tx)", marginBottom: 8 }}>{title}</div>
      {description && (
        <p style={{ fontSize: 12, color: "var(--tx3)", maxWidth: 380, lineHeight: 1.7, marginBottom: action ? 22 : 0 }}>{description}</p>
      )}
      {action}
    </div>
  );
}
