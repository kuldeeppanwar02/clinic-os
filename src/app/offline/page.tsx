import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-8">
      <div className="section-shell surface-panel-strong rounded-[2.4rem] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
          Offline Mode
        </p>
        <h1 className="display-type mt-4 text-5xl text-[var(--accent-strong)]">
          आप अभी offline हैं
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[rgba(19,49,58,0.76)]">
          Cached pages available hain. Agar booking ya token form fill karna ho to entry
          local pending state mein save ho jayegi aur connection aate hi sync ho sakti hai.
          Zarurat ho to reception se manual support bhi mil sakti hai.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="focus-ring rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            Home page
          </Link>
          <Link
            href="/walkin"
            className="focus-ring rounded-full border border-[var(--line-strong)] px-6 py-3 font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            Walk-in page
          </Link>
        </div>
      </div>
    </main>
  );
}
