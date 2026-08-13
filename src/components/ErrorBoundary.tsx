import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Deliberately styled with inline styles and no dependency on the i18n
 * context or App.css — this is the last line of defense when something on
 * an unusual/old browser breaks, so it needs to render on its own even if
 * everything else in the tree (including context providers) failed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("PetWatch crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#05070a",
          color: "#d7e6dc",
          fontFamily: "monospace",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 20, marginBottom: 8 }}>⚠ PetWatch travou / crashed</p>
          <p style={{ fontSize: 13, color: "#9fb0a8", marginBottom: 4 }}>
            Isso pode acontecer em navegadores muito antigos. Tente atualizar o navegador,
            ou abrir em outro aparelho.
          </p>
          <p style={{ fontSize: 13, color: "#9fb0a8", marginBottom: 16 }}>
            This can happen on very old browsers. Try updating your browser, or open this on
            another device.
          </p>
          <pre
            style={{
              fontSize: 11,
              color: "#ff9b9b",
              background: "#0b0f14",
              padding: 12,
              borderRadius: 4,
              overflowX: "auto",
              textAlign: "left",
              marginBottom: 16,
            }}
          >
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#1f8a4d",
              color: "#05130a",
              border: "none",
              padding: "10px 18px",
              fontFamily: "inherit",
              fontWeight: 700,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Recarregar / Reload
          </button>
        </div>
      </div>
    );
  }
}
