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
      <div className="print:hidden font-sans selection:bg-[#F97316]/20 bg-[#030712] min-h-[100vh] text-slate-200 pb-32">
        <header className="pt-24 pb-16 px-6 border-b border-slate-800/60 relative">
          <div className="container mx-auto max-w-6xl relative z-10">
            <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-4">
              Applications History
            </h1>
            <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
              A complete, permanent archive of every application you have ever submitted, beautifully organized.
            </p>
          </div>
        </header>

        <main className="container mx-auto max-w-6xl px-6 pt-12">
          {applications.length === 0 ? (
            <div className="border border-slate-800/60 rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <h2 className="text-lg font-semibold text-slate-300 mb-2">No application history available</h2>
              <p className="text-slate-500 text-sm max-w-sm mb-8">
                Start exploring government schemes and submitting applications to see your history here.
              </p>
              <button onClick={() => window.location.href = '/discover'} className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
                Start Exploring
              </button>
            </div>
          ) : (
            <>
              {/* Analytics Top Section */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-12">
                {[
                  { label: "Total Apps", value: total, color: "text-slate-200" },
                  { label: "Approved", value: approved, color: "text-emerald-400" },
                  { label: "Rejected", value: rejected, color: "text-red-400" },
                  { label: "Pending", value: pending, color: "text-[#F97316]" },
                  { label: "Assisted", value: assisted, color: "text-purple-400" },
                  { label: "Manual", value: manual, color: "text-blue-400" },
                ].map((stat, i) => (
                  <div key={i} className="border border-slate-800/60 rounded-xl bg-[#0F172A]/30 p-6 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{stat.label}</p>
                    <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Data Table */}
              {/* Data Table */}
              <div className="border border-slate-800/60 rounded-xl bg-[#0F172A]/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-800/60 font-semibold tracking-widest">
                      <tr>
                        <th className="px-8 py-5">Scheme Name</th>
                        <th className="px-8 py-5">Application Date</th>
                        <th className="px-8 py-5">Method</th>
                        <th className="px-8 py-5">Status / Outcome</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {applications.map((app: any) => {
                        const isAssisted = app.type === 'assisted';
                        
                        let statusColor = "text-slate-400";
                        if (app.status === 'approved') { statusColor = "text-emerald-400"; }
                        if (app.status === 'rejected') { statusColor = "text-red-400"; }
                        if (app.status === 'in_review') { statusColor = "text-[#F97316]"; }
                        if (app.status === 'document_pending') { statusColor = "text-amber-400"; }

                        return (
                          <tr key={app.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-8 py-5">
                              <p className="font-semibold text-slate-200 max-w-[300px] truncate group-hover:text-white transition-colors text-base">{app.schemeName}</p>
                              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase bg-slate-800/50 text-slate-400 border border-slate-700/50">
                                ID: {app.trackingId || app.id.slice(0, 8).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-8 py-5 font-medium text-slate-400">
                              {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-widest uppercase ${
                                isAssisted ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50' : 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                              }`}>
                                {isAssisted ? 'Assisted' : 'Manual'}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`text-sm font-medium capitalize ${statusColor}`}>
                                {app.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right space-x-3 whitespace-nowrap">
                              <Link 
                                to={`/tracking/${app.id}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors border border-slate-800/60 rounded-lg px-4 py-2 hover:bg-slate-800/50"
                              >
                                View Details 
                              </Link>
                              <button 
                                onClick={() => handleDownloadSummary(app)}
                                className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors border border-slate-800/60 rounded-lg px-4 py-2 hover:bg-slate-800/50"
                              >
                                Download <Download className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
