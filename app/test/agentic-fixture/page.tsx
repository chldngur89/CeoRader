import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

async function loadFixtureText() {
  const fixturePath = path.join(process.cwd(), ".ceorader", "fixtures", "agentic-fixture.txt");

  try {
    return await readFile(fixturePath, "utf8");
  } catch {
    return [
      "Starter plan: 49 USD per month",
      "Enterprise workflow automation",
      "Hiring for platform engineers",
    ].join("\n");
  }
}

export default async function AgenticFixturePage() {
  const fixtureText = await loadFixtureText();

  return (
    <main className="min-h-screen bg-white px-8 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Agentic Fixture
          </p>
          <h1 className="mt-3 text-4xl font-bold">Internal scan verification page</h1>
          <p className="mt-4 text-lg text-slate-600">
            This page is used to verify snapshot storage and diff detection.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold">Current content</h2>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {fixtureText}
          </pre>
        </section>
      </div>
    </main>
  );
}
