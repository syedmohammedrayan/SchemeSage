import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, ArrowRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const AgentSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<any>({});
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansData, subData] = await Promise.all([
        api.get<any>('/subscription/plans'),
        api.get<any>('/subscription/status')
      ]);
      setPlans(plansData.plans);
      setCurrentSub(subData);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load plans", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planKey: string) => {
    navigate(`/payment/${planKey}`);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="h-8 w-8 text-accent animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="container max-w-6xl mx-auto relative z-10">
            <div className="mb-12 text-center">
                <Badge variant="outline" className="border-accent/30 text-accent font-black tracking-widest text-[10px] uppercase px-4 py-1 mb-4">
                  Agent Growth Plans
                </Badge>
                <h1 className="text-4xl md:text-5xl font-black font-heading tracking-tight mb-4 text-white">Unlock Priority Applications</h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                  Subscribe to a professional plan to claim 'Agent Assisted' applications from the global pool and earn ₹150 commission per successful application.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Object.entries(plans).map(([key, plan]: [string, any]) => {
                    const isCurrentPlan = currentSub?.plan?.planKey === key && currentSub?.allowed;
                    const isPopular = plan.badge === 'Most Popular';

                    return (
                        <Card key={key} className={`bg-[#0f172a]/80 backdrop-blur-xl border ${isPopular ? 'border-accent shadow-[0_0_30px_rgba(var(--accent-rgb),0.15)] scale-105 z-10' : 'border-white/10'} rounded-3xl overflow-hidden relative flex flex-col`}>
                            {isPopular && (
                                <div className="bg-accent text-center text-[10px] font-black uppercase tracking-widest py-1.5 text-white">
                                    MOST POPULAR
                                </div>
                            )}
                            <CardHeader className="p-8 text-center pb-4">
                                <CardTitle className="text-xl font-bold text-slate-200 mb-2">{plan.name}</CardTitle>
                                <div className="flex justify-center items-end gap-1">
                                    <span className="text-4xl font-black text-white">₹{plan.price / 100}</span>
                                    <span className="text-slate-500 font-medium pb-1">/mo</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 pt-4 flex-1 flex flex-col">
                                <div className="mb-8">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-white/10 pb-2">Target Audience</p>
                                    <p className="text-sm text-slate-300 font-medium">{plan.target.join(' • ')}</p>
                                </div>
                                
                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((f: string, i: number) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                                            <CheckCircle className="h-5 w-5 text-accent shrink-0" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button 
                                    onClick={() => handleSubscribe(key)}
                                    disabled={isCurrentPlan || isProcessing !== null}
                                    variant={isPopular ? "accent" : "outline"}
                                    className={`w-full h-14 rounded-xl font-bold text-lg transition-all ${
                                      isCurrentPlan 
                                        ? 'bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30 hover:text-green-400' 
                                        : isPopular 
                                          ? 'shadow-xl shadow-accent/20 hover:scale-[1.02]' 
                                          : 'bg-transparent border-white/20 text-white hover:bg-white hover:text-slate-900'
                                    }`}
                                >
                                    {isProcessing === key ? <Loader2 className="h-6 w-6 animate-spin" /> : 
                                     isCurrentPlan ? 'Current Plan' : 'Subscribe Now'}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            
            <div className="mt-12 text-center">
                <Button variant="ghost" onClick={() => navigate('/agent-dashboard')} className="text-slate-400 hover:text-white">
                    Back to Dashboard
                </Button>
            </div>
        </div>
    </div>
  );
};

export default AgentSubscription;
