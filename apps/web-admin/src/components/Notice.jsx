export function ErrorNotice({ message }) {
  if (!message) return null;
  return <p className="notice notice--error">{message}</p>;
}

export function FlashNotice({ message }) {
  if (!message) return null;
  return <p className="notice notice--success">{message}</p>;
}
