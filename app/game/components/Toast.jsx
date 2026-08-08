import { useEffect } from "react";

export function Toast({ message, onDismiss, tone = "warn" }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onDismiss, 3600);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className={`toast toast-${tone}`} role="status" onClick={onDismiss}>
      {message}
    </div>
  );
}
