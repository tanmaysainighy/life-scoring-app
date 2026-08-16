/** Shown while a page's server data is gathered — the shell is already painted. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-9 w-52" />
        <div className="skeleton h-2 w-full" />
      </div>
      <div className="skeleton h-36 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
      <div className="skeleton h-48 w-full rounded-2xl" />
    </div>
  );
}
