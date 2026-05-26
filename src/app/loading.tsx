export default function Loading() {
  return (
    <main className="page-shell min-h-screen px-4 py-10">
      <div className="section-shell">
        <div className="card card-elevated p-6 sm:p-8">
          <div className="skeleton-line h-4 w-40" />
          <div className="skeleton-line mt-5 h-12 w-[min(100%,34rem)]" />
          <div className="skeleton-line mt-4 h-5 w-[min(100%,46rem)]" />
          <div className="skeleton-line mt-3 h-5 w-[min(92%,38rem)]" />

          <div className="mt-10 grid gap-3 md:grid-cols-3 stagger-children">
            <div className="card fade-up p-5">
              <div className="skeleton-line h-4 w-24" />
              <div className="skeleton-line mt-4 h-10 w-36" />
            </div>
            <div className="card fade-up p-5">
              <div className="skeleton-line h-4 w-24" />
              <div className="skeleton-line mt-4 h-10 w-36" />
            </div>
            <div className="card fade-up p-5">
              <div className="skeleton-line h-4 w-24" />
              <div className="skeleton-line mt-4 h-10 w-36" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
