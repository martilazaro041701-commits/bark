import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  RefreshCw,
  Package,
  Clock,
  Building2,
  Plus,
  CheckCircle2,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Send,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  AlertCircle,
  Car,
  Calendar,
  DollarSign,
  Trash2,
  ShoppingBag,
  Truck,
  Box
} from "lucide-react";

// --- THEME CONSTANTS ---
const PHASE_THEME = {
  1: { solid: "bg-blue-600", border: "border-blue-200", text: "text-blue-600", dot: "bg-blue-600", shadow: "shadow-blue-200", dark: "bg-blue-700" },
  2: { solid: "bg-orange-500", border: "border-orange-200", text: "text-orange-600", dot: "bg-orange-500", shadow: "shadow-orange-200", dark: "bg-orange-600" },
  3: { solid: "bg-amber-700", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-700", shadow: "shadow-amber-200", dark: "bg-amber-800" },
  4: { solid: "bg-purple-600", border: "border-purple-200", text: "text-purple-600", dot: "bg-purple-600", shadow: "shadow-purple-200", dark: "bg-purple-700" },
  5: { solid: "bg-slate-900", border: "border-slate-200", text: "text-slate-900", dot: "bg-slate-900", shadow: "shadow-slate-200", dark: "bg-black" },
  6: { solid: "bg-red-600", border: "border-red-200", text: "text-red-600", dot: "bg-red-600", shadow: "shadow-red-200", dark: "bg-red-700" },
};

const PHASE_DEFINITIONS = [
  {
    phaseNo: 1,
    title: "Approval Process",
    steps: [
      { id: "1.1", title: "Estimate Done" },
      { id: "1.2", title: "LOA Processing" },
      { id: "1.3", title: "LOA Revising" },
      { id: "1.4", title: "LOA Approved" },
      { id: "1.5", title: "Final Confirmation" },
    ],
  },
  {
    phaseNo: 2,
    title: "Parts Acquisition",
    steps: [
      { id: "2.1", title: "Parts Available" },
      { id: "2.2", title: "Parts Ordered" },
      { id: "2.3", title: "Partial Parts Received" },
      { id: "2.4", title: "Parts Complete" },
    ],
  },
  {
    phaseNo: 3,
    title: "Scheduling",
    steps: [
      { id: "3.1", title: "Waiting for Scheduling" },
      { id: "3.2", title: "Scheduled for Repair" },
    ],
  },
  {
    phaseNo: 4,
    title: "Repair",
    steps: [
      { id: "4.1", title: "Ongoing Body Repair" },
      { id: "4.2", title: "Ongoing Body Work" },
      { id: "4.3", title: "Ongoing Body Paint" },
      { id: "4.4", title: "Final Inspection" },
    ],
  },
];

const parsePhaseFromLabel = (phaseLabel = "") => {
  const stepMatch = phaseLabel.match(/([1-4]\.[1-5])/);
  const stepId = stepMatch ? stepMatch[1] : null;
  const phaseNo = stepId ? Number(stepId.split(".")[0]) : null;
  return { phaseNo, stepId };
};

const formatPhaseDate = (date = new Date()) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

// --- HELPER COMPONENTS ---
function StatusChip({ status }) {
  const styles = {
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ongoing: "bg-yellow-50 text-yellow-800 border-yellow-200",
    pending: "bg-slate-50 text-slate-500 border-slate-200"
  };
  const dotStyles = {
    complete: "bg-emerald-500",
    ongoing: "bg-yellow-500",
    pending: "bg-slate-300"
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[status] || styles.pending}`}>
      <span className={`w-2 h-2 rounded-full ${dotStyles[status] || dotStyles.pending}`} />
      {status}
    </span>
  );
}

function PhaseMetaPill({ isDone, doneDays }) {
  if (isDone) return (
    <span className="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-white/15 border border-white/20 text-white">
      DONE: {doneDays}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] bg-emerald-50/70 border border-emerald-200 text-emerald-800 animate-pulse">
      <span className="w-2 h-2 rounded-full bg-emerald-500" /> ACTIVE
    </span>
  );
}

function CurrentPill() {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
      <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "2.2s" }} /> Current
    </span>
  );
}

function SubtleTabButton({ icon, label, onClick, variant = "emerald" }) {
  const styles = {
    emerald: "bg-emerald-50/70 border-emerald-100 text-emerald-800 hover:bg-emerald-50",
    blue: "bg-blue-50/70 border-blue-100 text-blue-800 hover:bg-blue-50"
  };
  const iconStyles = {
    emerald: "text-emerald-700 border-emerald-100",
    blue: "text-blue-700 border-blue-100"
  };

  return (
    <button onClick={onClick} className={`group inline-flex items-center gap-3 h-11 px-4 rounded-2xl border shadow-sm hover:shadow-md transition-all ${styles[variant]}`}>
      <span className={`w-9 h-9 rounded-2xl bg-white border flex items-center justify-center ${iconStyles[variant]}`}>{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.25em]">{label}</span>
    </button>
  );
}

// --- OVERVIEW TAB COMPONENT ---
const OverviewTab = ({ job, isEditing, approvedCost, setApprovedCost, isPhase14Complete, policies, setPolicies }) => {
  const needsCostUpdate = isPhase14Complete && (!approvedCost || approvedCost === "0");
  
  const handleAddPolicy = () => {
    const newPolicy = prompt("Enter new Policy Number:");
    if (newPolicy) setPolicies([...policies, newPolicy]);
  };

  const handleRemovePolicy = (index) => {
    setPolicies(policies.filter((_, i) => i !== index));
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Job Overview</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Reference Information</p>
        </div>
        {needsCostUpdate && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-red-600 animate-bounce">
            <AlertCircle size={14} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase tracking-widest">Update Cost</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Car Specs */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] flex items-start gap-4">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600 shrink-0">
            <Car size={20} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Specs</p>
            <p className="text-lg font-black text-slate-900 leading-tight uppercase break-normal">
              2024 Montero Sport GT 4X4
            </p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Pearl White • 2.4L Diesel</p>
          </div>
        </div>

        {/* Insurance & Policy Management */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] flex items-start gap-4 min-h-[140px]">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm text-purple-600 shrink-0">
            <Building2 size={20} />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Insurance Provider</p>
              {isEditing && (
                <button onClick={handleAddPolicy} className="text-purple-600 hover:text-purple-800 transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </button>
              )}
            </div>
            <p className="text-lg font-black text-slate-900 leading-tight uppercase mb-2">Malayan Insurance</p>
            
            <div className="space-y-1">
              {policies.length > 0 ? (
                policies.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider italic">Policy: {p}</p>
                    {isEditing && (
                      <button onClick={() => handleRemovePolicy(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-bold text-slate-300 uppercase italic">No policies listed</p>
              )}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] flex items-start gap-4">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm text-emerald-600 shrink-0">
            <Calendar size={20} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Timeline</p>
            <p className="text-lg font-black text-slate-900 leading-tight uppercase">Created Jan 12, 2026</p>
            <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Est. Completion: Feb 05</p>
          </div>
        </div>

        {/* Financials */}
        <div className={`p-6 rounded-[2rem] flex items-start gap-4 transition-all duration-500 border-2 ${needsCostUpdate ? "bg-red-50 border-red-200 shadow-lg shadow-red-100/50" : "bg-white border-slate-100 shadow-sm"}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${needsCostUpdate ? "bg-red-500 text-white" : "bg-slate-900 text-white"}`}>
            <DollarSign size={20} />
          </div>
          <div className="flex-1">
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${needsCostUpdate ? "text-red-500" : "text-slate-400"}`}>Repair Costs</p>
            <div className="space-y-3">
              <div>
                <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Initial Estimate</span>
                <p className="text-base font-black text-slate-900">₱ 45,250.00</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[8px] font-black text-blue-600 uppercase block mb-1">Approved Repair Cost</span>
                {isEditing ? (
                  <div className="relative mt-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">₱</span>
                    <input 
                      type="text" 
                      value={approvedCost} 
                      onChange={(e) => setApprovedCost(e.target.value)}
                      className="w-full bg-white border border-blue-100 rounded-lg py-1 pl-5 pr-2 font-black text-xs focus:ring-2 focus:ring-blue-50 outline-none"
                    />
                  </div>
                ) : (
                  <p className={`text-lg font-black ${!approvedCost || approvedCost === "0" ? "text-slate-300 italic" : "text-blue-600"}`}>
                    {approvedCost && approvedCost !== "0" ? `₱ ${Number(approvedCost).toLocaleString('en-US', {minimumFractionDigits: 2})}` : "Not Set"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APPROVAL TAB COMPONENT ---
const ApprovalTab = ({ policies, approvedCost, phases }) => {
  const getLOAStatus = () => {
    const phase1 = phases.find(p => p.phaseNo === 1);
    if (!phase1) return "Pending";
    const steps = phase1.steps;
    if (steps.find(s => s.id === "1.4" && s.status === "complete")) return "Approved";
    if (steps.find(s => s.id === "1.3" && (s.status === "complete" || s.status === "ongoing"))) return "Revising";
    if (steps.find(s => s.id === "1.2" && (s.status === "complete" || s.status === "ongoing"))) return "Processing";
    return "Pending";
  };

  const loaStatus = getLOAStatus();

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Approval Summary</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Authorization & Verification</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center text-purple-600">
              <Building2 size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance Provider</p>
              <p className="text-2xl font-black text-slate-900 uppercase">Malayan Insurance</p>
              <div className="flex gap-2 mt-2">
                {policies.map((p, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-purple-100">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><DollarSign size={20} /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Approved Amount</p>
            </div>
            <p className="text-3xl font-black tracking-tight">
              ₱ {Number(approvedCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-medium text-blue-200 mt-2 uppercase italic tracking-widest">Synced with Overview</p>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><Send size={20} /></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current LOA Status</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black tracking-tight uppercase">{loaStatus}</p>
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                loaStatus === "Approved" ? "bg-emerald-400" : 
                loaStatus === "Revising" ? "bg-amber-400" : "bg-blue-400"
              }`} />
            </div>
            <p className="text-[10px] font-medium text-slate-500 mt-2 uppercase tracking-widest">Derived from Phase 1</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PARTS ORDER TAB COMPONENT (FITS DATES) ---
const PartsOrderTab = ({ parts, setParts, isEditing }) => {
  const addPart = () => {
    const partNo = prompt("Part Number:");
    const desc = prompt("Description:");
    if (partNo && desc) {
      setParts([...parts, {
        id: Date.now(),
        partNo: partNo.toUpperCase(),
        description: desc,
        status: "Ordered",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }]);
    }
  };

  const toggleStatus = (id) => {
    setParts(parts.map(p => {
      if (p.id === id) {
        const newStatus = p.status === "Ordered" ? "Delivered" : "Ordered";
        return { 
          ...p, 
          status: newStatus,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
        };
      }
      return p;
    }));
  };

  const removePart = (id) => setParts(parts.filter(p => p.id !== id));

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Parts Ledger</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Inventory & Procurement Tracking</p>
        </div>
        {isEditing && (
          <button onClick={addPart} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-all">
            <Plus size={14} strokeWidth={3} /> Add Part
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/4">Part No.</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] w-1/3">Description</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                {isEditing && <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parts.length > 0 ? parts.map((part) => (
                <tr key={part.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-blue-600 tracking-wider font-mono bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                      {part.partNo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-slate-700 uppercase leading-tight max-w-[180px] truncate group-hover:whitespace-normal">
                      {part.description}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      disabled={!isEditing}
                      onClick={() => toggleStatus(part.id)}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${
                        part.status === "Delivered" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}
                    >
                      {part.status === "Delivered" ? <CheckCircle2 size={10} /> : <Truck size={10} />}
                      {part.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={10} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{part.date}</span>
                    </div>
                  </td>
                  {isEditing && (
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removePart(part.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isEditing ? 5 : 4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <Box size={32} />
                      <p className="text-[9px] font-black uppercase tracking-widest">No parts in ledger</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- SCHEDULING TAB (NEW ADDITION) ---
const SchedulingTab = ({ isEditing, scheduleStatus, setScheduleStatus }) => {
  const [notes, setNotes] = useState([
    { id: 1, date: "Jan 12, 10:00 AM", text: "Unit added to scheduling queue." },
    { id: 2, date: "Jan 13, 08:30 AM", text: "Technician assigned to Bay 3." }
  ]);

  const addNote = () => {
    const text = prompt("Enter production note:");
    if (text) setNotes([{ id: Date.now(), date: new Date().toLocaleString(), text }, ...notes]);
  };

  const options = [
    { id: "Scheduled", icon: <Calendar size={20} />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { id: "In Repair", icon: <RefreshCw size={20} />, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
    { id: "Done", icon: <CheckCircle2 size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Production Status</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Calendar Synchronization</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {options.map((opt) => (
          <button
            key={opt.id}
            disabled={!isEditing}
            onClick={() => setScheduleStatus(opt.id)}
            className={`flex flex-col items-center p-8 rounded-[2.5rem] border-2 transition-all ${
              scheduleStatus === opt.id ? `${opt.bg} ${opt.border} ${opt.color} shadow-xl scale-105` : "bg-white border-slate-100 text-slate-300"
            }`}
          >
            <div className={`mb-3 ${scheduleStatus === opt.id && opt.id === "In Repair" ? "animate-spin" : ""}`}>{opt.icon}</div>
            <span className="text-[10px] font-black uppercase tracking-widest">{opt.id}</span>
          </button>
        ))}
      </div>

      <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-8">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Production Notes</h4>
          {isEditing && (
            <button onClick={addNote} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase hover:bg-slate-100">
                + Add Note
            </button>
          )}
        </div>
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[8px] font-black text-blue-600 uppercase block mb-1">{n.date}</span>
              <p className="text-[11px] font-bold text-slate-700 uppercase">{n.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------- BILLING TAB (ADDED) -------------------- */
const BillingTab = ({ isEditing, billingStatus, setBillingStatus, scheduleStatus }) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Billing</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Receivables & Payment Status</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm max-w-xl">
        {/* --- BILLING & OVERDUE ALERT --- */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-black text-slate-400 uppercase">Billing Status</span>
            {/* Overdue logic: Pending + Schedule Status is "Done" */}
            {billingStatus === "Pending" && scheduleStatus === "Done" && (
              <div className="flex items-center gap-1 text-red-600 animate-pulse bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                <AlertCircle size={10} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-wider">Overdue</span>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setBillingStatus("Pending")}
                className={`flex-1 py-1 rounded text-[9px] font-black uppercase border transition-all ${
                  billingStatus === "Pending"
                    ? "bg-slate-800 text-white border-slate-900"
                    : "bg-white text-slate-300 border-slate-100 hover:border-slate-300"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setBillingStatus("Paid")}
                className={`flex-1 py-1 rounded text-[9px] font-black uppercase border transition-all ${
                  billingStatus === "Paid"
                    ? "bg-emerald-500 text-white border-emerald-600"
                    : "bg-white text-slate-300 border-slate-100 hover:border-emerald-200"
                }`}
              >
                Paid
              </button>
            </div>
          ) : (
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border w-full justify-center ${
                billingStatus === "Paid"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-slate-50 border-slate-100 text-slate-500"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${billingStatus === "Paid" ? "bg-emerald-500" : "bg-slate-400"}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{billingStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- PROCESS TREE COMPONENTS ---
const ProcessTree = ({
  onAddNote,
  currentPhaseNo,
  currentStepId,
  isEditing,
  phases,
  onStartPhase,
  onCompleteSubphase,
}) => {
  const [expanded, setExpanded] = useState({ 1: false, 2: true });
  const togglePhase = (phaseNo) => setExpanded((p) => ({ ...p, [phaseNo]: !p[phaseNo] }));

  return (
    <div className="relative pl-16">
      <div className="absolute left-[24px] top-0 bottom-0 w-[2px] bg-slate-100" />
      <div className="space-y-16">
        {phases.map((phase) => {
          const theme = PHASE_THEME[phase.phaseNo] || PHASE_THEME[1];
          const isCurrentPhase = phase.phaseNo === currentPhaseNo;

          return (
            <div key={phase.phaseNo} className="relative">
              <div className={`absolute left-[16px] top-9 w-4 h-4 rounded-full border-4 border-white shadow-lg z-20 ${isCurrentPhase ? theme.dot : "bg-slate-200"}`} />
              
              <div className="ml-16 flex items-start gap-4">
                <PhaseCard phase={phase} theme={theme} isCurrent={isCurrentPhase} />
                <div className="pt-3 space-y-3">
                  <SubtleTabButton icon={<StickyNote size={16} strokeWidth={2.5} />} label="Add Note" onClick={onAddNote} />
                  <SubtleTabButton icon={expanded[phase.phaseNo] ? <ChevronUp size={16} /> : <ChevronDown size={16} />} label={expanded[phase.phaseNo] ? "Hide" : "View"} onClick={() => togglePhase(phase.phaseNo)} />
                  {phase.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => onStartPhase?.(phase.phaseNo)}
                      className="inline-flex items-center gap-3 h-11 px-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-50 shadow-sm hover:shadow-md transition-all"
                    >
                      <span className="w-9 h-9 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700">
                        <Plus size={16} />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em]">Start Phase</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="ml-16 mt-7 space-y-4">
                {expanded[phase.phaseNo] && phase.steps.map((s) => (
                    <div key={s.id} className="flex items-start gap-4">
                      <div className="relative w-10 shrink-0">
                        <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200" />
                      </div>
                      <SubPhaseCard
                        phaseNo={phase.phaseNo}
                        step={s}
                        isCurrent={isCurrentPhase && s.id === currentStepId}
                        onComplete={() => onCompleteSubphase?.(s.id)}
                      />
                    </div>
                ))}
                
                {isCurrentPhase && (
                  <button className="flex items-center gap-2 ml-14 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <Plus size={14} /> Add Subphase
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button className="flex items-center gap-3 ml-16 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
          <Plus size={18} /> Add Next Phase
        </button>
      </div>
    </div>
  );
};

const PhaseCard = ({ phase, theme, isCurrent }) => {
  const isDone = phase.status === "complete";
  const isPhase1 = phase.phaseNo === 1;
  const base = isPhase1 ? `${theme.solid} text-white shadow-2xl ${theme.shadow}` : `bg-white border-2 ${theme.border} text-slate-900 shadow-lg`;

  return (
    <div className={`relative w-full max-w-[360px] rounded-[2.8rem] px-8 py-7 ${base}`}>
      <div className="absolute right-6 top-6"><PhaseMetaPill isDone={isDone} doneDays={phase.doneDays} /></div>
      <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${isPhase1 ? "text-white/70" : theme.text}`}>PHASE {phase.phaseNo}</span>
      <p className={`mt-3 text-[28px] leading-[1.05] font-black uppercase tracking-tight ${isPhase1 ? "text-white" : "text-slate-900"}`}>{phase.title}</p>
      <div className="mt-7 flex items-center justify-between gap-6">
        <StatusChip status={isDone ? "complete" : phase.status === "ongoing" ? "ongoing" : "pending"} />
        {isCurrent && <CurrentPill />}
      </div>
      <div className="mt-6">
        <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${isPhase1 ? "text-white/70" : "text-slate-400"}`}>Phase Notes</p>
        <textarea
          rows={2}
          placeholder="Add notes..."
          className={`mt-2 w-full rounded-xl px-3 py-2 text-[11px] font-bold ${isPhase1 ? "bg-white/15 text-white placeholder:text-white/60 border border-white/20" : "bg-slate-50 text-slate-700 placeholder:text-slate-400 border border-slate-100"}`}
        />
      </div>
    </div>
  );
};

const SubPhaseCard = ({ phaseNo, step, isCurrent, onComplete }) => {
  const isDone = step.status === "complete";
  const isOngoing = step.status === "ongoing";

  return (
    <div className={`group relative flex-1 bg-white rounded-[2rem] border shadow-sm px-6 py-5 ${isCurrent ? "border-yellow-200 shadow-yellow-100 bg-yellow-50/25" : "border-slate-100"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isOngoing ? "bg-yellow-50 text-yellow-800 border-yellow-200" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
            {isDone ? <CheckCircle2 size={18} /> : isOngoing ? <RefreshCw size={16} className="animate-spin" /> : <span className="text-[11px] font-black">{step.id.split(".")[1]}</span>}
          </div>
          <div>
            <p className="text-[12px] font-black uppercase tracking-widest text-slate-900">PHASE {step.id} {step.title}</p>
            <div className="mt-3 flex gap-8">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Started</p>
                <p className="text-[12px] font-bold text-slate-800">{step.started ?? "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Completed</p>
                <p className="text-[12px] font-bold text-slate-800">{step.completed ?? "—"}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Subphase Notes</p>
              <textarea
                rows={2}
                placeholder="Add notes..."
                className="w-full rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step.note && (
            <div className="relative">
              <div className="p-2 text-slate-300 group-hover:text-blue-500 transition-colors cursor-help">
                <StickyNote size={18} />
              </div>
              <div className="absolute right-0 bottom-full mb-3 w-48 p-3 bg-slate-900 text-white text-[10px] font-bold leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-50 transform translate-y-2 group-hover:translate-y-0">
                {step.note}
                <div className="absolute top-full right-3 border-8 border-transparent border-t-slate-900" />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onComplete}
            className={`p-2 rounded-xl border transition-colors ${isDone ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-white border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200"}`}
            title="Mark complete"
          >
            <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN MODAL COMPONENT ---
export default function JobDetailModal({ isOpen, onClose, job, onUpdatePhase }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isEditing, setIsEditing] = useState(false);
  const [approvedCost, setApprovedCost] = useState("0");
  const [policies, setPolicies] = useState(["PN-88219-B"]);
  const [scheduleStatus, setScheduleStatus] = useState("In Repair"); // Added Schedule State

  /* --------- BILLING STATE (ADDED) --------- */
  const [billingStatus, setBillingStatus] = useState("Pending");

  const [parts, setParts] = useState([
    { id: 1, partNo: "MS-2024-FR-01", description: "Front Bumper Assembly", status: "Delivered", date: "Jan 10" },
    { id: 2, partNo: "MS-2024-HL-02", description: "Right LED Headlight", status: "Ordered", date: "Jan 11" },
    { id: 3, partNo: "MH-2000-456", description: "Windshield", status: "Ordered", date: "Jan 12" }
  ]);

  const [phaseDatesByJob, setPhaseDatesByJob] = useState({});
  
  const { phaseNo: currentPhaseNo, stepId: currentStepId } = useMemo(
    () => parsePhaseFromLabel(job?.phase),
    [job]
  );

  useEffect(() => {
    if (!job?.id) return;
    setPhaseDatesByJob((prev) => prev[job.id] ? prev : { ...prev, [job.id]: {} });
  }, [job?.id]);

  const phaseDates = job?.id ? phaseDatesByJob[job.id] || {} : {};
  const updatePhaseDates = (updater) => {
    if (!job?.id) return;
    setPhaseDatesByJob((prev) => ({
      ...prev,
      [job.id]: updater(prev[job.id] || {}),
    }));
  };

  useEffect(() => {
    if (!job?.id || !currentStepId) return;
    if (phaseDates[currentStepId]?.started) return;
    updatePhaseDates((prev) => ({
      ...prev,
      [currentStepId]: {
        ...prev[currentStepId],
        started: formatPhaseDate(),
      },
    }));
  }, [job?.id, currentStepId, phaseDates]);

  const phases = useMemo(() => {
    return PHASE_DEFINITIONS.map((phase) => {
      const steps = phase.steps.map((step) => {
        const dates = phaseDates[step.id] || {};
        let status = "pending";
        if (dates.completed) status = "complete";
        else if (dates.started) status = "ongoing";
        else if (step.id === currentStepId) status = "ongoing";
        return {
          ...step,
          status,
          started: dates.started,
          completed: dates.completed,
        };
      });

      const hasStarted = steps.some((step) => step.status !== "pending");
      const allComplete = steps.every((step) => step.status === "complete");
      const phaseStatus = allComplete ? "complete" : hasStarted ? "ongoing" : "pending";

      return {
        ...phase,
        status: phaseStatus,
        doneDays: phaseStatus === "complete" ? "—" : "",
        steps,
      };
    });
  }, [currentPhaseNo, currentStepId, phaseDates]);

  const handleStartPhase = (phaseNo) => {
    const phase = PHASE_DEFINITIONS.find((p) => p.phaseNo === phaseNo);
    const step = phase?.steps?.[0];
    if (!step || !job) return;
    updatePhaseDates((prev) => ({
      ...prev,
      [step.id]: {
        ...prev[step.id],
        started: prev[step.id]?.started || formatPhaseDate(),
      },
    }));
    onUpdatePhase?.(job.id, `PHASE ${step.id} ${step.title}`);
  };

  const handleCompleteSubphase = (stepId) => {
    if (!job || !stepId) return;
    const phaseIndex = PHASE_DEFINITIONS.findIndex((phase) =>
      phase.steps.some((step) => step.id === stepId)
    );
    if (phaseIndex === -1) return;
    const phase = PHASE_DEFINITIONS[phaseIndex];
    const stepIndex = phase.steps.findIndex((step) => step.id === stepId);
    const nextStep =
      phase.steps[stepIndex + 1] ||
      PHASE_DEFINITIONS[phaseIndex + 1]?.steps?.[0];

    updatePhaseDates((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        started: prev[stepId]?.started || formatPhaseDate(),
        completed: formatPhaseDate(),
      },
      ...(nextStep
        ? {
            [nextStep.id]: {
              ...prev[nextStep.id],
              started: prev[nextStep.id]?.started || formatPhaseDate(),
            },
          }
        : {}),
    }));

    if (stepId === currentStepId && nextStep) {
      onUpdatePhase?.(job.id, `PHASE ${nextStep.id} ${nextStep.title}`);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-7xl h-[90vh] flex flex-col animate-in zoom-in duration-300">
        <div className="w-72 h-12 bg-white rounded-t-[2.5rem] px-10 flex items-center shadow-[-10px_-10px_30px_rgba(0,0,0,0.05)]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Bark Tracker</span>
        </div>

        <div className="bg-white flex-1 rounded-[3.5rem] rounded-tl-none shadow-2xl flex flex-col overflow-hidden border border-white">
          <div className="px-12 py-10 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-200">
                <Package size={38} />
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{job.customerName}</h2>
                <div className="mt-1 flex flex-col">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{job.jobType}</p>
                  <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.2em] mt-0.5">Plate Number: YC-2982</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <div className="text-right">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Total Days Active</p>
                <div className="flex items-center justify-end gap-2 text-slate-900 font-black">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-xl">{job.phaseTime}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`group relative flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
                  isEditing ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-900 text-white hover:bg-blue-600"
                }`}
              >
                {isEditing ? <Check size={16} /> : <Edit3 size={16} />}
                {isEditing ? "Save Changes" : "Edit Repair Job"}
              </button>

              <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all text-slate-400">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="px-12 flex gap-4 shrink-0">
            {["Overview", "Approval Process", "Parts Order", "Scheduling and Repair", "Billing"].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-4 rounded-t-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>{t}</button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden flex bg-white border-t border-slate-100">
            <div className="w-1/2 border-r border-slate-50 p-10 overflow-y-auto overflow-x-visible bg-slate-50/20">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Process Dynamics</h4>
              <ProcessTree 
                onAddNote={() => {}} 
                currentPhaseNo={currentPhaseNo} 
                currentStepId={currentStepId} 
                isEditing={isEditing} 
                phases={phases} 
                onStartPhase={handleStartPhase}
                onCompleteSubphase={handleCompleteSubphase}
              />
            </div>
            
            <div className="flex-1 p-10 overflow-y-auto">
              {activeTab === "Overview" && (
                <OverviewTab
                  job={job}
                  isEditing={isEditing}
                  approvedCost={approvedCost}
                  setApprovedCost={setApprovedCost}
                  isPhase14Complete={true}
                  policies={policies}
                  setPolicies={setPolicies}
                />
              )}
              
              {activeTab === "Approval Process" && <ApprovalTab policies={policies} approvedCost={approvedCost} phases={phases} />}
              
              {activeTab === "Parts Order" && <PartsOrderTab parts={parts} setParts={setParts} isEditing={isEditing} />}
              
              {activeTab === "Scheduling and Repair" && (
                <SchedulingTab
                  isEditing={isEditing}
                  scheduleStatus={scheduleStatus}
                  setScheduleStatus={setScheduleStatus}
                />
              )}
              
              {activeTab === "Billing" && (
                <BillingTab
                  isEditing={isEditing}
                  billingStatus={billingStatus}
                  setBillingStatus={setBillingStatus}
                  scheduleStatus={scheduleStatus}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
