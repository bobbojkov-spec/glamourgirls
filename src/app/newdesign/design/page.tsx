export const dynamic = 'force-static';

export default function NewPhoneDesignPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="text-center space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-400">
          New Design Workspace
        </p>
        <h1 className="text-3xl font-light">Phone layout playground</h1>
        <p className="text-gray-400 max-w-md">
          Blank canvas for the upcoming mobile experience. Let me know what elements to drop in here.
        </p>
      </div>
    </main>
  );
}
