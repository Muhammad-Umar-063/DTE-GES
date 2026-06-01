import { TopbarLoader } from "@/components/Skeleton";

// Shown briefly by Next.js while a route in the (app) segment is loading.
// Phase 5: a calm thin progress bar at the top of the page, plus a soft
// page-enter animation on the real content once it lands.
export default function AppLoading() {
  return (
    <div className="animate-page-enter">
      <TopbarLoader />
      <div className="px-page-x py-page-y">
        <div className="h-6 w-48 shimmer rounded-tag mb-4" aria-hidden />
        <div className="h-3 w-80 shimmer rounded-tag mb-6" aria-hidden />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card mb-section">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-card-enter" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-7 w-12 shimmer rounded-tag mb-2" aria-hidden />
              <div className="h-3 w-32 shimmer rounded-tag mb-1" aria-hidden />
              <div className="h-3 w-24 shimmer rounded-tag" aria-hidden />
            </div>
          ))}
        </div>
        <div className="card animate-card-enter" style={{ animationDelay: "240ms" }}>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-1/4 shimmer rounded-tag" aria-hidden />
                <div className="h-3 w-1/4 shimmer rounded-tag" aria-hidden />
                <div className="h-3 w-1/6 shimmer rounded-tag" aria-hidden />
                <div className="h-3 w-1/4 shimmer rounded-tag" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
