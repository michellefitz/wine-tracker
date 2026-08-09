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
      <div className="w-full max-w-xs">
        <div className="text-center">
          <h1 className="masthead text-[3rem] leading-[1.1] text-ink">
            Cellar
            <br />
            Notes
          </h1>
          <hr className="rule mx-auto mt-7 w-12" />
          <p className="essay mt-5 text-[1.0625rem] leading-relaxed text-muted">
            Wines you&apos;ve had, and what you made of them.
          </p>
        </div>

        <div className="mt-10">
          {/* Only ever follow a same-origin path, never an absolute URL. */}
          <LoginForm next={next?.startsWith("/") ? next : "/"} />
        </div>
      </div>
    </main>
  );
}
