export default function Loading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      role="status"
      aria-label="Carregando..."
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
    </div>
  );
}
