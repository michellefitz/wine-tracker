import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Unlock — Cellar Notes" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-ink">
            Cellar Notes
          </h1>
          <p className="mt-2 text-sm text-muted">
            Wines you&apos;ve had, and what you made of them.
          </p>
        </div>
        {/* Only ever follow a same-origin path, never an absolute URL. */}
        <LoginForm next={next?.startsWith("/") ? next : "/"} />
      </div>
    </main>
  );
}
