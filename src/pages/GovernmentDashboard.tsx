import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, LogOut, FileText, BarChart3, Search, Eye, Bookmark, Plus, Trash2, UserCheck, History, Lock, Clock, Activity, Edit, RefreshCcw, AlertTriangle, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useGovernmentAnalytics, useGovernmentApplications } from "@/hooks/useGovernment";
import { useSchemes } from "@/hooks/useSchemes";
import { indianStates } from "@/data/schemes";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { io } from "socket.io-client";

const COLORS = ['hsl(24, 90%, 50%)', 'hsl(200, 80%, 50%)', 'hsl(150, 60%, 45%)', 'hsl(280, 60%, 55%)', 'hsl(350, 70%, 55%)'];

const GovernmentDashboard = () => {
  const queryClient = useQueryClient();
  const { logout, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [appFilters, setAppFilters] = useState({ status: "", search: "" });
  const [activeTab, setActiveTab] = useState("scraper");
  const { toast } = useToast();
  const [scraped, setScraped] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedSchemes, setPublishedSchemes] = useState<any[]>([]);
  const [publishForm, setPublishForm] = useState({
    name: '', ministry: '', description: '', benefits: '',
    eligibility: '', documents: '', applyLink: '', tags: '', deadline: ''
  });
  const [publishingScrapedId, setPublishingScrapedId] = useState<string | null>(null);
  const [editSchemeDialog, setEditSchemeDialog] = useState(false);
  const [editSchemeForm, setEditSchemeForm] = useState({
    id: '', name: '', ministry: '', description: '', benefits: '',
    eligibility: '', documents: '', applyLink: '', tags: '', deadline: ''
  });
  const [updatingScheme, setUpdatingScheme] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [pendingAgents, setPendingAgents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [agentDialog, setAgentDialog] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", location: "", phone: "", expertise: "" });

  const { data: analytics } = useGovernmentAnalytics();
  const { data: applications = [] } = useGovernmentApplications(appFilters);
  const { data: schemes = [] } = useSchemes();

  const handleLogout = () => { logout(); navigate("/"); };

  const filteredApps = applications.filter((a: any) =>
    !appFilters.search || a.schemeName.toLowerCase().includes(appFilters.search.toLowerCase()) || a.userName.toLowerCase().includes(appFilters.search.toLowerCase())
  );

  const fetchScrapedSchemes = async () => {
    setScraping(true);
    try {
      // Government can view scraped data, but we'll use the same triggger point if allowed
      // In the backend, we might need to adjust roleGuard if gov should also trigger
      await api.post('/admin/scrape/trigger', {}).catch(() => console.log("Trigger skipped - fetch only"));
      const data = await api.get<any>('/government/scraped-data');
      setScraped(data);
      toast({ title: "Live Portal Sync Complete!" });
    } catch (error) {
      toast({ title: "Failed to sync live data", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const fetchAgents = () => {
    api.get<any[]>("/government/active-agents").then(setAgents).catch(console.error);
    api.get<any[]>("/government/pending-agents").then(setPendingAgents).catch(console.error);
  };

  const fetchPublishedSchemes = async () => {
    try {
      const data = await api.get<{ schemes: any[] }>('/schemes?source=government');
      setPublishedSchemes(data.schemes || []);
    } catch (e) { console.error(e); }
  };

  const handlePublishScheme = async () => {
    if (!publishForm.name || !publishForm.ministry || !publishForm.description || !publishForm.benefits) {
      toast({ title: 'Missing required fields', description: 'Name, Ministry, Description and Benefits are required.', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    try {
      await api.post('/government/publish-scheme', publishForm);
      toast({ title: '✅ Scheme Published!', description: `"${publishForm.name}" is now live for all users and agents.` });
      
      if (publishingScrapedId) {
        await api.delete(`/government/schemes/${publishingScrapedId}`).catch(() => {});
        fetchScrapedSchemes();
      }
      
      setPublishForm({ name: '', ministry: '', description: '', benefits: '', eligibility: '', documents: '', applyLink: '', tags: '', deadline: '' });
      setPublishingScrapedId(null);
      fetchPublishedSchemes();
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
      setActiveTab("schemes");
    } catch (err: any) {
      toast({ title: 'Publish Failed', description: err.message || 'Could not publish scheme.', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishFromScrape = (s: any) => {
    const formObj = {
      name: s.name || '',
      ministry: s.ministry || 'Government of India',
      description: s.description || 'A welfare scheme discovered via automated scraping.',
      benefits: s.benefits || 'Check official link for benefit details.',
      eligibility: typeof s.eligibility === 'string' ? s.eligibility : 'Check official link for eligibility criteria.',
      documents: Array.isArray(s.documents) ? s.documents.join(', ') : (s.documents || ''),
      applyLink: s.officialLink || '',
      tags: (s.tags || []).join(', '),
      deadline: '',
    };

    setPublishForm(formObj);
    setPublishingScrapedId(s.id);
    setActiveTab("publish");
    toast({ title: 'Scheme loaded for review', description: 'Please review and modify details before publishing.' });
  };

  const handleDeletePublishedScheme = async (id: string) => {
    if (!confirm('Remove this scheme from the public platform?')) return;
    try {
      await api.delete(`/government/schemes/${id}`);
      toast({ title: 'Scheme removed' });
      fetchPublishedSchemes();
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    } catch { toast({ title: 'Failed to remove scheme', variant: 'destructive' }); }
  };

  const handleOpenEditScheme = (s: any) => {
    setEditSchemeForm({
      id: s.id,
      name: s.name || '',
      ministry: s.ministry || '',
      description: s.description || '',
      benefits: s.benefits || '',
      eligibility: s.eligibility || '',
      documents: Array.isArray(s.documents) ? s.documents.join(', ') : (s.documents || ''),
      applyLink: s.applyLink || '',
      tags: Array.isArray(s.tags) ? s.tags.join(', ') : (s.tags || ''),
      deadline: s.deadline || ''
    });
    setEditSchemeDialog(true);
  };

  const handleUpdateScheme = async () => {
    if (!editSchemeForm.name || !editSchemeForm.ministry || !editSchemeForm.description || !editSchemeForm.benefits) {
      toast({ title: 'Missing required fields', description: 'Name, Ministry, Description and Benefits are required.', variant: 'destructive' });
      return;
    }
    setUpdatingScheme(true);
    try {
      await api.put(`/government/schemes/${editSchemeForm.id}`, editSchemeForm);
      toast({ title: '✅ Scheme Updated!', description: `"${editSchemeForm.name}" has been updated successfully.` });
      setEditSchemeDialog(false);
      fetchPublishedSchemes();
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message || 'Could not update scheme.', variant: 'destructive' });
    } finally {
      setUpdatingScheme(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const data = await api.get<{ logs: any[] }>("/government/audit-logs");
      setAuditLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleResolveAgent = async (userId: string, status: 'active' | 'rejected') => {
    try {
      await api.post("/government/resolve-agent-status", { userId, status });
      toast({ title: status === 'active' ? "Agent approved!" : "Agent rejected." });
      fetchAgents();
    } catch(e: any) {
      console.error('Resolve Agent Error:', e.response?.data || e.message);
      toast({ title: "Failed to resolve status", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const handleCreateAgent = async () => {
    try {
      await api.post("/agents", newAgent);
      toast({ title: "Agent Verified & Registered!" });
      setAgentDialog(false);
      setNewAgent({ name: "", location: "", phone: "", expertise: "" });
      fetchAgents();
    } catch(e) {
      toast({ title: "Failed to register agent", description: "Only government officials can manage agents.", variant: "destructive" });
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Remove this agent's verification?")) return;
    try {
      await api.delete(`/agents/${id}`);
      toast({ title: "Agent removed" });
      fetchAgents();
    } catch(e) {
      toast({ title: "Failed to delete agent", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchAuditLogs();
    fetchPublishedSchemes();
    fetchScrapedSchemes();

    // Connect to WebSocket for real-time scraped schemes
    // FIX: Removed hardcoded localhost:3001 — now uses VITE_WS_URL env variable
    const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(WS_URL);
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socket.on('NEW_SCHEME_SCRAPED', (newSchemes: any[]) => {
      console.log('Real-time scraped schemes received:', newSchemes);
      toast({
        title: "📡 Live AI Scraper Update",
        description: `Discovered ${newSchemes.length} new schemes in real-time.`,
      });
      // Refresh the scraped data view
      fetchScrapedSchemes();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const statusColor = (status: string) => {
    if (status === "approved") return "bg-success/10 text-success";
    if (status === "rejected") return "bg-destructive/10 text-destructive";
    if (status === "submitted") return "bg-info/10 text-info";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            <span className="font-heading font-bold text-lg text-foreground">Gov Panel</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-2xl text-foreground mb-6">Government / Scheme Manager</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border">
             <TabsTrigger value="applications"><FileText className="h-4 w-4 mr-1" /> Applications</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
            <TabsTrigger value="agents"><UserCheck className="h-4 w-4 mr-1" /> Agent Management</TabsTrigger>
            <TabsTrigger value="approvals" className="relative" onClick={fetchAgents}>
              <Shield className="h-4 w-4 mr-1" /> Account Approvals
              {pendingAgents.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="schemes"><FileText className="h-4 w-4 mr-1" /> Schemes</TabsTrigger>
            <TabsTrigger value="publish"><Plus className="h-4 w-4 mr-1" /> Publish Scheme</TabsTrigger>
            <TabsTrigger value="audit-trail"><History className="h-4 w-4 mr-1" /> Audit Trail</TabsTrigger>
            <TabsTrigger value="scraper"><Search className="h-4 w-4 mr-1" /> Scraper</TabsTrigger>
            <TabsTrigger value="revenue"><Activity className="h-4 w-4 mr-1" /> Revenue & Performance</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" /> Settings</TabsTrigger>
          </TabsList>

          {/* Settings / Profile */}
          <TabsContent value="settings">
            <Card className="shadow-card max-w-2xl">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Official Profile Settings</CardTitle>
                <CardDescription>Update your working state jurisdiction to access relevant data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!user?.state && (
                   <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-start gap-3">
                     <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                     <p className="text-sm font-bold">You have not assigned your jurisdiction state. You will not be able to see any agents, applications, or revenue data until you set your state.</p>
                   </div>
                )}
                <div className="space-y-2">
                  <Label>Working State / Jurisdiction</Label>
                  <Select 
                    defaultValue={user?.state || ""} 
                    onValueChange={async (val) => {
                       try {
                         await api.put('/profile', { state: val });
                         toast({ title: '✅ Jurisdiction Updated!', description: 'Your state has been updated.' });
                         await refreshUser();
                         queryClient.invalidateQueries();
                       } catch(e: any) {
                         toast({ title: 'Error', description: 'Failed to update state.', variant: 'destructive' });
                       }
                    }}
                  >
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Central">Central (All India)</SelectItem>
                      {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">Setting this will automatically filter all dashboard statistics, active agents, and applications to your selected state.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue & Performance */}
          <TabsContent value="revenue">
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Platform Revenue", value: `₹${analytics?.totalRevenue?.toLocaleString() || "0"}`, icon: Activity, desc: "All sources combined" },
                    { label: "Platform Cut (Commissions)", value: `₹${analytics?.platformRevenue?.toLocaleString() || "0"}`, icon: Bookmark, desc: "₹74 per assisted app" },
                    { label: "Agent Earnings (Paid Out)", value: `₹${analytics?.agentRevenuePaid?.toLocaleString() || "0"}`, icon: UserCheck, desc: "₹175 per assisted app" },
                    { label: "Subscription Revenue", value: `₹${analytics?.subscriptionRevenue?.toLocaleString() || "0"}`, icon: BarChart3, desc: "From Agent plans" },
                  ].map((s) => (
                    <Card key={s.label} className="shadow-card border-accent/20">
                      <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                           <div className="bg-accent/10 p-2 rounded-lg"><s.icon className="h-5 w-5 text-accent" /></div>
                           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{s.label}</p>
                        </div>
                        <p className="text-3xl font-heading font-black text-foreground mt-2">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card className="shadow-card">
                      <CardHeader>
                         <CardTitle className="font-heading text-base flex justify-between items-center">
                            Revenue Trends (Last 6 Months)
                         </CardTitle>
                      </CardHeader>
                      <CardContent>
                         <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics?.revenueByMonth?.labels?.map((label: string, i: number) => ({ month: label, revenue: analytics.revenueByMonth.values[i] })) || []}>
                              <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                              <XAxis dataKey="month" fontSize={11} />
                              <YAxis fontSize={12} tickFormatter={(val) => `₹${val}`} />
                              <Tooltip formatter={(val) => [`₹${val}`, 'Revenue']} />
                              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>

                   <Card className="shadow-card">
                      <CardHeader>
                         <CardTitle className="font-heading text-base flex justify-between items-center">
                            Top Performing Agents
                            <Badge variant="outline" className="text-[10px] uppercase">By Lifetime Earnings</Badge>
                         </CardTitle>
                      </CardHeader>
                      <CardContent>
                         <div className="space-y-4">
                            {analytics?.topAgents?.length === 0 ? (
                               <p className="text-muted-foreground italic text-sm text-center py-8">No agent earnings yet.</p>
                            ) : (
                               analytics?.topAgents?.map((agent: any, i: number) => (
                                  <div key={agent.agentId} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/50">
                                     <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-xs">
                                           #{i + 1}
                                        </div>
                                        <div>
                                           <p className="font-bold text-sm text-foreground">{agent.name}</p>
                                           <p className="text-[10px] text-muted-foreground uppercase">ID: {agent.agentId.substring(0,6)}</p>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <p className="font-black text-accent">₹{agent.earnings.toLocaleString()}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">Earned</p>
                                     </div>
                                  </div>
                               ))
                            )}
                         </div>
                      </CardContent>
                   </Card>

                   <Card className="shadow-card">
                      <CardHeader>
                         <CardTitle className="font-heading text-base flex justify-between items-center">
                            Conversion Rate
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                         <div className="relative h-40 w-40 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                               <circle cx="80" cy="80" r="70" className="stroke-muted fill-none" strokeWidth="12" />
                               <circle 
                                  cx="80" cy="80" r="70" 
                                  className="stroke-accent fill-none transition-all duration-1000" 
                                  strokeWidth="12" 
                                  strokeDasharray="440" 
                                  strokeDashoffset={440 - (440 * (analytics?.conversionRate || 0))} 
                                  strokeLinecap="round" 
                               />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-3xl font-black text-foreground">{Math.round((analytics?.conversionRate || 0) * 100)}%</span>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assisted</span>
                            </div>
                         </div>
                         <div className="flex gap-8 mt-8">
                            <div className="text-center">
                               <p className="text-2xl font-black text-foreground">{analytics?.assistedApplications || 0}</p>
                               <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Premium Apps</p>
                            </div>
                            <div className="text-center">
                               <p className="text-2xl font-black text-foreground">{(analytics?.totalApplications || 0) - (analytics?.assistedApplications || 0)}</p>
                               <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Free Apps</p>
                            </div>
                         </div>
                      </CardContent>
                   </Card>
                </div>
             </div>
          </TabsContent>

          {/* Agent Management */}
          <TabsContent value="agents">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-heading">Verified Agents</CardTitle>
                  <CardDescription>Grant or revoke licenses for official scheme assistance agents.</CardDescription>
                </div>
                <Dialog open={agentDialog} onOpenChange={setAgentDialog}>
                  <DialogTrigger asChild>
                    <Button variant="accent" size="sm"><Plus className="h-4 w-4 mr-1" /> Add Verified Agent</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Verify New Agent</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Full Name</Label><Input value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className="mt-1" placeholder="e.g. Rajesh Kumar" /></div>
                      <div><Label>Location (State)</Label><Input value={newAgent.location} onChange={e => setNewAgent({...newAgent, location: e.target.value})} className="mt-1" placeholder="e.g. Uttar Pradesh" /></div>
                      <div><Label>Phone Number</Label><Input value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} className="mt-1" placeholder="e.g. 9876543210" /></div>
                      <div><Label>Expertise</Label><Input value={newAgent.expertise} onChange={e => setNewAgent({...newAgent, expertise: e.target.value})} className="mt-1" placeholder="e.g. Agriculture, Healthcare" /></div>
                      <Button onClick={handleCreateAgent} className="w-full mt-2">Issue Verification License</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
               <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground italic">No verified agents found.</div>
                  ) : (
                    agents.map((a: any) => (
                      <Card key={a.id} className="bg-background border-l-4 border-l-success group hover:border-l-accent transition-colors overflow-hidden">
                        <CardContent className="p-4">
                           <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-foreground truncate">{a.fullName}</p>
                                <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                                <p className="text-[10px] bg-secondary inline-block px-2 py-0.5 rounded mt-1 font-medium">{a.expertise || 'General'}</p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteAgent(a.id)} className="text-destructive h-8 w-8 ml-2 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                           <div className="mt-4 pt-3 border-t border-dashed flex justify-between items-center">
                              <div className="text-[10px] text-muted-foreground">
                                 ID: {a.id.slice(0,8)}
                              </div>
                              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
                                <Link to={`/government/agent/${a.id}`}>
                                  <FileText className="h-3.5 w-3.5" /> Full History
                                </Link>
                              </Button>
                           </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Approvals */}
          <TabsContent value="approvals">
            <Card className="shadow-card overflow-hidden">
               <CardHeader className="bg-accent/5">
                 <CardTitle className="font-heading text-lg">Pending Registrations</CardTitle>
                 <CardDescription>Review and authorize new Agent/Admin accounts.</CardDescription>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="divide-y">
                    {pendingAgents.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground italic">No pending requests at this time.</div>
                    ) : (
                      pendingAgents.map((u: any) => (
                        <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex gap-4 items-center">
                            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                              {u.fullName[0]}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{u.fullName}</p>
                              <p className="text-xs text-muted-foreground">{u.email} · {u.mobile || 'No Phone'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <Button size="sm" variant="success" onClick={() => handleResolveAgent(u.id, 'active')}>Accept</Button>
                             <Button size="sm" variant="destructive" onClick={() => handleResolveAgent(u.id, 'rejected')}>Decline</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Total Views", value: analytics?.totalViews?.toLocaleString() || "0", icon: Eye },
                { label: "Total Saves", value: analytics?.totalSaves?.toLocaleString() || "0", icon: Bookmark },
                { label: "Active Schemes", value: analytics?.totalSchemes || 0, icon: FileText },
                { label: "Applications", value: analytics?.totalApplications || 0, icon: BarChart3 },
              ].map((s) => (
                <Card key={s.label} className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-heading text-base">Scheme-wise Applications</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics?.schemeWiseApplications || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="applications" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-heading text-base">Status Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={analytics?.statusBreakdown || []} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {(analytics?.statusBreakdown || []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-heading text-base">State-wise Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={(analytics?.stateWiseDistribution || []).slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-heading text-base">Monthly Trends</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics?.monthlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="applications" stroke="hsl(var(--accent))" strokeWidth={2} />
                      <Line type="monotone" dataKey="views" stroke="hsl(200, 80%, 50%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <CardTitle className="font-heading">All Applications</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search..."
                    value={appFilters.search}
                    onChange={e => setAppFilters({...appFilters, search: e.target.value})}
                    className="w-48"
                  />
                  <Select value={appFilters.status} onValueChange={v => setAppFilters({...appFilters, status: v === "all" ? "" : v})}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="started">Started</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredApps.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No applications found</p>
                  ) : (
                    filteredApps.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p className="font-medium text-foreground">{app.schemeName}</p>
                          <p className="text-xs text-muted-foreground">{app.userName} · {app.userState || 'N/A'} · {new Date(app.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge className={statusColor(app.status)}>{app.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schemes */}
          <TabsContent value="schemes">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="font-heading">All Schemes</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schemes.map((s: any) => (
                    <div key={s.id} className="p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                           <p className="font-bold text-foreground">{s.name}</p>
                           {s.source === 'government' && <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20">Official</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{s.ministry}</p>
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {s.views?.toLocaleString()} views</span>
                          <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> {s.saves?.toLocaleString()} saves</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {s.deadline && <Badge variant="secondary" className="text-xs mr-2">Deadline: {s.deadline}</Badge>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-muted/50 h-8 w-8"
                          onClick={() => handleOpenEditScheme(s)}
                          title="Edit Scheme"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                          onClick={() => handleDeletePublishedScheme(s.id)}
                          title="Remove Scheme"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail */}
          <TabsContent value="audit-trail" className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="font-heading flex items-center gap-2 text-2xl">
                   <Shield className="h-6 w-6 text-accent" /> Security Audit Logs
                </CardTitle>
                <CardDescription className="mt-1">Immutable record of all sensitive citizen data access requests.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search logs..." 
                    className="pl-9 w-[250px] bg-background shadow-sm"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                  />
                </div>
                <Button onClick={fetchAuditLogs} disabled={loadingAudit} className="shadow-sm">
                  <RefreshCcw className={`h-4 w-4 mr-2 ${loadingAudit ? 'animate-spin' : ''}`} /> Sync Logs
                </Button>
              </div>
            </div>

            <Card className="shadow-md border border-border/50 overflow-hidden">
              <CardContent className="p-0">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/50">
                       <tr>
                         <th className="px-6 py-4 font-semibold">Event Type</th>
                         <th className="px-6 py-4 font-semibold">Actor</th>
                         <th className="px-6 py-4 font-semibold">Action Details</th>
                         <th className="px-6 py-4 font-semibold">Timestamp</th>
                         <th className="px-6 py-4 font-semibold">Target ID</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-border/50 bg-background/50">
                        {loadingAudit ? (
                          <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                            <Activity className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                            Fetching encrypted logs...
                          </td></tr>
                        ) : auditLogs.filter(l => (l.action+l.actorName+l.details+l.targetId).toLowerCase().includes(auditSearch.toLowerCase())).length === 0 ? (
                          <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center">
                              <Shield className="h-10 w-10 mb-3 opacity-20" />
                              <p>No security incidents found.</p>
                            </div>
                          </td></tr>
                        ) : (
                          auditLogs.filter(l => (l.action+l.actorName+l.details+l.targetId).toLowerCase().includes(auditSearch.toLowerCase())).map((log) => {
                            const logTime = log.timestamp || log.createdAt;
                            const formattedTime = logTime ? new Date(logTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now';
                            const isDanger = log.action.includes('delete') || log.action.includes('reject');
                            return (
                            <tr key={log.id} className="hover:bg-muted/30 transition-colors group">
                              <td className="px-6 py-4">
                                <Badge variant="outline" className={`text-[10px] font-mono capitalize tracking-wider ${isDanger ? 'border-destructive/30 text-destructive bg-destructive/5' : 'border-blue-500/30 text-blue-600 bg-blue-500/5 dark:text-blue-400'}`}>
                                  {isDanger && <AlertTriangle className="h-3 w-3 mr-1 inline-block" />}
                                  {log.action.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
                                    {log.actorName?.charAt(0) || 'U'}
                                  </div>
                                  <span className="font-medium text-foreground text-sm">{log.actorName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground text-sm max-w-xs truncate" title={log.details}>
                                 {log.details}
                              </td>
                              <td className="px-6 py-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <Clock className="h-3.5 w-3.5 text-accent" /> 
                                  {formattedTime}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-muted-foreground/70">
                                 <div className="bg-muted px-2 py-1 rounded-md inline-block border border-border/50">
                                   {log.targetId ? (log.targetId.length > 20 ? log.targetId.substring(0, 20) + '...' : log.targetId) : 'N/A'}
                                 </div>
                              </td>
                            </tr>
                          )})
                        )}
                     </tbody>
                   </table>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Publish Scheme */}
          <TabsContent value="publish">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Publish Form */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="shadow-card overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-accent to-blue-500" />
                  <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5 text-accent" /> {publishingScrapedId ? 'Review & Publish Discovered Scheme' : 'Publish New Scheme'}
                    </CardTitle>
                    <CardDescription>
                      Add a scheme to the platform. Citizens and agents will see it immediately. You can also click <strong>Publish</strong> on any discovery feed item to pre-fill this form.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scheme Name *</Label>
                      <Input placeholder="e.g. PM Kisan Samman Nidhi" value={publishForm.name} onChange={e => setPublishForm(p => ({...p, name: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ministry / Department *</Label>
                      <Input placeholder="e.g. Ministry of Agriculture" value={publishForm.ministry} onChange={e => setPublishForm(p => ({...p, ministry: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label>
                      <textarea
                        rows={3}
                        placeholder="What does this scheme do?"
                        value={publishForm.description}
                        onChange={e => setPublishForm(p => ({...p, description: e.target.value}))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Benefits *</Label>
                      <textarea
                        rows={2}
                        placeholder="Key benefits for beneficiaries"
                        value={publishForm.benefits}
                        onChange={e => setPublishForm(p => ({...p, benefits: e.target.value}))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Eligibility</Label>
                      <Input placeholder="e.g. Farmers with < 2 hectares land" value={publishForm.eligibility} onChange={e => setPublishForm(p => ({...p, eligibility: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Documents (comma-separated)</Label>
                      <Input placeholder="e.g. Aadhaar, Bank Passbook, Land Record" value={publishForm.documents} onChange={e => setPublishForm(p => ({...p, documents: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official Apply Link</Label>
                      <Input placeholder="https://..." value={publishForm.applyLink} onChange={e => setPublishForm(p => ({...p, applyLink: e.target.value}))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</Label>
                        <Input placeholder="Agriculture, Farmers" value={publishForm.tags} onChange={e => setPublishForm(p => ({...p, tags: e.target.value}))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deadline</Label>
                        <Input type="date" value={publishForm.deadline} onChange={e => setPublishForm(p => ({...p, deadline: e.target.value}))} />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      {publishingScrapedId && (
                        <Button
                          variant="outline"
                          className="w-1/3 h-11"
                          onClick={() => {
                            setPublishForm({ name: '', ministry: '', description: '', benefits: '', eligibility: '', documents: '', applyLink: '', tags: '', deadline: '' });
                            setPublishingScrapedId(null);
                            setActiveTab("scraper");
                          }}
                        >
                          Cancel Review
                        </Button>
                      )}
                      <Button
                        className={`${publishingScrapedId ? 'w-2/3' : 'w-full'} h-11 bg-accent hover:bg-accent/90 text-white font-bold`}
                        onClick={handlePublishScheme}
                        disabled={publishing}
                      >
                        {publishing ? 'Publishing...' : '🚀 Publish to Platform'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Published Schemes List */}
              <div className="lg:col-span-3">
                <Card className="shadow-card">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-heading text-xl">Government-Published Schemes</CardTitle>
                        <CardDescription>Schemes you've published. Visible to all citizens and agents.</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-accent border-accent/30">{publishedSchemes.length} Live</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {publishedSchemes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No schemes published yet</p>
                        <p className="text-xs mt-1 text-center max-w-xs">Fill the form or use the <strong>Scraper</strong> tab to discover &amp; publish schemes.</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {publishedSchemes.map((s: any) => (
                          <div key={s.id} className="p-5 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="text-[9px] bg-accent/10 text-accent border-accent/20 uppercase tracking-widest">Gov Verified</Badge>
                                {s.deadline && <Badge variant="outline" className="text-[9px]">Deadline: {s.deadline}</Badge>}
                              </div>
                              <h3 className="font-bold text-sm text-foreground truncate">{s.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{s.ministry}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                              {s.applyLink && s.applyLink !== '#' && (
                                <a href={s.applyLink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 block">
                                  View Official Link →
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:bg-muted/50 h-8 w-8 p-0"
                                onClick={() => handleOpenEditScheme(s)}
                                title="Edit Scheme"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                onClick={() => handleDeletePublishedScheme(s.id)}
                                title="Remove Scheme"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Scraper */}
          <TabsContent value="scraper">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card className="shadow-card overflow-hidden">
                  <div className="h-1.5 bg-accent" />
                  <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-accent" /> AI Discovery Agent
                    </CardTitle>
                    <CardDescription>
                      Discover schemes across all Indian central & state government portals using AI-powered browser navigation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Discovery Target (URL or Query)</Label>
                      <Input 
                        placeholder="URL or query, e.g. 'Tamil Nadu education schemes'" 
                        id="ai-scraper-url"
                        defaultValue="https://www.india.gov.in/my-government/schemes"
                      />
                    </div>
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12"
                      onClick={async () => {
                        const url = (document.getElementById('ai-scraper-url') as HTMLInputElement)?.value;
                        setScraping(true);
                        try {
                          toast({ title: "Agent Dispatched", description: "Browser Use Cloud session started..." });
                          const res = await api.post<any>('/scrape/managed', { url });
                          toast({ title: "Discovery Queued", description: "The AI agent is navigating the site in the background. You'll be notified when new schemes are found." });
                          // fetchScrapedSchemes() is removed because the socket listener in App.tsx will invalidate and fetch when done
                        } catch (err: any) {
                          // Try to extract details from the API error
                          const errorDescription = err.details || err.message || "Failed to reach portal";
                          toast({ 
                            title: "Agent Error", 
                            description: errorDescription, 
                            variant: "destructive" 
                          });
                        } finally {
                          setScraping(false);
                        }
                      }}
                      disabled={scraping}
                    >
                      {scraping ? "Agent Active..." : "Run AI Discovery"}
                    </Button>
                    <div className="p-3 bg-muted rounded-lg flex items-start gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Discovery requests are logged in the <strong>Audit Trail</strong> for security compliance.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Legacy Sync</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full h-10 text-xs" onClick={fetchScrapedSchemes} disabled={scraping}>
                      Run Standard Fetch
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="shadow-card min-h-[500px]">
                  <CardHeader className="border-b">
                    <CardTitle className="font-heading text-xl">Discovery Feed</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!scraped ? (
                      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                        <Search className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-xs">No active discovery data</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        <div className="p-6 bg-muted/10">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-accent mb-4">Trending Insights</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {scraped.trending.map((s: any) => (
                              <div key={s.id} className="p-3 rounded-lg border bg-background flex justify-between items-center group">
                                <div className="flex-1 min-w-0">
                                   <span className="font-bold text-sm truncate block">{s.name}</span>
                                   <Badge variant="secondary" className="text-[9px] mt-1">{s.views} HITS</Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={async () => {
                                    if (confirm(`Remove trending item "${s.name}"?`)) {
                                      try {
                                        await api.delete(`/government/schemes/${s.id}`);
                                        toast({ title: "Removed" });
                                        fetchScrapedSchemes();
                                      } catch { toast({ title: "Error", variant: "destructive" }); }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Latest Discoveries</h3>
                          <div className="space-y-4">
                            {scraped.latest.map((s: any) => (
                              <div key={s.id} className="p-4 rounded-xl border bg-background hover:border-accent/30 transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest mb-1">{s.category || 'General'}</Badge>
                                    <h3 className="font-bold text-base text-foreground">{s.name}</h3>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-accent border-accent/30 hover:bg-accent hover:text-white text-xs h-8"
                                      onClick={() => handlePublishFromScrape(s)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Review & Publish
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                      onClick={async () => {
                                        if (confirm(`Remove "${s.name}" from discovery feed?`)) {
                                          try {
                                            await api.delete(`/government/schemes/${s.id}`);
                                            toast({ title: "Removed from Feed" });
                                            fetchScrapedSchemes();
                                          } catch {
                                            toast({ title: "Failed to remove", variant: "destructive" });
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4 mb-3">{s.description}</p>
                                <div className="flex gap-4 text-[11px] text-muted-foreground border-t pt-3 items-center">
                                  <span><span className="font-bold">Eligibility:</span> {s.eligibility}</span>
                                  {s.officialLink && (
                                    <a href={s.officialLink} target="_blank" rel="noreferrer" className="text-accent hover:underline font-bold flex items-center">
                                      Official Link ↗
                                    </a>
                                  )}
                                  <span className="ml-auto">{new Date(s.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Scheme Dialog */}
      <Dialog open={editSchemeDialog} onOpenChange={setEditSchemeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Edit Published Scheme</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scheme Name *</Label>
              <Input placeholder="e.g. PM Kisan Samman Nidhi" value={editSchemeForm.name} onChange={e => setEditSchemeForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ministry / Department *</Label>
              <Input placeholder="e.g. Ministry of Agriculture" value={editSchemeForm.ministry} onChange={e => setEditSchemeForm(p => ({...p, ministry: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label>
              <textarea
                rows={3}
                placeholder="What does this scheme do?"
                value={editSchemeForm.description}
                onChange={e => setEditSchemeForm(p => ({...p, description: e.target.value}))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Benefits *</Label>
              <textarea
                rows={2}
                placeholder="Key benefits for beneficiaries"
                value={editSchemeForm.benefits}
                onChange={e => setEditSchemeForm(p => ({...p, benefits: e.target.value}))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Eligibility</Label>
              <Input placeholder="e.g. Farmers with < 2 hectares land" value={editSchemeForm.eligibility} onChange={e => setEditSchemeForm(p => ({...p, eligibility: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required Documents (comma-separated)</Label>
              <Input placeholder="e.g. Aadhaar, Bank Passbook, Land Record" value={editSchemeForm.documents} onChange={e => setEditSchemeForm(p => ({...p, documents: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official Apply Link</Label>
              <Input placeholder="https://..." value={editSchemeForm.applyLink} onChange={e => setEditSchemeForm(p => ({...p, applyLink: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</Label>
                <Input placeholder="Agriculture, Farmers" value={editSchemeForm.tags} onChange={e => setEditSchemeForm(p => ({...p, tags: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deadline</Label>
                <Input type="date" value={editSchemeForm.deadline} onChange={e => setEditSchemeForm(p => ({...p, deadline: e.target.value}))} />
              </div>
            </div>
            <Button
              className="w-full h-11 bg-accent hover:bg-accent/90 text-white font-bold mt-2"
              onClick={handleUpdateScheme}
              disabled={updatingScheme}
            >
              {updatingScheme ? 'Updating...' : '💾 Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GovernmentDashboard;
