"use client";

import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  componentDidCatch(error: Error) { console.error("[ErrorBoundary]", error); }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "var(--sur)", border: "1px solid var(--bor)", borderRadius: "var(--r2)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--tx)", marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 20, fontFamily: "DM Mono, monospace" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-gold"
            style={{ padding: "9px 20px", fontSize: 12, borderRadius: "var(--r)" }}
          >
            🔄 Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
