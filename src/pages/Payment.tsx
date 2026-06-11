import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CreditCard, QrCode, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function Payment() {
  const { planKey } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        const plansData = await api.get<any>('/subscription/plans');
        if (plansData.plans && planKey && plansData.plans[planKey]) {
          setPlan(plansData.plans[planKey]);
        } else {
          toast({ title: "Invalid Plan", variant: "destructive" });
          navigate("/agent-subscription");
        }
      } catch (e) {
        toast({ title: "Failed to load plan", variant: "destructive" });
        navigate("/agent-subscription");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlanDetails();
  }, [planKey, navigate, toast]);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create order
      const orderData = await api.post<any>('/subscription/purchase', { planKey });
      
      // 2. Verify order immediately to simulate successful local checkout
      // In a real integration, we'd pass this to Stripe/Razorpay UI or process card directly
      await api.post('/subscription/verify', {
        orderId: orderData.orderId,
        paymentId: `sim_pay_${Date.now()}`,
        signature: 'mock_sig_or_bypassed_by_server'
      });

      toast({ title: "Payment Successful!", description: "Your subscription is now active." });
      navigate("/agent/dashboard");
    } catch (e: any) {
      toast({ title: "Payment Failed", description: e.message || "An error occurred during payment processing.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="h-8 w-8 text-accent animate-spin" /></div>;
  }

  if (!plan) return null;

  const priceFormatted = plan.price / 100;
  // Generate UPI QR Code URL
  // We use api.qrserver.com to generate a QR for a simulated UPI string
  const upiString = `upi://pay?pa=schemesage@upi&pn=SchemeSage&am=${priceFormatted}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}&margin=10`;

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container max-w-5xl mx-auto relative z-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Checkout Form Area */}
          <div className="lg:col-span-2">
            <Card className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
              <CardHeader className="border-b border-white/10 pb-6">
                <CardTitle className="text-2xl font-heading flex items-center gap-2 text-white">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                  Secure Checkout
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Select your preferred payment method to complete the purchase.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="upi" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-[#020617] p-1 border border-white/10 rounded-xl mb-6">
                    <TabsTrigger value="upi" className="rounded-lg data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
                      <QrCode className="h-4 w-4 mr-2" />
                      UPI / QR Code
                    </TabsTrigger>
                    <TabsTrigger value="card" className="rounded-lg data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Credit / Debit Card
                    </TabsTrigger>
                  </TabsList>

                  {/* UPI Content */}
                  <TabsContent value="upi" className="space-y-6 animate-in fade-in-50">
                    <div className="flex flex-col items-center justify-center p-8 bg-[#020617] border border-white/5 rounded-xl text-center space-y-4">
                      <div className="bg-white p-2 rounded-xl">
                        <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-300">Scan with any UPI App</p>
                        <div className="flex items-center justify-center gap-4">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-6 opacity-80" />
                          <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="h-6 opacity-80" />
                          <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Paytm_logo.png" alt="Paytm" className="h-4 opacity-80" />
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handlePayment} 
                      disabled={isProcessing}
                      className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-900/20"
                    >
                      {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : `Simulate Scan & Pay ₹${priceFormatted}`}
                    </Button>
                  </TabsContent>

                  {/* Card Content */}
                  <TabsContent value="card" className="space-y-6 animate-in fade-in-50">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Card Number</Label>
                        <Input placeholder="0000 0000 0000 0000" className="bg-[#020617] border-white/10 h-12 text-white font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Expiry (MM/YY)</Label>
                          <Input placeholder="MM/YY" className="bg-[#020617] border-white/10 h-12 text-white font-mono" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">CVV</Label>
                          <Input type="password" placeholder="•••" maxLength={4} className="bg-[#020617] border-white/10 h-12 text-white font-mono" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Cardholder Name</Label>
                        <Input placeholder="Name on card" className="bg-[#020617] border-white/10 h-12 text-white" />
                      </div>
                    </div>

                    <Button 
                      onClick={handlePayment} 
                      disabled={isProcessing}
                      className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-900/20"
                    >
                      {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : `Pay ₹${priceFormatted} Securely`}
                    </Button>
                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Area */}
          <div className="lg:col-span-1">
            <Card className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 text-white sticky top-24">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-lg font-bold text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Monthly Subscription</p>
                    </div>
                    <span className="font-bold text-lg">₹{priceFormatted}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Subtotal</span>
                    <span>₹{priceFormatted}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Taxes & Fees</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="font-bold text-white">Total Amount</span>
                    <span className="font-black text-2xl text-white">₹{priceFormatted}</span>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center mt-6">
                  <ShieldCheck className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                  <p className="text-[10px] text-blue-200 leading-relaxed font-medium uppercase tracking-widest">
                    100% Encrypted & Secure
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
