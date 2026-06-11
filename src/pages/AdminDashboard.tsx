import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, Users, FileText, BarChart3, Search, LogOut, Megaphone, Plus, Trash2, CheckCircle, XCircle, MessageSquare, Phone, Calendar, ClipboardCheck, CreditCard, LifeBuoy, Bell, Inbox, AlertCircle, User, Sparkles, Loader2, Activity, Bookmark, UserCheck, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useSchemes } from "@/hooks/useSchemes";
import { 
  useAdminStats, 
  useAdminApplications, 
  useAdminUpdateAppStatus, 
  useAdminCreateScheme, 
  useAdminDeleteScheme, 
  useAdminBroadcast,
  useAIAgents,
  useCreateAIAgent,
  useSyncLeanix
} from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [schemeDialog, setSchemeDialog] = useState(false);
  const [broadcastDialog, setBroadcastDialog] = useState(false);
  const [newScheme, setNewScheme] = useState({ name: "", ministry: "", description: "", benefits: "", applyLink: "", tags: "" });
  const [newAIAgent, setNewAIAgent] = useState({ name: "", description: "" });
  const [broadcast, setBroadcast] = useState({ title: "", message: "" });
  const [scraped, setScraped] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [agentDialog, setAgentDialog] = useState(false);

  // App Action Modals
  const [actionAppId, setActionAppId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const { data: stats } = useAdminStats();
  const { data: schemes = [] } = useSchemes();
  const { data: applications = [] } = useAdminApplications();
  const { data: aiAgents = [] } = useAIAgents();
  const updateAppStatus = useAdminUpdateAppStatus();
  const createScheme = useAdminCreateScheme();
  const deleteScheme = useAdminDeleteScheme();
  const broadcastNotif = useAdminBroadcast();
  const createAIAgent = useCreateAIAgent();
  const syncLeanix = useSyncLeanix();

  const handleCreateAIAgent = () => {
    createAIAgent.mutate(newAIAgent, {
      onSuccess: () => {
        toast({ title: "AI Agent Registered & Auto-Synced to LeanIX!" });
        setAgentDialog(false);
        setNewAIAgent({ name: "", description: "" });
      }
    });
  };

  const handleSyncLeanix = () => {
    syncLeanix.mutate(undefined, {
      onSuccess: (res: any) => {
        toast({ title: "LeanIX Sync Complete", description: "Successfully synchronized all AI Agents with SAP LeanIX API." });
      }
    });
  };

  const assistedApps = applications.filter((app: any) => app.status === 'submitted');

  const handleLogout = () => { logout(); navigate("/"); };

  const handleActionSubmit = () => {
    if (!actionAppId || !actionType) return;
    updateAppStatus.mutate({ id: actionAppId, status: actionType === 'approve' ? 'approved' : 'rejected' }, {
      onSuccess: () => {
        toast({ 
          title: actionType === 'approve' ? "Application Approved" : "Application Rejected", 
          description: `Citizen has been notified. Notes: ${actionNotes || 'None'}` 
        });
        setActionAppId(null);
        setActionType(null);
        setActionNotes("");
      }
    });
  };

  const handleCreateScheme = () => {
    createScheme.mutate({
      name: newScheme.name,
      ministry: newScheme.ministry,
      description: newScheme.description,
      benefits: newScheme.benefits,
      applyLink: newScheme.applyLink || "#",
      tags: newScheme.tags.split(",").map(t => t.trim()).filter(Boolean),
      eligibility: {},
      documents: [],
    }, {
      onSuccess: () => {
        toast({ title: "Scheme created!" });
        setSchemeDialog(false);
        setNewScheme({ name: "", ministry: "", description: "", benefits: "", applyLink: "", tags: "" });
      },
    });
  };

  const handleBroadcast = () => {
    broadcastNotif.mutate(broadcast, {
      onSuccess: () => {
        toast({ title: "Notification sent to all citizens!" });
        setBroadcastDialog(false);
        setBroadcast({ title: "", message: "" });
      },
    });
  };

  const fetchScrapedSchemes = async () => {
    setScraping(true);
    try {
      await api.post('/admin/scrape/trigger', {});
      const data = await api.get<any>('/admin/scraped-data');
      setScraped(data);
      toast({ title: "Portal Scraped & Updated!", description: `Found ${data.latest?.length || 0} schemes.` });
    } catch (error) {
      toast({ title: "Scraper partially failed", description: "Falling back to cached data.", variant: "destructive" });
      const data = await api.get<any>('/admin/scraped-data');
      setScraped(data);
    } finally {
      setScraping(false);
    }
  };

  const fetchHelpRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await api.get<any[]>("/agents/all-requests");
      setHelpRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const data = await api.get<{ notifications: any[]; unreadCount: number }>("/auth/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/auth/notifications/${id}/read`);
      toast({ title: "Notification marked as read" });
      fetchNotifications();
    } catch (e) {
      toast({ title: "Operation failed", variant: "destructive" });
    }
  };

  // Initial loads
  useEffect(() => {
    fetchHelpRequests();
    fetchNotifications();
  }, []);

  const statusColor = (status: string) => {
    if (status === "approved") return "bg-success/10 text-success";
    if (status === "rejected") return "bg-destructive/10 text-destructive";
    if (status === "submitted") return "bg-info/10 text-info";
    if (status === "started") return "bg-yellow-500/10 text-yellow-600";
    return "bg-muted text-muted-foreground";
  };

  const appStatusData = stats ? [
    { name: "Saved", count: stats.applicationsByStatus?.saved || 0 },
    { name: "Started", count: stats.applicationsByStatus?.started || 0 },
    { name: "Submitted", count: stats.applicationsByStatus?.submitted || 0 },
    { name: "Approved", count: stats.applicationsByStatus?.approved || 0 },
    { name: "Rejected", count: stats.applicationsByStatus?.rejected || 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-white/10 bg-slate-900/80 flex items-center h-20 px-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-accent" />
              <span className="font-heading font-black text-xl tracking-tight uppercase">Admin Panel</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex border-accent/30 text-accent hover:bg-accent/10 font-black tracking-widest uppercase text-[10px] h-10 px-4 rounded-full"
                onClick={() => navigate('/agent')}
              >
                <Shield className="h-4 w-4 mr-2" /> Operations View
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-4 hover:bg-white/5 p-2 rounded-2xl transition-all border border-transparent hover:border-white/10 cursor-pointer">
                  <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black uppercase text-accent leading-tight tracking-[0.2em]">{user?.role}</p>
                      <p className="text-sm font-black text-white">{user?.fullName}</p>
                  </div>
                  <Avatar className="h-10 w-10 border-2 border-accent/50">
                      <AvatarImage src={user?.avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-slate-800 text-[12px] font-black text-white">{user?.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10 text-white p-2">
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer py-3 rounded-xl" onClick={() => navigate('/profile')}>
                  <User className="mr-3 h-4 w-4 text-accent" />
                  <span className="font-bold">Edit Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer py-3 rounded-xl" onClick={handleLogout}>
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-bold">Terminate Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <h1 className="font-heading font-bold text-2xl text-foreground mb-6">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Schemes", value: stats?.totalSchemes || 0, icon: FileText, color: "text-accent" },
            { label: "Applications", value: stats?.totalApplications || 0, icon: BarChart3, color: "text-success" },
            { label: "Help Requests", value: helpRequests.length, icon: MessageSquare, color: "text-white" },
          ].map((s) => (
            <Card key={s.label} className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${s.color}`}>
                  <s.icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-3xl font-black text-white tracking-tight">{s.value}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border flex-wrap h-auto p-1">
            <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="revenue"><Activity className="h-4 w-4 mr-1" /> Revenue</TabsTrigger>
            <TabsTrigger value="service-hub" className="relative">
              <ClipboardCheck className="h-4 w-4 mr-1 text-accent" /> 
              Service Hub
              {assistedApps.filter(a => a.paymentStatus === 'paid').length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="assistance" className="relative">
              <LifeBuoy className="h-4 w-4 mr-1" /> Help Centre
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse border-2 border-card" />
              )}
            </TabsTrigger>
            <TabsTrigger value="schemes"><FileText className="h-4 w-4 mr-1" /> Schemes</TabsTrigger>
            <TabsTrigger value="applications"><FileText className="h-4 w-4 mr-1" /> All Apps</TabsTrigger>
            <TabsTrigger value="notifications"><Megaphone className="h-4 w-4 mr-1" /> Notify</TabsTrigger>
            <TabsTrigger value="scraper"><Search className="h-4 w-4 mr-1" /> Scraper</TabsTrigger>
            <TabsTrigger value="ai-registry"><Shield className="h-4 w-4 mr-1 text-accent" /> AI Registry</TabsTrigger>
          </TabsList>

          {/* Revenue & Performance */}
          <TabsContent value="revenue">
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Platform Revenue", value: `₹${stats?.totalRevenue?.toLocaleString() || "0"}`, icon: Activity, desc: "All sources combined" },
                    { label: "Platform Cut (Commissions)", value: `₹${stats?.platformRevenue?.toLocaleString() || "0"}`, icon: Bookmark, desc: "₹74 per assisted app" },
                    { label: "Agent Earnings (Paid Out)", value: `₹${stats?.agentRevenuePaid?.toLocaleString() || "0"}`, icon: UserCheck, desc: "₹175 per assisted app" },
                    { label: "Subscription Revenue", value: `₹${stats?.subscriptionRevenue?.toLocaleString() || "0"}`, icon: BarChart3, desc: "From Agent plans" },
                  ].map((s) => (
                    <Card key={s.label} className="bg-slate-900/50 shadow-xl border-white/10 backdrop-blur-sm">
                      <CardContent className="p-5 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                           <div className="bg-white/5 p-2 rounded-lg"><s.icon className="h-5 w-5 text-accent" /></div>
                           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{s.label}</p>
                        </div>
                        <p className="text-3xl font-heading font-black text-white mt-2">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card className="bg-slate-900/50 shadow-xl border-white/10 backdrop-blur-sm">
                      <CardHeader>
                         <CardTitle className="font-heading text-base flex justify-between items-center text-white">
                            Revenue Trends (Last 6 Months)
                         </CardTitle>
                      </CardHeader>
                      <CardContent>
                         <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={stats?.revenueByMonth?.labels?.map((label: string, i: number) => ({ month: label, revenue: stats.revenueByMonth.values[i] })) || []}>
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

                   <Card className="bg-slate-900/50 shadow-xl border-white/10 backdrop-blur-sm">
                      <CardHeader>
                         <CardTitle className="font-heading text-base flex justify-between items-center text-white">
                            Top Performing Agents
                            <Badge variant="outline" className="text-[10px] uppercase text-accent border-accent/30">By Lifetime Earnings</Badge>
                         </CardTitle>
                      </CardHeader>
                      <CardContent>
                         <div className="space-y-4">
                            {stats?.topAgents?.length === 0 ? (
                               <p className="text-muted-foreground italic text-sm text-center py-8">No agent earnings yet.</p>
                            ) : (
                               stats?.topAgents?.map((agent: any, i: number) => (
                                  <div key={agent.agentId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                     <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-xs">
                                           #{i + 1}
                                        </div>
                                        <div>
                                           <p className="font-bold text-sm text-white">{agent.name}</p>
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

                   <Card className="bg-slate-900/50 shadow-xl border-white/10 backdrop-blur-sm">
                      <CardHeader>
                         <CardTitle className="font-heading text-base flex justify-between items-center text-white">
                            Conversion Rate
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                         <div className="relative h-40 w-40 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                               <circle cx="80" cy="80" r="70" className="stroke-white/10 fill-none" strokeWidth="12" />
                               <circle 
                                  cx="80" cy="80" r="70" 
                                  className="stroke-accent fill-none transition-all duration-1000" 
                                  strokeWidth="12" 
                                  strokeDasharray="440" 
                                  strokeDashoffset={440 - (440 * (stats?.conversionRate || 0))} 
                                  strokeLinecap="round" 
                               />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-3xl font-black text-white">{Math.round((stats?.conversionRate || 0) * 100)}%</span>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assisted</span>
                            </div>
                         </div>
                         <div className="flex gap-8 mt-8">
                            <div className="text-center">
                               <p className="text-2xl font-black text-white">{stats?.assistedApplications || 0}</p>
                               <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Premium Apps</p>
                            </div>
                            <div className="text-center">
                               <p className="text-2xl font-black text-white">{(stats?.totalApplications || 0) - (stats?.assistedApplications || 0)}</p>
                               <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Free Apps</p>
                            </div>
                         </div>
                      </CardContent>
                   </Card>
                </div>
             </div>
          </TabsContent>

          {/* Service Hub (Pay & Assign Workpool) */}
          <TabsContent value="service-hub">
            <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-2xl font-black text-white uppercase tracking-tight">Active Operation Hub</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Monitoring all pending submissions. Paid requests are prioritized for immediate agent attention.</CardDescription>
                  </div>
                  <Badge variant="accent" className="px-3 py-1">Active Orders: {assistedApps.filter(a => a.paymentStatus === 'paid').length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assistedApps.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                      <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                      <p className="text-muted-foreground italic">No professional service requests yet.</p>
                    </div>
                  ) : (
                    assistedApps.map((app: any) => (
                      <Card key={app.id} className={`bg-slate-900/40 border-l-4 ${app.paymentStatus === 'paid' ? 'border-l-accent bg-accent/5' : 'border-l-slate-700 bg-white/5'} overflow-hidden shadow-xl border-y border-r border-white/5`}>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-black text-xl text-white tracking-tight leading-none">{app.schemeName}</h3>
                                {app.paymentStatus === 'paid' ? (
                                  <Badge className="bg-accent text-white font-black px-3 py-1 text-[10px] uppercase tracking-widest animate-pulse">
                                    <CreditCard className="h-3 w-3 mr-1" /> PAID ORDER
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-slate-800 text-slate-400 font-black px-3 py-1 text-[10px] uppercase tracking-widest border border-white/5">
                                    STANDARD FREE
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10 mt-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Citizen Name</p>
                                  <p className="text-sm font-bold text-white truncate" title={app.formData?.fullName || app.userName || 'Guest'}>{app.formData?.fullName || app.userName || 'Guest'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mobile</p>
                                  <p className="text-sm font-bold text-white">{app.formData?.mobile || app.userPhone || app.userEmail || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Aadhaar / ID</p>
                                  <p className="text-sm font-mono font-bold text-white">{app.formData?.aadhaar ? 'XXXX-XXXX-' + app.formData.aadhaar.slice(-4) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Date Logged</p>
                                  <p className="text-sm font-bold text-white">{new Date(app.createdAt).toLocaleDateString()}</p>
                                </div>
                                
                                <div className="col-span-2 md:col-span-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">State & Address</p>
                                  <p className="text-sm font-bold text-white truncate" title={app.formData?.address}>
                                    {app.formData?.state ? `${app.formData.state} - ` : ''}{app.formData?.address || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Reference</p>
                                  <p className="text-sm font-mono font-bold text-accent">{app.id.split('-')[0].toUpperCase()}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-start md:self-center">
                              <Badge className={`${statusColor(app.status)} px-4 py-1.5 font-black text-[10px] uppercase tracking-widest rounded-lg`}>{app.status.toUpperCase()}</Badge>
                              {app.status === 'submitted' && (
                                <div className="flex gap-2 ml-4 border-l border-white/10 pl-6">
                                  <Button 
                                    size="sm" 
                                    className="bg-success hover:bg-success/90 text-white font-black px-6 rounded-xl h-12 shadow-lg shadow-success/20 transition-all active:scale-95"
                                    onClick={() => { setActionAppId(app.id); setActionType('approve'); setActionNotes(''); }}
                                  >
                                    Verify & Approve
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-black px-6 rounded-xl h-12 transition-all active:scale-95"
                                    onClick={() => { setActionAppId(app.id); setActionType('reject'); setActionNotes(''); }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Dialog */}
            <Dialog open={!!actionAppId} onOpenChange={(open) => { if (!open) setActionAppId(null); }}>
              <DialogContent className="bg-slate-900 border-white/10 text-white shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    {actionType === 'approve' ? <CheckCircle className="text-success h-6 w-6" /> : <XCircle className="text-red-500 h-6 w-6" />}
                    {actionType === 'approve' ? "Verify & Approve Application" : "Reject Application"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-xl border border-white/5 bg-black/40">
                    <p className="text-sm text-slate-400 font-medium">
                      {actionType === 'approve' 
                        ? "You are about to approve this application. The citizen will be notified immediately that their service has been fulfilled." 
                        : "You are rejecting this application. Please provide a clear reason so the citizen knows how to correct their submission."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-500 tracking-widest">
                      {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                    </Label>
                    <Textarea 
                      value={actionNotes} 
                      onChange={e => setActionNotes(e.target.value)} 
                      placeholder={actionType === 'approve' ? "e.g., All documents verified successfully." : "e.g., Aadhaar card scan is blurry. Please re-upload."}
                      className="bg-slate-800 border-white/10 text-white resize-none h-24"
                    />
                  </div>
                  <Button 
                    onClick={handleActionSubmit} 
                    disabled={actionType === 'reject' && actionNotes.trim().length === 0}
                    className={`w-full font-black h-12 text-md transition-all ${
                      actionType === 'approve' 
                        ? 'bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20' 
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                    }`}
                  >
                    {actionType === 'approve' ? "Confirm Approval" : "Confirm Rejection"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </TabsContent>

          {/* Citizen Help Centre */}
          <TabsContent value="assistance">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-heading">Citizen Help Requests</CardTitle>
                    <CardDescription>General callback requests from citizens seeking 1-on-1 assistance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loadingRequests ? (
                        <div className="text-center py-8 text-muted-foreground italic">Loading requests...</div>
                      ) : helpRequests.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                          <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                          <p className="text-muted-foreground italic">No help requests from citizens yet.</p>
                        </div>
                      ) : (
                        helpRequests.map((req) => (
                          <Card key={req.id} className="border-l-4 border-l-accent overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{req.userName}</span>
                                    <Badge variant="secondary" className="text-[10px] uppercase">{req.id.split('-')[0]}</Badge>
                                  </div>
                                  <p className="text-sm text-foreground bg-muted/30 p-2 rounded italic">"{req.message}"</p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {req.userPhone}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(`tel:${req.userPhone}`)}>
                                  <Phone className="h-4 w-4 mr-2" /> Call Citizen
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="font-heading text-lg">Lead Alerts</CardTitle>
                      <CardDescription>Real-time notifications</CardDescription>
                    </div>
                    {unreadCount > 0 && <Badge variant="accent" className="animate-pulse">{unreadCount} New</Badge>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {loadingNotifs ? (
                        <p className="text-center py-4 text-xs text-muted-foreground italic">Loading alerts...</p>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-8 opacity-40">
                          <Inbox className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-xs">No active alerts</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-3 rounded-xl border text-sm transition-all ${n.read ? 'bg-muted/10 opacity-60' : 'bg-accent/5 border-accent/20 shadow-sm'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.read ? 'bg-muted' : 'bg-accent'}`} />
                              <div className="space-y-1">
                                <p className="font-bold text-foreground leading-tight">{n.title}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground/60">{new Date(n.createdAt).toLocaleTimeString()}</p>
                                {!n.read && (
                                  <button 
                                    onClick={() => markAsRead(n.id)}
                                    className="text-[10px] text-accent font-bold hover:underline pt-1 block"
                                  >
                                    Acknowledge Lead
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="font-heading text-base">Applications by Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={appStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
                <CardHeader><CardTitle className="font-heading text-base">Monthly Trends</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={stats?.monthlyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" stroke="hsl(var(--accent))" strokeWidth={2} />
                      <Line type="monotone" dataKey="applications" stroke="hsl(var(--info))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/50 border-white/10 shadow-xl overflow-hidden mt-8">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" /> MOST VIEWED SCHEMES
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {(stats?.mostViewedSchemes || []).map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded-xl transition-colors group">
                    <span className="font-black text-2xl text-slate-800 group-hover:text-accent transition-colors w-10 text-center italic">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">{s.name}</p>
                      <div className="h-2 bg-white/5 rounded-full mt-2 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" 
                          style={{ width: `${Math.min(100, (s.views / (stats?.maxViews || 100)) * 100)}%` }} 
                        />
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black text-white">{s.views}</p>
                       <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Analytics</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schemes */}
          <TabsContent value="schemes">
            <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading">Manage Schemes</CardTitle>
                <Dialog open={schemeDialog} onOpenChange={setSchemeDialog}>
                  <DialogTrigger asChild>
                    <Button variant="accent" size="sm"><Plus className="h-4 w-4 mr-1" /> Add Scheme</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add New Scheme</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Name</Label><Input value={newScheme.name} onChange={e => setNewScheme({...newScheme, name: e.target.value})} className="mt-1" /></div>
                      <div><Label>Ministry</Label><Input value={newScheme.ministry} onChange={e => setNewScheme({...newScheme, ministry: e.target.value})} className="mt-1" /></div>
                      <div><Label>Description</Label><Textarea value={newScheme.description} onChange={e => setNewScheme({...newScheme, description: e.target.value})} className="mt-1" /></div>
                      <div><Label>Benefits</Label><Input value={newScheme.benefits} onChange={e => setNewScheme({...newScheme, benefits: e.target.value})} className="mt-1" /></div>
                      <div><Label>Apply Link</Label><Input value={newScheme.applyLink} onChange={e => setNewScheme({...newScheme, applyLink: e.target.value})} className="mt-1" /></div>
                      <div><Label>Tags (comma-separated)</Label><Input value={newScheme.tags} onChange={e => setNewScheme({...newScheme, tags: e.target.value})} className="mt-1" /></div>
                      <Button variant="accent" onClick={handleCreateScheme} disabled={createScheme.isPending} className="w-full">
                        {createScheme.isPending ? "Creating..." : "Create Scheme"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {schemes.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.ministry} · {s.views?.toLocaleString()} views</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                          if (confirm(`Delete ${s.name}?`)) {
                            deleteScheme.mutate(s.id, {
                              onSuccess: () => toast({ title: "Scheme deleted" }),
                            });
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Applications */}
          <TabsContent value="applications">
            <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
              <CardHeader><CardTitle className="font-heading">All System Applications</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {applications.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No applications yet</p>
                  ) : (
                    applications.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div>
                          <p className="font-medium text-foreground">{app.schemeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {app.userName !== 'Unknown' ? app.userName : (app.formData?.fullName || 'Guest')} · {app.userEmail || app.formData?.mobile || 'No Contact'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColor(app.status)}>{app.status.toUpperCase()}</Badge>
                          {(app.status === "submitted" || app.status === "in_review") && (
                            <div className="flex gap-2 ml-4 border-l pl-4">
                              <Button
                                size="sm" className="bg-success hover:bg-green-600 text-white font-bold"
                                onClick={() => updateAppStatus.mutate({ id: app.id, status: "approved" }, {
                                  onSuccess: () => toast({ title: "Application approved!" }),
                                })}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm" variant="destructive" className="font-bold"
                                onClick={() => updateAppStatus.mutate({ id: app.id, status: "rejected" }, {
                                  onSuccess: () => toast({ title: "Application rejected" }),
                                })}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading">Broadcast Notification</CardTitle>
                <Dialog open={broadcastDialog} onOpenChange={setBroadcastDialog}>
                  <DialogTrigger asChild>
                    <Button variant="accent" size="sm"><Megaphone className="h-4 w-4 mr-1" /> Send Broadcast</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Send Notification to All Citizens</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Title</Label><Input value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})} className="mt-1" /></div>
                      <div><Label>Message</Label><Textarea value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})} className="mt-1" /></div>
                      <Button variant="accent" onClick={handleBroadcast} disabled={broadcastNotif.isPending} className="w-full">
                        {broadcastNotif.isPending ? "Sending..." : "Send to All Citizens"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Use the "Send Broadcast" button to notify all citizens about new schemes, updates, or important announcements.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discovery AI */}
          <TabsContent value="discovery">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <Card className="bg-slate-900 border-white/10 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
                  <CardHeader>
                    <CardTitle className="font-heading text-lg font-black tracking-tight uppercase flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" /> AI AGENT DISCOVERY
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Dispatch autonomous agents to discover new welfare schemes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Target Portal URL</Label>
                      <Input 
                        id="ai-scraper-url" 
                        placeholder="https://www.india.gov.in/my-government/schemes" 
                        defaultValue="https://www.india.gov.in/my-government/schemes"
                        className="bg-black/40 border-white/10 text-white font-medium"
                      />
                    </div>
                    
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 text-white font-black shadow-lg shadow-accent/20 rounded-xl h-12 flex items-center gap-2 transition-all hover:scale-[1.02]"
                      onClick={async () => {
                        const url = (document.getElementById('ai-scraper-url') as HTMLInputElement)?.value;
                        setScraping(true);
                        try {
                          toast({ title: "Agent Dispatched", description: "Browser Use Cloud is initializing session..." });
                          const res = await api.post<any>('/scrape/managed', { url });
                          toast({ title: "Agent Queued!", description: "The agent is scanning in the background. Results will appear automatically." });
                        } catch (err: any) {
                          toast({ title: "Agent Error", description: err.message || "Failed to reach portal", variant: "destructive" });
                        } finally {
                          setScraping(false);
                        }
                      }}
                      disabled={scraping}
                    >
                      {scraping ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          AGENT BUSY...
                        </>
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          DISPATCH AI AGENT
                        </>
                      )}
                    </Button>
                    
                    <div className="p-4 bg-accent/5 rounded-2xl border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-accent" />
                        <span className="text-[10px] font-black uppercase text-accent tracking-widest">Active System</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        This agent uses <span className="text-white font-bold">Browser Use Cloud</span> to bypass bot detection and handle Javascript-heavy government portals.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm overflow-hidden">
                  <CardHeader>
                    <CardTitle className="font-heading text-lg font-black tracking-tight uppercase flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-slate-400" /> LEGACY SCRAPER
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Standard Cheerio-based fetch. Use for static HTML sites.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline"
                      className="w-full border-white/10 hover:bg-white/5 text-slate-400 font-black rounded-xl h-12"
                      onClick={fetchScrapedSchemes} 
                      disabled={scraping}
                    >
                      <Plus className="h-4 w-4 mr-2" /> RUN LEGACY FETCH
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="bg-slate-900/50 border-white/10 shadow-xl backdrop-blur-sm min-h-[600px]">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle className="font-heading text-xl font-black tracking-tight uppercase">Extracted Portal Data</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!scraped ? (
                      <div className="flex flex-col items-center justify-center py-32 text-slate-600">
                        <Inbox className="h-16 w-16 mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-xs">No active data pool</p>
                        <p className="text-sm mt-2 font-medium">Dispatch an agent to populate this view</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        <div className="p-6">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-6 flex items-center gap-2">
                            <BarChart3 className="h-3 w-3" /> Trending Insights
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {scraped.trending.map((s: any) => (
                              <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center group hover:bg-accent/5 hover:border-accent/20 transition-all cursor-default">
                                <span className="font-bold text-sm text-slate-300 group-hover:text-white truncate pr-4">{s.name}</span>
                                <Badge className="bg-slate-800 text-slate-400 font-black px-2 py-0.5 text-[9px] border border-white/10 shrink-0">
                                  {s.views} HITS
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                            <ClipboardCheck className="h-3 w-3" /> Recent Discovery Feed
                          </h3>
                          <div className="space-y-4">
                            {scraped.latest.map((s: any) => (
                              <div key={s.id} className="group p-6 rounded-3xl bg-slate-800/40 border border-white/5 hover:border-accent/30 transition-all shadow-lg hover:shadow-accent/5">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                  <div className="flex-1">
                                    <Badge className="bg-accent/10 text-accent font-black px-2 py-0.5 text-[9px] uppercase tracking-widest mb-3 border border-accent/20">
                                      {s.category || 'Welfare'}
                                    </Badge>
                                    <h3 className="font-black text-lg text-white leading-tight group-hover:text-accent transition-colors">{s.name}</h3>
                                  </div>
                                  <a
                                    href={s.officialLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:bg-accent hover:text-white transition-all shadow-xl"
                                  >
                                    <Plus className="h-5 w-5" />
                                  </a>
                                </div>
                                <p className="text-sm text-slate-400 line-clamp-2 mb-4 font-medium leading-relaxed">{s.description}</p>
                                <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Eligibility</p>
                                    <p className="text-xs font-bold text-slate-300 line-clamp-1">{s.eligibility}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Discovered On</p>
                                    <p className="text-xs font-bold text-slate-300">{new Date(s.createdAt).toLocaleDateString()}</p>
                                  </div>
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
          {/* AI Agent Registry Tab */}
          <TabsContent value="ai-registry">
            <Card className="bg-slate-900 border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
              <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-white flex items-center gap-2">
                    <Shield className="h-6 w-6 text-accent" /> Enterprise AI Agent Registry
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-2">
                    Manage your internal AI agents and synchronize them with SAP LeanIX as discoverable enterprise services.
                  </CardDescription>
                </div>
                <div className="flex gap-4">
                  <Dialog open={agentDialog} onOpenChange={setAgentDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold">
                        <Plus className="mr-2 h-4 w-4" /> New AI Agent
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 text-white border-white/10">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-black">Register AI Agent</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Agent Name</Label>
                          <Input value={newAIAgent.name} onChange={e => setNewAIAgent({...newAIAgent, name: e.target.value})} className="bg-slate-800 border-white/10" placeholder="e.g. Fraud Detection Agent" />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={newAIAgent.description} onChange={e => setNewAIAgent({...newAIAgent, description: e.target.value})} className="bg-slate-800 border-white/10" placeholder="What does this agent do?" />
                        </div>
                        <Button className="w-full bg-accent hover:bg-accent/90 text-white font-bold" onClick={handleCreateAIAgent} disabled={!newAIAgent.name || !newAIAgent.description || createAIAgent.isPending}>
                          {createAIAgent.isPending ? "Registering..." : "Create & Sync to LeanIX"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button className="bg-accent hover:bg-accent/90 text-white font-bold shadow-lg shadow-accent/20" onClick={handleSyncLeanix} disabled={syncLeanix.isPending}>
                    {syncLeanix.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                    Sync to LeanIX
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 relative z-10">
                <div className="space-y-4">
                  {aiAgents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">
                      <Shield className="h-8 w-8 mx-auto mb-3 opacity-50 text-accent" />
                      <p>No AI Agents registered yet. Create one to sync with LeanIX.</p>
                    </div>
                  ) : (
                    aiAgents.map((agent: any) => (
                      <div key={agent.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                        <div>
                          <p className="font-bold text-white flex items-center gap-2">
                            {agent.name}
                            <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20 text-[10px]">Synced to LeanIX</Badge>
                          </p>
                          <p className="text-sm text-slate-400 mt-1">{agent.description}</p>
                          <p className="text-xs text-slate-500 mt-2 font-mono">Created: {new Date(agent.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
