// import Link from 'next/link';

// export default function Home() {
//   return (
//     <main className="max-w-3xl mx-auto py-16 px-6 space-y-6">
//       <h1 className="h1">CatchMatch • SOTA Proctored Assessments</h1>
//       <p className="text-slate-600">Scientifically designed, AI-generated exams with real proctoring.</p>
//       <div className="card">
//         <h2 className="font-semibold mb-3">Get started</h2>
//         <Link href="/preflight" className="btn-primary inline-block">Apply & Start Exam</Link>
//       </div>
//     </main>
//   );
// }

'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Home() {
  // gentle stagger for hero elements (motion-safe)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = Array.from(document.querySelectorAll('[data-animate]'));
    els.forEach((el, i) => {
      setTimeout(() => el.classList.remove('opacity-0', 'translate-y-3'), 90 * i);
    });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
    <img
      src="/logo.svg"
      alt="CatchMatch logo"
      className="h-9 w-auto"
    />
    <span className="text-lg font-semibold tracking-tight">CatchMatch</span>
  </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-slate-700">Features</a>
            <a href="#security" className="hover:text-slate-700">Security</a>
            <a href="#how-it-works" className="hover:text-slate-700">How it works</a>
            <a href="#pricing" className="hover:text-slate-700">Pricing</a>
            <a href="#faq" className="hover:text-slate-700">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/preflight" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
              Apply & Start Exam
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <h1
                data-animate
                className="opacity-0 translate-y-3 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900"
              >
                SOTA Proctored Assessments for <span className="text-blue-700">Software & AI Engineers</span>
              </h1>
              <p
                data-animate
                className="opacity-0 translate-y-3 mt-5 text-lg text-slate-600 leading-relaxed max-w-2xl"
              >
                AI-generated, level-adaptive exams with real proctoring, automated grading, and incident-based risk scoring. Reduce cheating, measure true engineering skill, and hire faster with auditable reports.
              </p>
              <div data-animate className="opacity-0 translate-y-3 mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/preflight"
                  className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                >
                  Apply & Start Exam
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                >
                  Explore features
                </a>
              </div>

              {/* Trust bar */}
              <div className="mt-10">
                <p className="text-xs uppercase tracking-widest text-slate-500">Trusted by hiring teams</p>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-6 items-center">
                  {['TENHUNTER',].map((brand) => (
                    <div key={brand} className="h-10 flex items-center">
                      <div className="text-slate-400 font-semibold tracking-wider">{brand}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Illustration / KPI card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Avg. time-to-signal" value="45 min" />
                  <Stat label="MCQ accuracy baseline" value=">95%" />
                  <Stat label="Cheating reduction" value="−63%" />
                  <Stat label="Hiring cycle time" value="−42%" />
                </div>
                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  Our engine generates tasks, proctors the session, executes code with unit tests, and grades with rubrics—end-to-end automation and auditability.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">What you get</h2>
          <p className="mt-2 text-slate-600">Enterprise-grade assessment built for reliability, evidence, and scale.</p>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature
              title="AI-generated, level-adaptive tests"
              desc="Role/level-specific tasks (Junior → Architect) with MCQ, short answers, and coding exercises with unit tests."
            />
            <Feature
              title="Real proctoring & risk scoring"
              desc="Webcam/mic capture, fullscreen enforcement, blur/devtools/clipboard/idle logging, and incident-based risk score."
            />
            <Feature
              title="Automated grading & reports"
              desc="Objective MCQ + code execution results, AI-assisted rubric scoring for free-response, and auditable PDFs."
            />
            <Feature
              title="Secure by default"
              desc="No static banks, dynamic prompts, and tamper-evident incident logs. Designed for compliance."
            />
            <Feature
              title="Admin Console"
              desc="Live incident feed, per-candidate timeline, risk heatmap, and decision-ready summaries."
            />
            <Feature
              title="TenHunter integration"
              desc="Seamless B2B integration: trigger assessments on application, auto-route results to ATS."
            />
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section id="security" className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Security & Compliance</h2>
          <div className="mt-8 grid lg:grid-cols-12 gap-8">
            <ul className="lg:col-span-7 space-y-3 text-slate-700">
              <li>• Privacy by design: candidate consent flows and data minimization.</li>
              <li>• Encrypted transport, access-controlled media storage, signed URLs for reviewers.</li>
              <li>• Configurable retention & redaction. Audit trails for each exam session.</li>
              <li>• Optional regional data pinning for jurisdictional requirements.</li>
            </ul>
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
                <h3 className="font-medium">Certifications & Controls</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Badge>SSO</Badge>
                  <Badge>RBAC</Badge>
                  <Badge>IP Allowlist</Badge>
                  <Badge>Audit Logs</Badge>
                  <Badge>SOC2-aligned</Badge>
                  <Badge>GDPR-aware</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid lg:grid-cols-4 gap-6">
            <Step n={1} title="Apply or invite" desc="Candidates enter through TenHunter or a shareable link." />
            <Step n={2} title="Preflight" desc="Consent, camera/mic checks, and policy display." />
            <Step n={3} title="AI exam" desc="Level-adaptive tasks, real proctoring, and strict timers." />
            <Step n={4} title="Results" desc="Competency score + risk score + artifacts for review." />
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">Ready to evaluate real engineering skill?</h3>
              <p className="mt-2 text-slate-600">Start with a pilot cohort and compare against your current process.</p>
            </div>
            <Link
              href="/preflight"
              className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Apply & Start Exam
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="faq" className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 text-sm text-slate-600">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <div aria-hidden className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600" />
                <span className="font-semibold">CatchMatch</span>
              </div>
              <p className="mt-3 max-w-sm">AI-proctored, task-based assessments to measure true engineering competence.</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="font-medium text-slate-900">Product</div>
                <ul className="mt-3 space-y-2">
                  <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                  <li><a href="#security" className="hover:text-slate-900">Security</a></li>
                  <li><a href="#how-it-works" className="hover:text-slate-900">How it works</a></li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-slate-900">Legal</div>
                <ul className="mt-3 space-y-2">
                  <li><Link href="/terms" className="hover:text-slate-900">Terms</Link></li>
                  <li><Link href="/privacy" className="hover:text-slate-900">Privacy</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-8">© {new Date().getFullYear()} CatchMatch Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 h-6 w-6 rounded-md bg-blue-600/10 text-blue-700 grid place-items-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-90"><path d="M9 16.17l-3.88-3.88a1.25 1.25 0 10-1.77 1.76l4.77 4.77a1.25 1.25 0 001.77 0l10-10a1.25 1.25 0 10-1.77-1.77L9 16.17z"/></svg>
        </span>
        <div>
          <div className="font-medium">{title}</div>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
      {children}
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 grid place-items-center rounded-lg bg-blue-600 text-white text-sm font-semibold">{n}</div>
        <div className="font-medium">{title}</div>
      </div>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
    </li>
  );
}
