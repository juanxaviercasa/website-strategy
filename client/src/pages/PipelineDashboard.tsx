import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUpRight, Sparkles, RefreshCcw, Network, Play, ShieldCheck, DatabaseZap, CircleAlert, Cable, CheckCircle2, FileOutput, ChevronRight, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const stageNames = ["Business", "Audit", "Problems", "Opportunities", "Strategy", "Brand DNA", "Sitemap", "Design System", "Pages", "Content", "Design Brief", "Stitch Prompts", "Handoff"];

function Score({ value }: { value: number }) {
  const tone = value >= 70 ? "text-emerald-700" : value >= 45 ? "text-amber-700" : "text-rose-700";
  return <span className={`font-mono text-sm font-semibold ${tone}`}>{value}/100</span>;
}

export default function PipelineDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const dashboard = trpc.pipeline.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<"queue" | "connectors" | "archive">(() => {
    const panel = new URLSearchParams(window.location.search).get("panel");
    return panel === "connectors" || panel === "archive" ? panel : "queue";
  });
  const [exportFormat, setExportFormat] = useState<"json" | "markdown" | "pdf">("pdf");
  const hasAutoImported = useRef(false);
  const hasAutoRun = useRef(false);
  const importDemo = trpc.pipeline.importDemo.useMutation({
    onSuccess: async (result) => {
      await utils.pipeline.dashboard.invalidate();
      toast.success(`${result.count} businesses imported`, { description: "DEMO DATA is ready for the full pipeline." });
    },
    onError: error => toast.error("Could not import the DEMO source", { description: error.message }),
  });
  const runDemo = trpc.pipeline.runDemo.useMutation({
    onSuccess: async ({ auditId }) => {
      await utils.pipeline.dashboard.invalidate();
      toast.success("Pipeline completed", { description: "All strategic artifacts are now available." });
      setLocation(`/pipeline/${auditId}`);
    },
    onError: error => toast.error("Pipeline could not complete", { description: error.message }),
  });
  const prepareHandoff = trpc.pipeline.prepareResultHandoff.useMutation({
    onSuccess: result => toast.success("Handoff prepared", { description: result.note }),
    onError: error => toast.error("Handoff unavailable", { description: error.message }),
  });
  const exportLatest = trpc.pipeline.exportArtifact.useMutation({
    onSuccess: file => {
      window.open(file.storageUrl, "_blank", "noopener,noreferrer");
      toast.success("Build specification exported", { description: `${file.fileName} is stored in S3.` });
    },
    onError: error => toast.error("Export unavailable", { description: error.message }),
  });

  useEffect(() => {
    if (!selectedBusinessId && dashboard.data?.businesses[0]) setSelectedBusinessId(dashboard.data.businesses[0].id);
  }, [dashboard.data?.businesses, selectedBusinessId]);

  useEffect(() => {
    if (dashboard.data && dashboard.data.businesses.length === 0 && !hasAutoImported.current && !importDemo.isPending) {
      hasAutoImported.current = true;
      importDemo.mutate();
    }
  }, [dashboard.data, importDemo]);

  useEffect(() => {
    if (dashboard.data && dashboard.data.businesses.length > 0 && dashboard.data.audits.length === 0 && !hasAutoRun.current && !runDemo.isPending) {
      hasAutoRun.current = true;
      runDemo.mutate({ businessId: dashboard.data.businesses[0]!.id });
    }
  }, [dashboard.data, runDemo]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#f7f3ed]"><Loader2 className="animate-spin text-[#c86145]" /></div>;
  if (!user || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#18344a] px-5 py-8 text-[#f7f3ed] sm:p-12">
        <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <section>
            <p className="font-mono text-xs uppercase tracking-[.2em] text-[#e9b8a4]">Strategy engine / Web App 2</p>
            <h1 className="mt-5 max-w-3xl font-[Fraunces] text-5xl leading-[.95] sm:text-7xl">From lead signal to a build-ready strategy.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#d6e0e4]">A central operating room for importing qualified businesses, auditing their digital presence and turning evidence into a strategic handoff.</p>
            <Button onClick={() => startLogin()} className="mt-9 h-12 rounded-full bg-[#c86145] px-6 text-white hover:bg-[#b95036]">Enter workspace <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
          </section>
          <section className="rounded-[2rem] border border-white/15 bg-white/8 p-6 backdrop-blur sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[.16em] text-[#e9b8a4]">Free-first workflow</p>
            <div className="mt-8 space-y-4">
              {[["01", "Import", "Web App 1-compatible contract"], ["02", "Audit", "Structured DEMO evidence"], ["03", "Generate", "Strategy, system and build handoff"]].map(([number, title, description]) => <div className="flex gap-4 border-b border-white/10 pb-4" key={number}><span className="font-mono text-[#e9b8a4]">{number}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-[#d6e0e4]">{description}</p></div></div>)}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const businesses = dashboard.data?.businesses ?? [];
  const audits = dashboard.data?.audits ?? [];
  const selected = businesses.find(item => item.id === selectedBusinessId) ?? businesses[0];
  return (
    <main className="min-h-screen bg-[#f7f3ed] text-[#18344a]">
      <header className="border-b border-[#d8d0c4] bg-[#f7f3ed]/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#18344a] font-[Fraunces] text-xl text-[#f7f3ed]">S</div><div><p className="font-[Fraunces] text-lg leading-none">Strategy Engine</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.13em] text-[#6a7572]">Agency operations</p></div></div>
          <div className="hidden items-center gap-5 lg:flex"><span className="font-mono text-xs text-[#6a7572]">{user.name ?? "Workspace owner"}</span><Badge className="rounded-full bg-[#dfeeea] text-[#246052] hover:bg-[#dfeeea]">System ready</Badge></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 p-5 sm:p-8 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[1.5rem] bg-[#18344a] p-4 text-[#f7f3ed] xl:min-h-[calc(100vh-9rem)]">
          <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[.2em] text-[#e9b8a4]">Navigation</p>
          <nav className="mt-4 space-y-1"><button onClick={() => setActivePanel("queue")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${activePanel === "queue" ? "bg-white/12" : "text-[#d6e0e4] hover:bg-white/8"}`}><Network className="h-4 w-4 text-[#e9b8a4]" /> Pipeline queue</button><button onClick={() => setActivePanel("connectors")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${activePanel === "connectors" ? "bg-white/12 font-medium" : "text-[#d6e0e4] hover:bg-white/8"}`}><DatabaseZap className="h-4 w-4" /> Connectors</button><button onClick={() => setActivePanel("archive")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${activePanel === "archive" ? "bg-white/12 font-medium" : "text-[#d6e0e4] hover:bg-white/8"}`}><ShieldCheck className="h-4 w-4" /> Delivery archive</button></nav>
          <div className="mt-8 rounded-xl border border-white/10 bg-white/6 p-3"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#e9b8a4]">Run mode</p><p className="mt-2 text-sm font-medium">Free-first DEMO</p><p className="mt-1 text-xs leading-5 text-[#d6e0e4]">No external audit request is made until an authorized connector replaces the placeholder.</p></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[.17em] text-[#c86145]">Pipeline dashboard</p><h1 className="mt-2 font-[Fraunces] text-4xl leading-none sm:text-5xl">Make the next digital move obvious.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#61706f]">Every record preserves its source and evidence boundary from the incoming lead through the final technical handoff.</p></div><Button onClick={() => importDemo.mutate()} disabled={importDemo.isPending} className="h-11 rounded-full bg-[#18344a] px-5 text-white hover:bg-[#294c64]">{importDemo.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Sync DEMO source</Button></div>

          <section className="grid gap-4 sm:grid-cols-3"><Metric label="Imported businesses" value={businesses.length.toString()} note="Web App 1-compatible records" /><Metric label="Completed pipelines" value={audits.filter(item => item.audit.status === "completed").length.toString()} note="Ready for review" /><Metric label="Operating mode" value="DEMO" note="No paid API required" /></section>

          {activePanel === "connectors" && <ConnectorPanel completedAudit={audits.find(item => item.audit.status === "completed")?.audit} onPrepare={() => { const completed = audits.find(item => item.audit.status === "completed"); if (completed) prepareHandoff.mutate({ auditId: completed.audit.auditId }); }} isPreparing={prepareHandoff.isPending} />}
          {activePanel === "archive" && <ArchivePanel auditCount={audits.filter(item => item.audit.status === "completed").length} exportFormat={exportFormat} onFormatChange={setExportFormat} isExporting={exportLatest.isPending} onExport={() => { const latest = audits.find(item => item.audit.status === "completed"); if (latest) exportLatest.mutate({ auditId: latest.audit.auditId, artifactType: "build_specification", format: exportFormat }); else toast.info("No completed pipeline yet"); }} onOpenLatest={() => { const latest = audits.find(item => item.audit.status === "completed"); if (latest) setLocation(`/pipeline/${latest.audit.auditId}`); else toast.info("No completed pipeline yet"); }} />}

          <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d8d0c4] bg-white"><div className="flex items-center justify-between border-b border-[#ece6dd] px-5 py-4"><div><h2 className="font-[Fraunces] text-2xl">Business intake</h2><p className="mt-1 text-xs text-[#6a7572]">Select an imported record, then generate its complete strategic pipeline.</p></div><Badge variant="outline" className="border-[#d8d0c4] font-mono text-[10px]">{dashboard.data?.integration.mode ?? "free_first"}</Badge></div>
            {dashboard.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin text-[#c86145]" /></div> : businesses.length === 0 ? <EmptyImport onClick={() => importDemo.mutate()} isPending={importDemo.isPending} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#fbfaf8] font-mono text-[10px] uppercase tracking-[.12em] text-[#71807c]"><tr><th className="px-5 py-3 font-medium">Business</th><th className="px-4 py-3 font-medium">Opportunity</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Sync</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{businesses.map(business => <tr key={business.id} className={`border-t border-[#ece6dd] transition-colors ${selected?.id === business.id ? "bg-[#fff6f1]" : "hover:bg-[#fbfaf8]"}`}><td className="px-5 py-4"><button onClick={() => setSelectedBusinessId(business.id)} className="text-left"><p className="font-semibold">{business.name}</p><p className="mt-1 text-xs text-[#71807c]">{business.category ?? "Unclassified"} · {business.location ?? "Location missing"}</p></button></td><td className="px-4 py-4"><Score value={business.opportunityScore} /></td><td className="px-4 py-4"><span className="font-mono text-[10px] uppercase text-[#71807c]">{business.dataOrigin.replace("_", " ")}</span></td><td className="px-4 py-4"><Badge className="rounded-full bg-[#dfeeea] text-[#246052] hover:bg-[#dfeeea]">{business.syncStatus}</Badge></td><td className="px-5 py-4 text-right"><Button size="sm" onClick={() => runDemo.mutate({ businessId: business.id })} disabled={runDemo.isPending} className="rounded-full bg-[#18344a] text-white hover:bg-[#294c64]"><Play className="mr-1.5 h-3.5 w-3.5" /> Run pipeline</Button></td></tr>)}</tbody></table></div>}</section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="rounded-[1.5rem] border border-[#d8d0c4] bg-white"><div className="border-b border-[#ece6dd] px-5 py-4"><h2 className="font-[Fraunces] text-2xl">Pipeline activity</h2><p className="mt-1 text-xs text-[#6a7572]">Completed runs remain versioned and ready to open.</p></div>{audits.length === 0 ? <div className="px-5 py-10 text-sm text-[#71807c]">No pipeline has been run yet. Start with the selected business above.</div> : <div>{audits.slice(0, 5).map(({ audit, business }) => <button key={audit.id} onClick={() => setLocation(`/pipeline/${audit.auditId}`)} className="flex w-full items-center justify-between gap-4 border-b border-[#ece6dd] px-5 py-4 text-left last:border-0 hover:bg-[#fbfaf8]"><div className="flex min-w-0 items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-[#2f6c5e]"/><div className="min-w-0"><p className="truncate font-semibold">{business.name}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-[#71807c]">{audit.auditId} · {audit.status}</p></div></div><div className="flex shrink-0 items-center gap-4"><Score value={audit.overallScore ?? 0} /><ArrowUpRight className="h-4 w-4 text-[#c86145]" /></div></button>)}</div>}</div>
            <aside className="rounded-[1.5rem] bg-[#c86145] p-5 text-white"><Sparkles className="h-5 w-5 text-[#ffe2d5]" /><p className="mt-6 font-mono text-[10px] uppercase tracking-[.16em] text-[#ffe2d5]">Selected business</p><h2 className="mt-2 font-[Fraunces] text-3xl leading-none">{selected?.name ?? "Awaiting import"}</h2><p className="mt-4 text-sm leading-6 text-[#ffe2d5]">{selected ? `${selected.websiteStatus.replaceAll("_", " ")} · ${selected.opportunityTypes?.join(" · ") || "strategic opportunity"}` : "Bring in the DEMO source to initialize the working queue."}</p><div className="mt-8 border-t border-white/25 pt-4"><p className="text-xs text-[#ffe2d5]">{selected ? "The pipeline creates structured artifacts from this context without asserting unverified public facts." : "All generated content keeps its evidence source visible."}</p></div></aside>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="rounded-[1.25rem] border border-[#d8d0c4] bg-white p-5"><p className="font-mono text-[10px] uppercase tracking-[.13em] text-[#71807c]">{label}</p><p className="mt-3 font-[Fraunces] text-4xl leading-none">{value}</p><p className="mt-2 text-xs text-[#71807c]">{note}</p></div>; }
function EmptyImport({ onClick, isPending }: { onClick: () => void; isPending: boolean }) { return <div className="grid min-h-52 place-items-center px-5 text-center"><div><CircleAlert className="mx-auto h-5 w-5 text-[#c86145]" /><p className="mt-3 font-medium">The queue is empty.</p><p className="mt-1 text-sm text-[#71807c]">Load the safe DEMO source to validate every stage before connecting a real endpoint.</p><Button onClick={onClick} disabled={isPending} variant="outline" className="mt-4 rounded-full border-[#18344a] text-[#18344a] hover:bg-[#18344a] hover:text-white">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import DEMO</Button></div></div>; }
function ConnectorPanel({ completedAudit, onPrepare, isPreparing }: { completedAudit?: { auditId: string }; onPrepare: () => void; isPreparing: boolean }) { return <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d8d0c4] bg-white"><div className="flex flex-col justify-between gap-4 border-b border-[#ece6dd] px-5 py-5 md:flex-row md:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#c86145]">Integration control</p><h2 className="mt-1 font-[Fraunces] text-3xl">Web App 1 connector path</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#61706f]">The contract is prepared, versioned and safe to review. No real endpoint is called until an authorized provider replaces the placeholder.</p></div><Badge className="w-fit rounded-full bg-[#fbe8a7] text-[#735a00] hover:bg-[#fbe8a7]">Placeholder ready</Badge></div><div className="grid gap-0 md:grid-cols-3">{[["01", "Inbound dossier", "Accepts the Web App 1 dossier contract and preserves lead_id."], ["02", "Strategic pipeline", "Runs free-first DEMO stages or optional LLM refinement."], ["03", "Outbound handoff", "Prepares a signed-ready delivery envelope without sending it."]].map(([step, title, text], index) => <div className="border-b border-[#ece6dd] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0" key={title}><span className="font-mono text-xs text-[#c86145]">{step}</span><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#61706f]">{text}</p>{index === 2 && <Button onClick={onPrepare} disabled={!completedAudit || isPreparing} className="mt-5 rounded-full bg-[#18344a] text-white hover:bg-[#294c64]">{isPreparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cable className="mr-2 h-4 w-4" />} Prepare latest handoff</Button>}</div>)}</div></section>; }
function ArchivePanel({ auditCount, exportFormat, onFormatChange, isExporting, onExport, onOpenLatest }: { auditCount: number; exportFormat: "json" | "markdown" | "pdf"; onFormatChange: (format: "json" | "markdown" | "pdf") => void; isExporting: boolean; onExport: () => void; onOpenLatest: () => void }) { return <section className="mt-5 rounded-[1.5rem] border border-[#d8d0c4] bg-[#fff6f1] p-5"><div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c86145] text-white"><FileOutput className="h-5 w-5" /></div><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#c86145]">Delivery archive</p><h2 className="mt-1 font-[Fraunces] text-2xl">{auditCount} completed {auditCount === 1 ? "package" : "packages"} ready</h2><p className="mt-1 text-sm text-[#61706f]">Export the latest build specification directly from this operating view.</p></div></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Dashboard export format" value={exportFormat} onChange={event => onFormatChange(event.target.value as "json" | "markdown" | "pdf")} className="h-10 rounded-full border border-[#d8d0c4] bg-white px-3 text-xs font-medium text-[#18344a]"><option value="pdf">PDF</option><option value="json">JSON</option><option value="markdown">Markdown</option></select><Button onClick={onExport} disabled={isExporting || auditCount === 0} className="rounded-full bg-[#18344a] text-white hover:bg-[#294c64]">{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Export build spec</Button><Button onClick={onOpenLatest} variant="outline" className="rounded-full border-[#18344a] text-[#18344a]"><CheckCircle2 className="mr-2 h-4 w-4" /> Open latest <ChevronRight className="ml-1 h-4 w-4" /></Button></div></div></section>; }
