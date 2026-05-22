import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign in — DTE GES Command Center",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <span className="text-mono text-text-primary tracking-wider font-bold text-base">
              DTE
            </span>
            <span className="h-4 w-px bg-border-strong" aria-hidden />
            <span className="text-label">GES</span>
          </div>
          <h1 className="text-page-title mb-1">Command Center</h1>
          <p className="text-body">Peach State CPA Group</p>
        </div>

        <div className="card">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
