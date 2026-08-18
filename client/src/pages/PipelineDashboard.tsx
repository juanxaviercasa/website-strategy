import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { filterAndSortBusinesses, type QueueFilterState } from "@/lib/queueFilters";
import { createSavedQueueView, removeSavedQueueView, type SavedQueueView } from "@/lib/savedQueueViews";
import { nextConnectorRetryAt } from "@/lib/retryPolicy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUpRight, Sparkles, RefreshCcw, Network, Play, ShieldCheck, DatabaseZap, CircleAlert, Cable, CheckCircle2, FileOutput, ChevronRight, Download, Search, ArrowDownUp, Filter, Clock3, CircleDashed, MapPin, Tags, RotateCcw, GitCompareArrows, BellRing, X, BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
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
  const connectorStatus = trpc.pipeline.connectorStatus.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30_000 });
  const latestCompletedAuditId = dashboard.data?.audits.find(item => item.audit.status === "completed")?.audit.auditId ?? "";
  const exportHistory = trpc.pipeline.exports.useQuery({ auditId: latestCompletedAuditId }, { enabled: isAuthenticated && Boolean(latestCompletedAuditId) });
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<"queue" | "connectors" | "archive">(() => {
    const panel = new URLSearchParams(window.location.search).get("panel");
    return panel === "connectors" || panel === "archive" ? panel : "queue";
  });
  const [exportFormat, setExportFormat] = useState<"json" | "markdown" | "pdf">("pdf");
  const [searchTerm, setSearchTerm] = useState("");
  const [opportunityFilter, setOpportunityFilter] = useState<"all" | "priority" | "watch">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"opportunity_desc" | "opportunity_asc" | "name" | "sync">("opportunity_desc");
  const [handoffPrepared, setHandoffPrepared] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViews, setSavedViews] = useState<SavedQueueView[]>(() => {
    try { return JSON.parse(window.localStorage.getItem("strategy-engine.queue-views") ?? "[]") as SavedQueueView[]; } catch { return []; }
  });
  const hasAutoImported = useRef(false);
  const hasAutoRun = useRef(false);
  const importDemo = trpc.pipeline.importDemo.useMutation({
    onSuccess: async (result) => {
      await utils.pipeline.dashboard.invalidate();
      await utils.pipeline.connectorStatus.invalidate();
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
    onSuccess: async result => { setHandoffPrepared(true); await utils.pipeline.connectorStatus.invalidate(); toast.success("Handoff prepared", { description: result.note }); },
    onError: error => toast.error("Handoff unavailable", { description: error.message }),
  });
  const exportLatest = trpc.pipeline.exportArtifact.useMutation({
    onSuccess: file => {
      void utils.pipeline.exports.invalidate();
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

  useEffect(() => {
    window.localStorage.setItem("strategy-engine.queue-views", JSON.stringify(savedViews));
  }, [savedViews]);

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
  const completedAudits = audits.filter(item => item.audit.status === "completed");
  const latestCompleted = completedAudits[0];
  const categories = Array.from(new Set(businesses.map(item => item.category).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
  const locations = Array.from(new Set(businesses.map(item => item.location).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
  const currentFilters: QueueFilterState = { searchTerm, opportunityFilter, categoryFilter, locationFilter, sortBy };
  const visibleBusinesses = filterAndSortBusinesses(businesses, currentFilters);
  const selected = businesses.find(item => item.id === selectedBusinessId) ?? businesses[0];
  const failedConnector = (connectorStatus.data?.syncs ?? []).find(item => item.status === "failed");
  const alerts = [
    ...(failedConnector ? [{ id: `failed-${failedConnector.connector}`, tone: "critical" as const, title: "Connector retry required", text: `${failedConnector.connector} reported a failed activity and can be retried safely.`, action: () => importDemo.mutate(), actionLabel: "Retry DEMO sync" }] : []),
    ...(!handoffPrepared ? [{ id: "outbound-placeholder", tone: "notice" as const, title: "Outbound endpoint pending authorization", text: "The handoff can be prepared and reviewed, but no external delivery occurs until an authorized endpoint is configured.", action: () => latestCompleted && prepareHandoff.mutate({ auditId: latestCompleted.audit.auditId }), actionLabel: "Prepare handoff" }] : []),
    ...(savedViews.length === 0 ? [{ id: "save-view", tone: "info" as const, title: "Save a repeatable queue view", text: "Store the current filters in this browser to return to a priority cohort quickly.", action: () => document.getElementById("save-queue-view")?.focus(), actionLabel: "Name this view" }] : []),
  ].filter(item => !dismissedAlerts.includes(item.id));
  const saveCurrentView = () => {
    const name = savedViewName.trim();
    if (!name) { toast.info("Name the view first", { description: "Use a short label such as 'Lima priority leads'." }); return; }
    setSavedViews(current => [...current, createSavedQueueView(crypto.randomUUID(), name, currentFilters)]);
    setSavedViewName("");
    toast.success("Queue view saved", { description: `${name} is available in this browser.` });
  };
  const applySavedView = (id: string) => {
    const view = savedViews.find(item => item.id === id);
    if (!view) return;
    setSearchTerm(view.filters.searchTerm); setOpportunityFilter(view.filters.opportunityFilter); setCategoryFilter(view.filters.categoryFilter); setLocationFilter(view.filters.locationFilter); setSortBy(view.filters.sortBy);
    toast.success("Queue view applied", { description: view.name });
  };
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

          <section className="grid gap-4 sm:grid-cols-3"><Metric label="Imported businesses" value={businesses.length.toString()} note="Web App 1-compatible records" /><Metric label="Completed pipelines" value={completedAudits.length.toString()} note="Ready for review" /><Metric label="Operating mode" value="DEMO" note="No paid API required" /></section>

          {alerts.length > 0 && <SystemAlerts alerts={alerts} onDismiss={id => setDismissedAlerts(current => [...current, id])} />}

          {activePanel === "connectors" && <ConnectorPanel completedAudit={latestCompleted?.audit} events={(connectorStatus.data?.syncs ?? []) as ConnectorEvent[]} refreshedAt={connectorStatus.data?.refreshedAt ?? new Date()} handoffState={prepareHandoff.isPending ? "preparing" : handoffPrepared ? "prepared" : "placeholder"} onRetryInbound={() => importDemo.mutate()} isRetryingInbound={importDemo.isPending} onPrepare={() => { if (latestCompleted) prepareHandoff.mutate({ auditId: latestCompleted.audit.auditId }); }} isPreparing={prepareHandoff.isPending} />}
          {activePanel === "archive" && <ArchivePanel auditCount={completedAudits.length} exportFormat={exportFormat} onFormatChange={setExportFormat} isExporting={exportLatest.isPending} history={exportHistory.data ?? []} historyLoading={exportHistory.isLoading} onOpenExport={url => window.open(url, "_blank", "noopener,noreferrer")} onExport={() => { if (latestCompleted) exportLatest.mutate({ auditId: latestCompleted.audit.auditId, artifactType: "build_specification", format: exportFormat }); else toast.info("No completed pipeline yet"); }} onOpenLatest={() => { if (latestCompleted) setLocation(`/pipeline/${latestCompleted.audit.auditId}`); else toast.info("No completed pipeline yet"); }} />}

          <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d8d0c4] bg-white"><div className="flex flex-col justify-between gap-4 border-b border-[#ece6dd] px-5 py-4 xl:flex-row xl:items-center"><div><h2 className="font-[Fraunces] text-2xl">Business intake</h2><p className="mt-1 text-xs text-[#6a7572]">Filter the queue, prioritize opportunity and then generate a complete pipeline.</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[#d8d0c4] font-mono text-[10px]">{visibleBusinesses.length}/{businesses.length} visible</Badge><Badge variant="outline" className="border-[#d8d0c4] font-mono text-[10px]">{dashboard.data?.integration.mode ?? "free_first"}</Badge></div></div><div className="grid gap-3 border-b border-[#ece6dd] bg-[#fbfaf8] px-5 py-3 md:grid-cols-[minmax(0,1fr)_170px_190px]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71807c]" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filter by business, category or location" className="h-10 w-full rounded-xl border border-[#d8d0c4] bg-white pl-9 pr-3 text-sm outline-none ring-[#c86145] focus:ring-2" /></label><label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71807c]" /><select aria-label="Opportunity filter" value={opportunityFilter} onChange={event => setOpportunityFilter(event.target.value as "all" | "priority" | "watch")} className="h-10 w-full appearance-none rounded-xl border border-[#d8d0c4] bg-white pl-8 pr-3 text-xs font-medium text-[#18344a]"><option value="all">All opportunities</option><option value="priority">Priority 80+</option><option value="watch">Below 80</option></select></label><label className="relative"><ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71807c]" /><select aria-label="Business sort order" value={sortBy} onChange={event => setSortBy(event.target.value as "opportunity_desc" | "opportunity_asc" | "name" | "sync")} className="h-10 w-full appearance-none rounded-xl border border-[#d8d0c4] bg-white pl-8 pr-3 text-xs font-medium text-[#18344a]"><option value="opportunity_desc">Opportunity: high to low</option><option value="opportunity_asc">Opportunity: low to high</option><option value="name">Business name: A–Z</option><option value="sync">Sync status</option></select></label></div>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#ece6dd] bg-[#fbfaf8] px-5 py-3"><label className="relative min-w-[200px] flex-1"><Tags className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71807c]" /><select aria-label="Category filter" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-[#d8d0c4] bg-white pl-8 pr-3 text-xs font-medium text-[#18344a]"><option value="all">All categories</option>{categories.map(category => <option value={category} key={category}>{category}</option>)}</select></label><label className="relative min-w-[220px] flex-1"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71807c]" /><select aria-label="Location filter" value={locationFilter} onChange={event => setLocationFilter(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-[#d8d0c4] bg-white pl-8 pr-3 text-xs font-medium text-[#18344a]"><option value="all">All locations</option>{locations.map(location => <option value={location} key={location}>{location}</option>)}</select></label><button onClick={() => { setSearchTerm(""); setOpportunityFilter("all"); setCategoryFilter("all"); setLocationFilter("all"); }} className="text-xs font-medium text-[#c86145] underline underline-offset-4">Reset all filters</button></div>
            <div className="flex flex-col gap-3 border-b border-[#ece6dd] bg-white px-5 py-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><Bookmark className="h-4 w-4 text-[#c86145]" /><select aria-label="Saved queue views" defaultValue="" onChange={event => { if (event.target.value) applySavedView(event.target.value); event.currentTarget.value = ""; }} className="h-9 min-w-[190px] rounded-lg border border-[#d8d0c4] bg-white px-3 text-xs text-[#18344a]"><option value="">Saved queue views ({savedViews.length})</option>{savedViews.map(view => <option value={view.id} key={view.id}>{view.name}</option>)}</select>{savedViews.length > 0 && <button onClick={() => setSavedViews([])} className="inline-flex items-center gap-1 text-xs text-[#71807c] hover:text-[#c86145]"><Trash2 className="h-3.5 w-3.5" /> Clear views</button>}</div><div className="flex flex-wrap items-center gap-2"><input id="save-queue-view" value={savedViewName} onChange={event => setSavedViewName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") saveCurrentView(); }} placeholder="Name current view" className="h-9 w-44 rounded-lg border border-[#d8d0c4] px-3 text-xs outline-none ring-[#c86145] focus:ring-2"/><Button size="sm" onClick={saveCurrentView} className="h-9 rounded-lg bg-[#18344a] text-white hover:bg-[#294c64]"><BookmarkPlus className="mr-1.5 h-3.5 w-3.5" /> Save view</Button></div>{savedViews.length > 0 && <div className="flex w-full flex-wrap gap-2 border-t border-[#ece6dd] pt-3">{savedViews.map(view => <span className="inline-flex items-center overflow-hidden rounded-full border border-[#d8d0c4] bg-[#fbfaf8] text-xs" key={view.id}><button onClick={() => applySavedView(view.id)} className="px-3 py-1.5 text-[#18344a] hover:bg-white">{view.name}</button><button aria-label={`Delete saved view ${view.name}`} onClick={() => setSavedViews(current => removeSavedQueueView(current, view.id))} className="border-l border-[#d8d0c4] px-2 py-1.5 text-[#71807c] hover:bg-[#fff1ed] hover:text-[#b5452f]"><X className="h-3 w-3" /></button></span>)}</div>}</div>
            {dashboard.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin text-[#c86145]" /></div> : businesses.length === 0 ? <EmptyImport onClick={() => importDemo.mutate()} isPending={importDemo.isPending} /> : visibleBusinesses.length === 0 ? <div className="grid min-h-44 place-items-center px-5 text-center"><div><Search className="mx-auto h-5 w-5 text-[#c86145]" /><p className="mt-3 font-medium">No businesses match this view.</p><button onClick={() => { setSearchTerm(""); setOpportunityFilter("all"); setCategoryFilter("all"); setLocationFilter("all"); }} className="mt-2 text-sm text-[#c86145] underline underline-offset-4">Reset filters</button></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-[#fbfaf8] font-mono text-[10px] uppercase tracking-[.12em] text-[#71807c]"><tr><th className="px-5 py-3 font-medium">Business</th><th className="px-4 py-3 font-medium">Opportunity</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Sync</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visibleBusinesses.map(business => <tr key={business.id} className={`border-t border-[#ece6dd] transition-colors ${selected?.id === business.id ? "bg-[#fff6f1]" : "hover:bg-[#fbfaf8]"}`}><td className="px-5 py-4"><button onClick={() => setSelectedBusinessId(business.id)} className="text-left"><p className="font-semibold">{business.name}</p><p className="mt-1 text-xs text-[#71807c]">{business.category ?? "Unclassified"} · {business.location ?? "Location missing"}</p></button></td><td className="px-4 py-4"><Score value={business.opportunityScore} /></td><td className="px-4 py-4"><span className="font-mono text-[10px] uppercase text-[#71807c]">{business.dataOrigin.replace("_", " ")}</span></td><td className="px-4 py-4"><Badge className="rounded-full bg-[#dfeeea] text-[#246052] hover:bg-[#dfeeea]">{business.syncStatus}</Badge></td><td className="px-5 py-4 text-right"><Button size="sm" onClick={() => runDemo.mutate({ businessId: business.id })} disabled={runDemo.isPending} className="rounded-full bg-[#18344a] text-white hover:bg-[#294c64]"><Play className="mr-1.5 h-3.5 w-3.5" /> Run pipeline</Button></td></tr>)}</tbody></table></div>}</section>

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
type SystemAlert = { id: string; tone: "critical" | "notice" | "info"; title: string; text: string; action: () => void; actionLabel: string };
function SystemAlerts({ alerts, onDismiss }: { alerts: SystemAlert[]; onDismiss: (id: string) => void }) {
  const styles = { critical: "border-[#eab4a8] bg-[#fff1ed]", notice: "border-[#ecd99a] bg-[#fff9e7]", info: "border-[#cddce4] bg-[#f2f8fa]" };
  return <section className="mt-5 grid gap-3">{alerts.map(alert => <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${styles[alert.tone]}`} key={alert.id}><BellRing className={`h-5 w-5 shrink-0 ${alert.tone === "critical" ? "text-[#b5452f]" : alert.tone === "notice" ? "text-[#8a6a00]" : "text-[#3f6575]"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{alert.title}</p><p className="mt-1 text-xs leading-5 text-[#61706f]">{alert.text}</p></div><div className="flex shrink-0 items-center gap-2"><Button size="sm" variant="outline" onClick={alert.action} className="rounded-full border-[#18344a] text-[#18344a]">{alert.actionLabel}</Button><button aria-label={`Dismiss ${alert.title}`} onClick={() => onDismiss(alert.id)} className="grid h-8 w-8 place-items-center rounded-full text-[#71807c] hover:bg-white/70 hover:text-[#18344a]"><X className="h-4 w-4" /></button></div></div>)}</section>;
}
function EmptyImport({ onClick, isPending }: { onClick: () => void; isPending: boolean }) { return <div className="grid min-h-52 place-items-center px-5 text-center"><div><CircleAlert className="mx-auto h-5 w-5 text-[#c86145]" /><p className="mt-3 font-medium">The queue is empty.</p><p className="mt-1 text-sm text-[#71807c]">Load the safe DEMO source to validate every stage before connecting a real endpoint.</p><Button onClick={onClick} disabled={isPending} variant="outline" className="mt-4 rounded-full border-[#18344a] text-[#18344a] hover:bg-[#18344a] hover:text-white">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import DEMO</Button></div></div>; }
type ExportHistoryItem = { id: number; artifactType: string; format: string; fileName: string; storageUrl: string; createdAt: Date };
type ConnectorEvent = { connector: string; direction: "inbound" | "outbound"; status: "succeeded" | "failed" | "placeholder"; createdAt: Date };

function StatusPill({ tone, label }: { tone: "ready" | "waiting" | "working"; label: string }) {
  const styles = tone === "ready" ? "bg-[#dfeeea] text-[#246052]" : tone === "working" ? "bg-[#e7edf0] text-[#3f5661]" : "bg-[#fbe8a7] text-[#735a00]";
  const Icon = tone === "ready" ? CheckCircle2 : tone === "working" ? CircleDashed : Clock3;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[9px] uppercase tracking-[.08em] ${styles}`}><Icon className={`h-3 w-3 ${tone === "working" ? "animate-spin" : ""}`} />{label}</span>;
}

function ConnectorPanel({ completedAudit, events, refreshedAt, handoffState, onRetryInbound, isRetryingInbound, onPrepare, isPreparing }: { completedAudit?: { auditId: string }; events: ConnectorEvent[]; refreshedAt: Date; handoffState: "placeholder" | "preparing" | "prepared"; onRetryInbound: () => void; isRetryingInbound: boolean; onPrepare: () => void; isPreparing: boolean }) {
  const inboundEvent = events.find(item => item.direction === "inbound");
  const outboundEvent = events.find(item => item.connector === "web_app_1_result_placeholder");
  const activity = (event?: ConnectorEvent) => event ? new Date(event.createdAt).toLocaleString() : "No activity recorded";
  const retryTime = (event?: ConnectorEvent) => {
    const next = nextConnectorRetryAt(event ? new Date(event.createdAt) : undefined);
    return next.getTime() <= Date.now() + 1_000 ? "Available now" : next.toLocaleTimeString();
  };
  const cards = [
    { step: "01", title: "Inbound dossier", text: "Accepts the Web App 1 dossier contract and preserves lead_id.", status: inboundEvent?.status === "failed" ? "waiting" as const : "ready" as const, label: inboundEvent?.status === "failed" ? "Retry available" : "DEMO synced", activity: activity(inboundEvent), retryAt: retryTime(inboundEvent), action: onRetryInbound, pending: isRetryingInbound, actionLabel: "Retry DEMO sync" },
    { step: "02", title: "Generation engine", text: "Runs deterministic DEMO stages and can add optional LLM refinement.", status: "ready" as const, label: "Ready", activity: "On-demand pipeline generation", retryAt: "Not required" },
    { step: "03", title: "S3 exports", text: "Persists JSON, Markdown and PDF exports outside the application runtime.", status: "ready" as const, label: "Storage ready", activity: "Available for the latest completed pipeline", retryAt: "Not required" },
    { step: "04", title: "Outbound handoff", text: "Prepares a signed-ready delivery envelope without sending it to an external endpoint.", status: handoffState === "prepared" ? "ready" as const : handoffState === "preparing" ? "working" as const : "waiting" as const, label: handoffState === "prepared" ? "Prepared" : handoffState === "preparing" ? "Preparing" : "Placeholder", activity: handoffState === "prepared" ? new Date().toLocaleString() : activity(outboundEvent), retryAt: retryTime(outboundEvent), action: onPrepare, pending: isPreparing, actionLabel: "Retry latest handoff" },
  ];
  return <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d8d0c4] bg-white"><div className="flex flex-col justify-between gap-4 border-b border-[#ece6dd] px-5 py-5 md:flex-row md:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#c86145]">Integration control</p><h2 className="mt-1 font-[Fraunces] text-3xl">Web App 1 connector path</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#61706f]">Visual states distinguish active internal services from authorization-dependent external placeholders.</p></div><div className="text-left md:text-right"><StatusPill tone={handoffState === "prepared" ? "ready" : handoffState === "preparing" ? "working" : "waiting"} label={handoffState === "prepared" ? "Handoff staged" : handoffState === "preparing" ? "Preparing" : "External endpoint pending"} /><p className="mt-2 font-mono text-[9px] uppercase tracking-[.08em] text-[#71807c]">Refreshed {new Date(refreshedAt).toLocaleTimeString()}</p></div></div><div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">{cards.map(card => <div className="border-b border-[#ece6dd] p-5 last:border-b-0 md:border-r md:last:border-r-0 xl:border-b-0" key={card.title}><span className="font-mono text-xs text-[#c86145]">{card.step}</span><div className="mt-4"><StatusPill tone={card.status} label={card.label} /></div><h3 className="mt-4 font-semibold">{card.title}</h3><p className="mt-2 text-sm leading-6 text-[#61706f]">{card.text}</p><p className="mt-4 border-t border-[#ece6dd] pt-3 font-mono text-[9px] uppercase tracking-[.08em] text-[#71807c]">Last activity<br/><span className="normal-case tracking-normal text-[#3f5661]">{card.activity}</span></p><p className="mt-3 font-mono text-[9px] uppercase tracking-[.08em] text-[#71807c]">Next retry<br/><span className="normal-case tracking-normal text-[#c86145]">{card.retryAt}</span></p>{card.action && <Button onClick={card.action} disabled={(card.title === "Outbound handoff" && !completedAudit) || card.pending} variant={card.title === "Outbound handoff" ? "default" : "outline"} className={`mt-5 rounded-full ${card.title === "Outbound handoff" ? "bg-[#18344a] text-white hover:bg-[#294c64]" : "border-[#18344a] text-[#18344a]"}`}>{card.pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}{card.actionLabel}</Button>}</div>)}</div></section>;
}

function ArchivePanel({ auditCount, exportFormat, onFormatChange, isExporting, history, historyLoading, onOpenExport, onExport, onOpenLatest }: { auditCount: number; exportFormat: "json" | "markdown" | "pdf"; onFormatChange: (format: "json" | "markdown" | "pdf") => void; isExporting: boolean; history: ExportHistoryItem[]; historyLoading: boolean; onOpenExport: (url: string) => void; onExport: () => void; onOpenLatest: () => void }) {
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [contentById, setContentById] = useState<Record<number, string>>({});
  const [contentError, setContentError] = useState<string | null>(null);
  const selected = history.filter(file => compareIds.includes(file.id));
  const compareKey = selected.map(file => `${file.id}:${file.format}`).join(",");
  const toggleCompare = (id: number) => setCompareIds(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 2 ? [...current, id] : [current[1]!, id]);
  useEffect(() => {
    let cancelled = false;
    if (selected.length !== 2) { setContentById({}); setContentError(null); return; }
    if (selected.some(file => file.format === "pdf")) { setContentById({}); setContentError("Content comparison is available for JSON and Markdown exports. PDF files remain available for metadata comparison and download."); return; }
    setContentError(null);
    Promise.all(selected.map(async file => {
      const response = await fetch(file.storageUrl);
      if (!response.ok) throw new Error(`Could not load ${file.fileName}`);
      return [file.id, await response.text()] as const;
    })).then(entries => { if (!cancelled) setContentById(Object.fromEntries(entries)); }).catch(error => { if (!cancelled) setContentError(error instanceof Error ? error.message : "Content comparison could not be loaded."); });
    return () => { cancelled = true; };
  }, [compareKey]);
  return <section className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#d8d0c4] bg-[#fff6f1]"><div className="flex flex-col justify-between gap-5 p-5 xl:flex-row xl:items-center"><div className="flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c86145] text-white"><FileOutput className="h-5 w-5" /></div><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#c86145]">Delivery archive</p><h2 className="mt-1 font-[Fraunces] text-2xl">{auditCount} completed {auditCount === 1 ? "package" : "packages"} ready</h2><p className="mt-1 text-sm text-[#61706f]">Export the latest build specification or compare any two stored deliverables below.</p></div></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Dashboard export format" value={exportFormat} onChange={event => onFormatChange(event.target.value as "json" | "markdown" | "pdf")} className="h-10 rounded-full border border-[#d8d0c4] bg-white px-3 text-xs font-medium text-[#18344a]"><option value="pdf">PDF</option><option value="json">JSON</option><option value="markdown">Markdown</option></select><Button onClick={onExport} disabled={isExporting || auditCount === 0} className="rounded-full bg-[#18344a] text-white hover:bg-[#294c64]">{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Export build spec</Button><Button onClick={onOpenLatest} variant="outline" className="rounded-full border-[#18344a] text-[#18344a]"><CheckCircle2 className="mr-2 h-4 w-4" /> Open latest <ChevronRight className="ml-1 h-4 w-4" /></Button></div></div><div className="border-t border-[#eddacd] bg-white/60 px-5 py-4"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#71807c]">Download history</p><p className="mt-1 text-xs text-[#71807c]">Choose two files to compare metadata, format and delivery timing.</p></div><Badge variant="outline" className="border-[#d8d0c4] font-mono text-[10px]">{history.length} files</Badge></div>{historyLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-[#71807c]"><Loader2 className="h-4 w-4 animate-spin" /> Loading export history</div> : history.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-[#d8d0c4] bg-white/70 p-4 text-sm text-[#71807c]">No stored export yet. Create the first file with the format selector above.</div> : <><div className="mt-4 grid gap-2">{history.map(file => <div className={`flex flex-col justify-between gap-3 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center ${compareIds.includes(file.id) ? "border-[#c86145] ring-1 ring-[#c86145]/20" : "border-[#e9ddd4]"}`} key={file.id}><label className="flex min-w-0 items-center gap-3"><input aria-label={`Compare ${file.fileName}`} type="checkbox" checked={compareIds.includes(file.id)} onChange={() => toggleCompare(file.id)} className="h-4 w-4 accent-[#c86145]"/><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.fileName}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-[#71807c]">{file.artifactType.replaceAll("_", " ")} · {file.format} · {new Date(file.createdAt).toLocaleString()}</p></div></label><Button size="sm" variant="outline" onClick={() => onOpenExport(file.storageUrl)} className="w-fit rounded-full border-[#18344a] text-[#18344a]"><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button></div>)}</div>{selected.length === 2 && <div className="mt-4 overflow-hidden rounded-xl border border-[#c86145]/30 bg-[#fff9f6]"><div className="flex items-center gap-2 border-b border-[#f1d5c9] px-4 py-3"><GitCompareArrows className="h-4 w-4 text-[#c86145]"/><p className="font-semibold">Visual export comparison</p><Badge className="ml-auto bg-[#fbe8e3] text-[#9b3d29] hover:bg-[#fbe8e3]">{contentError ? "Content unavailable" : selected.some(file => file.format === "pdf") ? "Metadata + download" : "Metadata + content"}</Badge></div><div className="grid md:grid-cols-2">{selected.map((file, index) => <div className={`p-4 ${index === 0 ? "border-b border-[#f1d5c9] md:border-b-0 md:border-r" : ""}`} key={file.id}><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#c86145]">{index === 0 ? "Version A" : "Version B"}</p><p className="mt-2 break-all font-semibold">{file.fileName}</p><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#71807c]">Format</dt><dd className="font-medium uppercase">{file.format}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#71807c]">Artifact</dt><dd className="font-medium">{file.artifactType.replaceAll("_", " ")}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#71807c]">Created</dt><dd className="text-right font-medium">{new Date(file.createdAt).toLocaleString()}</dd></div></dl>{contentById[file.id] && <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-[#18344a] p-3 text-[11px] leading-5 text-[#d6e0e4]">{formatExportContent(contentById[file.id]!, file.format)}</pre>}</div>)}</div>{contentError && <p className="border-t border-[#f1d5c9] px-4 py-3 text-xs text-[#9b3d29]">{contentError}</p>}</div>}</>}</div></section>;
}

function formatExportContent(content: string, format: string) {
  if (format === "json") {
    try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; }
  }
  return content;
}
