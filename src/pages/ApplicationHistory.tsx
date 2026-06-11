import { useState } from "react";
import { Link } from "react-router-dom";
import { useApplications } from "@/hooks/useApplications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Download, Eye, FileText, CheckCircle, XCircle, Clock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ApplicationHistory() {
  const { data: applications = [], isLoading } = useApplications();
  const { user } = useAuth();
  
  // For print layout state
  const [printApp, setPrintApp] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-muted/30">
        <Activity className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  // Analytics Calculation
  const total = applications.length;
  const approved = applications.filter(a => a.status === 'approved').length;
  const rejected = applications.filter(a => a.status === 'rejected').length;
  const pending = applications.filter(a => ['submitted', 'in_review', 'document_pending'].includes(a.status)).length;
  const assisted = applications.filter(a => a.type === 'assisted').length;
  const manual = applications.filter(a => a.type !== 'assisted').length;

  const handleDownloadSummary = (app: any) => {
    setPrintApp(app);
    // Use a slight timeout to ensure state is rendered before print
    setTimeout(() => {
      window.print();
      // Clear after printing dialog closes
      setTimeout(() => setPrintApp(null), 1000);
    }, 100);
  };

  return (
    <div className="min-h-[80vh] bg-slate-50 pb-20 relative">
      
      {/* --- START PRINT-ONLY LAYOUT --- */}
      {printApp && (
        <div className="hidden print:block absolute inset-0 bg-white z-50 p-10 font-sans">
          <div className="text-center mb-10 border-b-2 border-slate-900 pb-6">
            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">SchemeSage</h1>
            <p className="text-slate-500 mt-1">Official Application Summary</p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-2">Scheme Details</h2>
              <p className="text-2xl font-bold text-slate-900 leading-tight">{printApp.schemeName}</p>
              <p className="font-mono text-sm mt-2 text-slate-600">ID: {printApp.trackingId || printApp.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider mb-2">Submission Date</h2>
              <p className="text-xl font-bold text-slate-900">{new Date(printApp.createdAt).toLocaleDateString()}</p>
              <p className="text-sm mt-2 font-bold uppercase text-blue-600">{printApp.type === 'assisted' ? 'Agent Assisted' : 'Manual Application'}</p>
            </div>
          </div>

          <div className="mb-10 p-6 bg-slate-50 border border-slate-200 rounded-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Current Status</h2>
            <div className="flex items-center justify-between">
              <p className="text-xl font-black capitalize text-slate-800">{printApp.status.replace('_', ' ')}</p>
              <p className="text-sm text-slate-500 font-medium">Last Updated: {new Date(printApp.updatedAt || printApp.createdAt).toLocaleDateString()}</p>
            </div>
            {printApp.rejectionReason && (
              <div className="mt-4 p-4 bg-red-50 text-red-800 rounded border border-red-200">
                <span className="font-bold">Rejection Reason:</span> {printApp.rejectionReason}
              </div>
            )}
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Citizen Information</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              {Object.entries(printApp.formData || {}).map(([key, value]) => {
                if (typeof value === 'object') return null;
                return (
                  <div key={key}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="font-medium text-slate-900">{String(value)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {printApp.documents && printApp.documents.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Documents Submitted</h2>
              <ul className="list-disc list-inside">
                {printApp.documents.map((doc: any, i: number) => (
                  <li key={i} className="font-medium text-slate-700">{doc.type || 'Document'}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-20 text-center text-sm text-slate-400">
            Generated securely via SchemeSage Citizen Portal.
          </div>
        </div>
      )}
      {/* --- END PRINT-ONLY LAYOUT --- */}


      {/* Screen layout hides during print */}
      <div className="print:hidden">
        <header className="bg-[#020617] text-white pt-16 pb-12 px-4 shadow-xl border-b border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent pointer-events-none" />
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-green-400" />
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-400/20 px-3 py-1 uppercase tracking-[0.2em] text-[10px] font-black backdrop-blur-sm">
                Archive
              </Badge>
            </div>
            <h1 className="font-heading font-black text-3xl md:text-5xl tracking-tight mb-3">
              Applications <span className="text-green-400">History</span>
            </h1>
            <p className="text-slate-400 max-w-xl leading-relaxed">
              A complete, permanent archive of every application you have ever submitted.
            </p>
          </div>
        </header>

        <main className="container mx-auto max-w-6xl px-4 -mt-6">
          {applications.length === 0 ? (
            <Card className="shadow-2xl border-white/10 bg-card p-12 text-center flex flex-col items-center justify-center">
              <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No application history available</h2>
              <p className="text-muted-foreground max-w-sm mb-8">
                Start exploring government schemes and submitting applications to see your history here.
              </p>
              <Button size="lg" asChild className="gap-2 bg-green-600 hover:bg-green-700">
                <Link to="/discover">Start Exploring</Link>
              </Button>
            </Card>
          ) : (
            <>
              {/* Analytics Top Section */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                <Card className="shadow-md border-0 ring-1 ring-slate-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Total</p>
                    <p className="text-3xl font-black text-slate-900">{total}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 ring-1 ring-green-200 bg-green-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-1">Approved</p>
                    <p className="text-3xl font-black text-green-700">{approved}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 ring-1 ring-red-200 bg-red-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Rejected</p>
                    <p className="text-3xl font-black text-red-700">{rejected}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 ring-1 ring-amber-200 bg-amber-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Pending</p>
                    <p className="text-3xl font-black text-amber-700">{pending}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 ring-1 ring-purple-200 bg-purple-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Assisted</p>
                    <p className="text-3xl font-black text-purple-700">{assisted}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 ring-1 ring-blue-200 bg-blue-50/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Manual</p>
                    <p className="text-3xl font-black text-blue-700">{manual}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Data Table */}
              <Card className="shadow-xl border-0 ring-1 ring-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b border-slate-200 font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Scheme Name</th>
                        <th className="px-6 py-4">Application Date</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Status / Outcome</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app: any) => {
                        const isAssisted = app.type === 'assisted';
                        
                        let StatusIcon = Clock;
                        let statusColor = "text-slate-500 bg-slate-100";
                        if (app.status === 'approved') { StatusIcon = CheckCircle; statusColor = "text-green-700 bg-green-100 border-green-200"; }
                        if (app.status === 'rejected') { StatusIcon = XCircle; statusColor = "text-red-700 bg-red-100 border-red-200"; }
                        if (app.status === 'in_review') { StatusIcon = Activity; statusColor = "text-blue-700 bg-blue-100 border-blue-200"; }
                        if (app.status === 'document_pending') { StatusIcon = AlertCircle; statusColor = "text-amber-700 bg-amber-100 border-amber-200"; }

                        return (
                          <tr key={app.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 max-w-[300px]">
                              <p className="truncate">{app.schemeName}</p>
                              <p className="font-mono text-xs text-slate-400 font-normal mt-0.5">ID: {app.trackingId || app.id.slice(0, 8).toUpperCase()}</p>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-600">
                              {new Date(app.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className={`font-bold border-0 ${isAssisted ? 'text-purple-600 bg-purple-50' : 'text-slate-600 bg-slate-100'}`}>
                                {isAssisted ? <User className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                                {isAssisted ? 'Assisted' : 'Manual'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={`capitalize font-bold border ${statusColor}`}>
                                <StatusIcon className="h-3 w-3 mr-1.5" />
                                {app.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                              <Button asChild variant="outline" size="sm" className="h-8 shadow-sm">
                                <Link to={`/tracking/${app.id}`}><Eye className="h-3.5 w-3.5 mr-1" /> View</Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="h-8 shadow-sm text-[#f97316] border-[#f97316]/30 hover:bg-[#f97316]/10">
                                <Link to={`/tracking`}><Activity className="h-3.5 w-3.5 mr-1" /> Track</Link>
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="h-8 shadow-sm"
                                onClick={() => handleDownloadSummary(app)}
                              >
                                <Download className="h-3.5 w-3.5 mr-1" /> Summary
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
