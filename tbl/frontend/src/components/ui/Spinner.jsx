export default function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  )
}