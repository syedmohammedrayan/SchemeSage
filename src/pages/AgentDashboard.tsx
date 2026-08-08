import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, LogOut, CheckCircle, XCircle, PlayCircle, FileText, Landmark, User, LayoutDashboard, MessageSquare, Phone, Calendar, LifeBuoy, Search, Wallet, IndianRupee, TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AgentDashboard = () => {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [scraped, setScraped] = useState<any>(null);
  const [scraping, setScraping] = useState(false);
  const [govSchemes, setGovSchemes] = useState<any[]>([]);
  
  const [subStatus, setSubStatus] = useState<any>(null);
  const [wallet, setWallet] = useState<any>({ availableBalance: 0, pendingEarnings: 0, totalEarned: 0 });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);

  // FIX: Removed dangerous 'agent-1' fallback ID.
  // If user is not authenticated, redirect to login immediately.
  useEffect(() => {
    if (!user?.id) {
      navigate('/login', { replace: true });
      return;
    }
    fetchApplications();
    fetchHelpRequests();
    fetchScrapedData();
    fetchGovSchemes();
    fetchOverviewData();
  }, [user?.id]);

  // Safe: only reached after auth guard confirms user exists
  const agentId = user?.id ?? '';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchScrapedData = async () => {
    try {
      const data = await api.get<any>('/admin/scraped-data');
      setScraped(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGovSchemes = async () => {
    try {
      const data = await api.get<{ schemes: any[] }>('/schemes');
      const gov = (data.schemes || []).filter((s: any) => s.source === 'government');
      setGovSchemes(gov);
    } catch (e) { console.error(e); }
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

  const fetchApplications = () => {
    api.get<any[]>(`/agent/applications/${agentId}`)
      .then(setApplications)
      .catch(console.error);
  };

  const fetchOverviewData = async () => {
      try {
          const sub = await api.get<any>('/subscription/status');
          setSubStatus(sub);

          const wData = await api.get<any>('/agents/earnings');
          setWallet(wData);

          const wdData = await api.get<any>('/withdrawal/history');
          setWithdrawals(wdData.withdrawals || []);
          
          const ledData = await api.get<any[]>('/agents/ledger');
          setLedger(ledData || []);
      } catch (e) {
          console.error("Failed to load overview data", e);
      }
  };

  const requestWithdrawal = async () => {
      try {
          // Just request all available for MVP
          await api.post('/withdrawal/request', { amount: wallet.pendingEarnings, method: 'UPI' });
          toast({ title: "Withdrawal Requested", description: "Your request has been submitted for approval." });
          fetchOverviewData();
      } catch(e: any) {
          toast({ title: "Request Failed", description: e.message, variant: "destructive" });
      }
  };

  const updateStatus = async (applicationId: string, status: string) => {
    try {
      await api.patch(`/agent/update-status/${applicationId}`, { status });
      toast({ title: `Application marked as ${status}` });
      fetchApplications();
    } catch (e) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/agents/request/${id}/status`, { status });
      toast({ title: `Lead marked as ${status.toUpperCase()}` });
      fetchHelpRequests();
    } catch (e) {
      toast({ title: "Failed to update request", variant: "destructive" });
    }
  };

  const handleAccept = async (applicationId: string) => {
    try {
      await api.post(`/agent/accept/${applicationId}`, { agentId });
      toast({ title: "Application Claimed", description: "This application has been successfully assigned to you." });
      fetchApplications();
    } catch (e: any) {
      toast({ title: "Claim Failed", description: e.message || "Someone else may have already taken this task.", variant: "destructive" });
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      await api.post(`/agent/reject/${applicationId}`);
      toast({ title: "Application Rejected", description: "The application has been marked as rejected." });
      fetchApplications();
    } catch (e) {
      toast({ title: "Rejection Failed", variant: "destructive" });
    }
  };

  const poolApps = applications.filter(a => a.status === 'submitted' && (!a.agentId || a.agentId === ""));
  const activeApps = applications.filter(a => ['submitted', 'in_review'].includes(a.status) && a.agentId === agentId);
  const historyApps = applications.filter(a => ['approved', 'rejected'].includes(a.status) && a.agentId === agentId);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const pendingLeads = helpRequests.filter(req => req.status === 'pending' || !req.status);
  const activeCases = helpRequests.filter(req => req.status === 'accepted' && req.assignedAgentId === agentId);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30 selection:text-white overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <Tabs defaultValue="overview" className="flex w-full h-full z-10">
        
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 bg-[#0f172a]/60 backdrop-blur-3xl border-r border-white/5 flex flex-col h-full relative z-20">
           <div className="p-6 flex-1 flex flex-col overflow-y-auto scrollbar-hide">
              <Link to="/agent-dashboard" className="flex items-center gap-3 group mb-12">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-heading font-black text-xl text-white tracking-tight block leading-none">
                    SCHEMESAGE
                  </span>
                  <span className="text-[10px] font-bold text-blue-400 tracking-[0.2em] uppercase">Gov Portal</span>
                </div>
              </Link>
              
              <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-2 items-start justify-start w-full">
                <TabsTrigger value="overview" className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-semibold">
                  <LayoutDashboard className="h-4 w-4 mr-3" /> Overview
                </TabsTrigger>
                <TabsTrigger value="pool" className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-semibold flex items-center justify-between">
                  <div className="flex items-center"><Search className="h-4 w-4 mr-3" /> Application Pool</div>
                  {poolApps.length > 0 && <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">{poolApps.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="active" className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-semibold flex items-center justify-between">
                  <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-3" /> My Queue</div>
                  {activeApps.length > 0 && <Badge className="bg-blue-500/20 text-blue-400 border-0">{activeApps.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="wallet" className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-semibold">
                  <Wallet className="h-4 w-4 mr-3" /> Ledger & Wallet
                </TabsTrigger>
                <TabsTrigger value="assistance" className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-semibold flex items-center justify-between">
                  <div className="flex items-center"><LifeBuoy className="h-4 w-4 mr-3" /> Help Centre</div>
                  {(pendingLeads.length + activeCases.length) > 0 && <Badge className="bg-red-500/20 text-red-400 border-0">{pendingLeads.length + activeCases.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="history" className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all font-semibold">
                  <FileText className="h-4 w-4 mr-3" /> History
                </TabsTrigger>
              </TabsList>
           </div>
           
           {/* User Profile & Logout */}
           <div className="p-6 border-t border-white/5 space-y-4 bg-[#0f172a]/40">
              <div 
                 onClick={() => navigate('/profile')}
                 className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all group"
                 title="View/Edit Profile"
              >
                 <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-blue-500/20 group-hover:ring-blue-400/50 transition-all">
                   <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName || "Agent"}&backgroundColor=0f172a&textColor=38bdf8`} />
                   <AvatarFallback className="bg-slate-800 text-xs">{user?.fullName?.charAt(0) || "A"}</AvatarFallback>
                 </Avatar>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">{user?.fullName || "Field Agent"}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5"></span>Online</p>
                 </div>
              </div>
              <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-all">
                 <LogOut className="h-4 w-4 mr-2" /> Logout securely
              </Button>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-transparent relative z-10 scrollbar-hide">
            <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#020617]/40 backdrop-blur-md sticky top-0 z-40">
                <h1 className="text-2xl font-bold text-white font-heading tracking-tight">Field Ops Terminal</h1>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                  <Shield className="h-3 w-3 mr-2" /> Secure Uplink
                </Badge>
            </header>
            
            <div className="p-8 max-w-5xl mx-auto w-full">
          
          <TabsContent value="overview" className="space-y-6 mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            {/* Subscription & Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Subscription Card - Premium Glassmorphism */}
              <Card className="bg-[#0f172a]/60 backdrop-blur-2xl border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden col-span-1 lg:col-span-2 group">
                {/* Decorative gradients */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-all duration-500" />
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-500" />
                
                {subStatus?.plan?.planKey === 'professional' && (
                  <div className="absolute -right-12 top-7 rotate-45 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-1 px-12 text-[10px] font-black uppercase tracking-widest shadow-lg border-y border-white/20">
                    Pro Tier
                  </div>
                )}
                
                <CardHeader className="relative z-10 pb-2">
                  <CardTitle className="flex items-center gap-3 text-white text-lg">
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                    Active Subscription
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="relative z-10">
                  {!subStatus?.allowed ? (
                    <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
                      <AlertCircle className="h-6 w-6 text-red-500 mt-1 shrink-0" />
                      <div>
                         <p className="font-bold text-red-400 text-lg">No Active Plan or Limit Reached</p>
                         <p className="text-sm text-slate-400 mt-1 leading-relaxed">You must subscribe to a plan to claim priority assisted applications. Free leads are still available.</p>
                         <Button onClick={() => navigate('/agent-subscription')} className="mt-5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20">View Subscription Plans</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row justify-between gap-8 pt-2">
                       <div className="flex flex-col justify-between">
                         <div>
                           <h3 className="text-4xl font-black text-white font-heading tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{subStatus.plan.planName}</h3>
                           <p className="text-slate-400 text-sm mt-2 font-medium flex items-center">
                             <Calendar className="w-4 h-4 mr-2 opacity-50" />
                             Valid until <span className="text-slate-200 ml-1">{new Date(subStatus.plan.expiryDate).toLocaleDateString()}</span>
                           </p>
                         </div>
                         <div className="mt-8">
                           <Button onClick={() => navigate('/agent-subscription')} variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 rounded-xl transition-all h-11 px-6">
                             Upgrade Plan
                           </Button>
                         </div>
                       </div>
                       
                       <div className="bg-[#020617]/50 p-6 rounded-2xl border border-white/5 flex-1 max-w-xs relative overflow-hidden ring-1 ring-white/5 shadow-inner">
                          {/* Inner glow */}
                          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                          
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center">
                             <LayoutDashboard className="w-3 h-3 mr-2" /> Application Credits
                          </p>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-5xl font-black text-white font-heading tracking-tighter">
                               {subStatus.plan.limit === -1 ? '∞' : subStatus.remaining}
                            </span>
                            <span className="text-sm font-bold text-blue-400 pb-1.5 uppercase tracking-wide">remaining</span>
                          </div>
                          {subStatus.plan.limit !== -1 && (
                            <div className="w-full bg-[#0f172a] rounded-full h-2.5 mt-5 border border-white/5 overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${(subStatus.used / subStatus.plan.limit) * 100}%` }}>
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-wider flex justify-between">
                            <span>{subStatus.used} used</span>
                            <span>{subStatus.plan.limit === -1 ? 'Unlimited' : `${subStatus.plan.limit} total`}</span>
                          </p>
                       </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Performance Stats - Premium Glassmorphism */}
              <Card className="bg-[#0f172a]/60 backdrop-blur-2xl border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-32 bg-green-500/10 blur-[80px] rounded-full group-hover:bg-green-500/20 transition-all duration-500" />
                 
                 <CardHeader className="relative z-10 pb-4">
                   <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center">
                     <TrendingUp className="w-4 h-4 mr-2 text-green-400" /> Total Earnings
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="relative z-10">
                    <div className="flex flex-col gap-4">
                       <div className="flex items-end gap-1">
                         <span className="text-xl font-bold text-slate-400 pb-1">₹</span>
                         <span className="text-5xl font-black text-white font-heading tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-green-100">
                           {((wallet?.totalEarned || 0) / 100).toLocaleString('en-IN')}
                         </span>
                       </div>
                       
                       <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                         <div className="flex items-center text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                           <ArrowUpRight className="h-3 w-3 mr-1" /> Lifetime
                         </div>
                         <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                           <IndianRupee className="h-5 w-5 text-white" />
                         </div>
                       </div>
                    </div>
                 </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 border-white/10 shadow-xl md:col-span-2">
                   <CardContent className="p-8">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                         <div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Available for Withdrawal</p>
                            <p className="text-5xl font-black text-white">₹{(wallet?.pendingEarnings || 0) / 100}<span className="text-xl text-slate-500 ml-1">.00</span></p>
                         </div>
                         <Button 
                          onClick={requestWithdrawal} 
                          disabled={!wallet?.pendingEarnings || wallet.pendingEarnings < 50000}
                          className="h-14 px-8 bg-accent hover:bg-accent/90 text-black font-black text-lg rounded-2xl shadow-lg shadow-accent/20"
                         >
                           Withdraw Funds
                         </Button>
                      </div>
                      <p className="text-xs text-slate-500 mt-6"><AlertCircle className="h-3 w-3 inline mr-1"/> Minimum withdrawal amount is ₹500. Standard processing time 2-3 business days.</p>
                   </CardContent>
                </Card>
                <Card className="bg-slate-900 border-white/10 shadow-xl">
                   <CardHeader>
                     <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Total Processed</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <p className="text-3xl font-black text-white">{historyApps.length}</p>
                      <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Successful Applications</p>
                   </CardContent>
                </Card>
             </div>

             <Card className="bg-slate-900 border-white/10 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-white">Payments Timeline</CardTitle>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your complete financial ledger</p>
                </CardHeader>
                <CardContent>
                   {ledger.length === 0 ? (
                      <p className="text-center py-8 text-slate-500 text-sm">No transactions yet.</p>
                   ) : (
                      <div className="space-y-4">
                         {ledger.map((l, i) => (
                            <div key={i} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 bg-[#0f172a] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl ${l.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-slate-800 text-slate-400'}`}>
                                    {l.type === 'commission' ? <IndianRupee className="h-6 w-6" /> : l.type === 'withdrawal' ? <Landmark className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                                  </div>
                                  <div>
                                     <p className="text-white font-bold text-lg">{l.title}</p>
                                     <p className="text-xs text-slate-400 mb-1">{l.description}</p>
                                     <p className="text-[10px] font-mono text-slate-500">{new Date(l.createdAt).toLocaleString()}</p>
                                  </div>
                               </div>
                               <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                                 <p className={`text-xl font-black ${l.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                                   {l.amount > 0 ? '+' : ''}₹{l.amount / 100}
                                 </p>
                                 <Badge variant="outline" className={`mt-2 border-white/10 text-[10px] uppercase font-black ${l.status === 'completed' || l.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                                   {l.status}
                                 </Badge>
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="pool">
            {poolApps.length === 0 ? (
              <div className="text-center py-20 bg-slate-950/40 rounded-3xl border border-white/10 border-dashed">
                <Landmark className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-300 font-bold">No new applications in the global pool.</p>
                <p className="text-xs text-slate-500 mt-2">Checking HQ every 30 seconds...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                  {poolApps.map(app => (
                    <div key={app.id} className={`bg-slate-900 border ${app.paymentStatus === 'paid' ? 'border-accent/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]' : 'border-white/10'} rounded-2xl overflow-hidden shadow-2xl relative transition-all hover:scale-[1.01]`}>
                      {app.paymentStatus === 'paid' ? (
                        <div className="absolute top-4 right-4 bg-accent text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-accent/20 z-10">
                          PRIORITY ASSISTANCE
                        </div>
                      ) : (
                        <div className="absolute top-4 right-4 bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 z-10">
                          FREE REQUEST
                        </div>
                      )}
                      
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-1">
                           <FileText className={`h-5 w-5 ${app.paymentStatus === 'paid' ? 'text-accent' : 'text-slate-500'}`} />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Service Request</span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-4 tracking-tight leading-none">{app.schemeName}</h3>
                        
                        <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/5">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Applicant Full Name</p>
                              <p className="text-lg font-bold text-white leading-none">{app.userName || app.formData?.fullName || "Anonymous Citizen"}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Region / State</p>
                              <p className="text-lg font-bold text-accent leading-none">{app.formData?.state || "N/A"}</p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`border-accent/30 text-accent font-black uppercase text-[10px] px-3 py-1 ${app.paymentStatus === 'paid' ? 'opacity-100' : 'opacity-0'}`}>
                                 PRO-FILING
                              </Badge>
                           </div>
                           <Button 
                            onClick={() => handleAccept(app.id)} 
                            className={`h-14 px-10 ${app.paymentStatus === 'paid' ? 'bg-accent hover:bg-accent/90' : 'bg-white hover:bg-slate-200'} text-black font-black rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95`}
                           >
                             <CheckCircle className="h-5 w-5" /> ACCEPT & CLAIM WORK
                           </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeApps.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-[#020617] rounded-2xl border-2 border-dashed border-white/5">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-lg font-bold">Your active queue is empty.</p>
                <p className="text-sm opacity-60">Go to the Pool to claim new assignments.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {activeApps.map((app) => (
                  <Card key={app.id} className="bg-[#020617] border border-white/10 shadow-xl overflow-hidden group">
                    <div className="bg-accent/10 h-1" />
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl font-black text-white group-hover:text-accent transition-colors">{app.schemeName}</CardTitle>
                          <div className="flex items-center gap-3 mt-2">
                             <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-black tracking-tighter text-slate-400">APP-ID: {app.id.split('-')[0].toUpperCase()}</div>
                             <Badge className={app.status === 'in_review' ? "bg-info text-white" : app.status === 'submitted' ? "bg-accent/20 text-accent border-0" : "bg-warning text-black"} variant="secondary">
                               {app.status === 'in_review' ? 'IN PROGRESS' : app.status.toUpperCase()}
                             </Badge>
                          </div>
                        </div>
                        <div className="sm:text-right text-left">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Citizen Contact</p>
                          <p className="font-bold text-white text-lg">{app.userName || app.formData?.fullName || "N/A"}</p>
                          <p className="text-accent text-sm font-mono">{app.formData?.mobile || app.userEmail || "N/A"}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Verification Documents
                          </p>
                          {app.documents && app.documents.length > 0 ? (
                            <div className="space-y-2">
                              {app.documents.map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-slate-200">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  <span className="truncate">{typeof d === 'string' ? d : d.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-destructive italic font-bold">CRITICAL: No documents uploaded.</p>
                          )}
                        </div>
                        <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Landmark className="h-3 w-3" /> Location Context
                          </p>
                          <div className="space-y-1 text-sm text-slate-200">
                             <p className="font-bold">{app.formData?.state || "N/A"}</p>
                             <p className="text-xs text-slate-400">{app.formData?.address || "No address provided"}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-white/5">
                        <Button variant="outline" className="flex-1 sm:flex-none h-12 border-white/10 hover:bg-white/5 text-white font-bold px-8 rounded-xl transition-all" asChild>
                          <Link to={`/tracking/${app.id}`} target="_blank">
                            <FileText className="h-4 w-4 mr-2" /> Details
                          </Link>
                        </Button>
                        {app.status === 'submitted' && (
                          <Button className="flex-1 sm:flex-none h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 rounded-xl transition-all shadow-lg shadow-blue-900/20" onClick={() => updateStatus(app.id, 'in_review')}>
                            <PlayCircle className="h-4 w-4 mr-2" /> Mark In Progress
                          </Button>
                        )}
                        {app.status === 'in_review' && (
                          <Button className="flex-1 sm:flex-none h-12 bg-green-600 hover:bg-green-500 text-white font-bold px-8 rounded-xl shadow-lg shadow-green-900/20" onClick={() => updateStatus(app.id, 'approved')}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Complete
                          </Button>
                        )}
                        <Button className="flex-1 sm:flex-none h-12 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 font-bold px-8 rounded-xl transition-all" onClick={() => updateStatus(app.id, 'rejected')}>
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assistance">
            <div className="space-y-12">
              
              {/* SECTION: ACTIVE CASES */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Consultations</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">In-progress client cases</p>
                  </div>
                  <Badge variant="outline" className="border-accent/30 text-accent font-black uppercase text-[10px] px-3 py-1 bg-accent/5">
                    {activeCases.length} Active
                  </Badge>
                </div>

                {activeCases.length === 0 ? (
                  <div className="text-center py-16 bg-slate-950/40 rounded-3xl border border-white/5 border-dashed">
                    <CheckCircle className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold">No active consultations.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {activeCases.map((req: any) => (
                      <Card key={req.id} className="bg-[#020617] border border-accent/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.05)] overflow-hidden">
                        <div className="h-1 w-full bg-accent" />
                        <CardContent className="p-0">
                          <div className="p-6 md:p-8">
                            <div className="flex items-center justify-between mb-6">
                               <div className="flex items-center gap-3">
                                 <h3 className="font-black text-2xl text-white tracking-tight leading-none">{req.userName || "Anonymous Guest"}</h3>
                                 <Badge className="bg-accent text-white border-0 text-[10px] font-black tracking-widest uppercase">Ongoing Process</Badge>
                               </div>
                               <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">ID: {req.id?.substring(0,8)}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/10">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Target Scheme</p>
                                <p className="text-lg font-bold text-white leading-tight">{req.schemeName || "General Discovery"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Contact Operations</p>
                                <div className="space-y-3">
                                  <a href={`tel:${req.userPhone}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                                    <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                      <Phone className="h-3 w-3" />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">{req.userPhone}</span>
                                  </a>
                                  {req.userEmail && (
                                    <a href={`mailto:${req.userEmail}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                        <MessageSquare className="h-3 w-3" />
                                      </div>
                                      <span className="font-medium text-sm">{req.userEmail}</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                              <Button variant="outline" className="h-12 border-white/10 text-white hover:bg-white/5 font-bold px-8 rounded-xl" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                Cancel Lead
                              </Button>
                              <Button className="h-12 bg-green-600 hover:bg-green-500 text-white font-black px-8 rounded-xl shadow-lg shadow-green-900/20" onClick={() => updateRequestStatus(req.id, 'completed')}>
                                <CheckCircle className="h-4 w-4 mr-2" /> REQUEST COMPLETED
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: PENDING LEADS */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Pending Leads Pool</h2>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">New callback requests awaiting assignment</p>
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 font-black uppercase text-[10px] px-3 py-1">
                    {pendingLeads.length} Available
                  </Badge>
                </div>

                {pendingLeads.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-white/5 border-dashed">
                    <MessageSquare className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold text-sm">No new leads in the global pool.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingLeads.map((req: any) => (
                      <Card key={req.id} className="bg-slate-900 border border-white/10 hover:border-white/20 transition-all">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-lg text-white leading-none">{req.userName || "Anonymous Lead"}</h3>
                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-black tracking-widest uppercase">New Lead</Badge>
                                {req.state && (
                                  <Badge className="bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20 text-[9px] font-black tracking-widest uppercase">{req.state}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-medium">{req.schemeName || "General Assistance"}</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <Button variant="outline" className="h-10 border-white/10 hover:bg-white/5 text-slate-300 font-bold w-full sm:w-auto" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                 Decline
                               </Button>
                               <Button className="h-10 bg-white text-black hover:bg-slate-200 font-black px-6 shadow-md w-full sm:w-auto" onClick={() => updateRequestStatus(req.id, 'accepted')}>
                                 Accept Lead
                               </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </TabsContent>

          <TabsContent value="history">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Request History</h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Complete archive of processed applications</p>
                </div>
                <Badge variant="outline" className="border-white/10 text-slate-400 font-black uppercase text-[10px] px-3 py-1">
                  {historyApps.length} Processed
                </Badge>
              </div>

              <div className="grid gap-4">
                {historyApps.length === 0 ? (
                  <div className="text-center py-16 bg-[#020617] rounded-3xl border border-white/5 border-dashed">
                     <FileText className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                     <p className="text-slate-400 font-bold">No history found.</p>
                  </div>
                ) : (
                  historyApps.map((app) => (
                    <Card key={app.id} className="bg-[#020617] border border-white/10 shadow-lg group hover:border-white/20 transition-all">
                      <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 h-12 w-12 rounded-full flex shrink-0 items-center justify-center ${app.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {app.status === 'approved' ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <Badge className={app.status === 'approved' ? "bg-green-500 text-white font-black text-[10px] uppercase border-0 tracking-widest" : "bg-red-500 text-white font-black text-[10px] uppercase border-0 tracking-widest"}>
                                 {app.status}
                               </Badge>
                               <span className="text-[10px] font-mono text-slate-500">ID: {app.id.substring(0,8)}</span>
                            </div>
                            <CardTitle className="text-xl font-black text-white">{app.schemeName}</CardTitle>
                            <p className="text-sm font-bold text-slate-400 mt-1">{app.userName || app.formData?.fullName}</p>
                          </div>
                        </div>
                        <div className="md:text-right bg-white/5 p-4 rounded-xl border border-white/5 w-full md:w-auto">
                          <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">Processing Completed On</p>
                          <p className="text-sm font-bold text-white flex items-center md:justify-end gap-2">
                             <Calendar className="h-4 w-4 text-accent" />
                             {new Date(app.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <Button variant="link" className="text-accent mt-2 h-auto p-0 text-xs font-bold" asChild>
                            <Link to={`/tracking/${app.id}`} target="_blank">View Application Record <ArrowUpRight className="h-3 w-3 ml-1"/></Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
          </TabsContent>
            </div>
        </div>
      </Tabs>
    </div>
  );
};

export default AgentDashboard;
