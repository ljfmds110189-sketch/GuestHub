import Image from "next/image";

export function FullPageLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35"
        style={{ backgroundImage: "url('/back.jpeg')" }}
      />
      <div className="absolute inset-0 bg-slate-950/55" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white/12 px-8 py-10 text-center backdrop-blur-xl">
        <Image src="/loading.svg" alt="Loading" width={96} height={96} priority />
        <p className="text-sm font-semibold tracking-wide text-white/90">Loading workspace...</p>
      </div>
    </div>
  );
}
