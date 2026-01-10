import { useState } from 'react';
import { Plus, Search, Bell, Filter } from 'lucide-react';
import BarkSidebar from '@/modules/bark/components/BarkSidebar';
import JobCard from '@/modules/bark/components/JobCard';
import NewCustomerModal from '@/modules/bark/components/NewCustomerModal';
import JobDetailModal from '@/modules/bark/components/JobDetailModal';
import BayScheduler from '@/modules/bark/components/BayScheduler';

// --- MOCK DATA ---
const JOBS = [
  { id: 1, customerName: 'Martin Lazaro', jobType: 'Montero Right Panel Repair', phase: 'PHASE 1.1 LOA Processing', phaseTime: '4d', status: 'Active', startDate: 'January 2, 2026', insurance: 'Malayaan Insurance', priority: 'High', plate: 'YC-2982', car: 'Montero Sport' },
  { id: 2, customerName: 'Kristine Lazaro', jobType: 'Mirage G4 Bumper Replacement', phase: 'PHASE 2.3 Material Procurement', phaseTime: '9d', status: 'Waiting', startDate: 'December 28, 2025', insurance: 'Western Guaranty Corporation', priority: 'Normal', plate: 'ABC-123', car: 'Mirage G4' },
  { id: 3, customerName: 'Covy Lazaro', jobType: 'Covy Rear and Front Bumper Repair', phase: 'PHASE 3.1 Installation & Repairs', phaseTime: '22d', status: 'Active', startDate: 'December 15, 2025', insurance: 'Prudential Guarantee', priority: 'High', plate: 'XYZ-999', car: 'Bumper Repair' },
];

const BarkDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const schedulerJobs = JOBS.map((job) => ({
    id: job.id,
    customerName: job.customerName,
    carModel: job.car,
    plateNumber: job.plate,
    repairType: job.jobType,
    status: job.status,
  }));

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      {/* Sidebar handles the view switching */}
      <BarkSidebar onNavigate={(view) => setCurrentView(view)} activeView={currentView} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP SEARCH/NOTIF BAR */}
        <div className="h-20 border-b border-slate-100 bg-white flex items-center justify-between px-10 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search customers, jobs..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/10 text-sm"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-10 h-10 bg-indigo-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-sm">
              ML
            </div>
          </div>
        </div>

        {/* CONDITIONALLY RENDER VIEWS */}
        {currentView === 'dashboard' ? (
          <div className="flex-1 overflow-y-auto p-10">
            <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Tracker</h1>
                <p className="text-slate-500 font-medium mt-1">Monitor and manage all customer jobs in real-time</p>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                  <Filter size={16} /> Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-[#7C3AED] transition-all active:scale-95"
                >
                  <Plus size={20} /> New Job
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
               <StatCard label="Total Customers" value="6" trend="+ 12% this month" />
               <StatCard label="In Progress" value="5" trend="+ 3 new this week" />
               <StatCard label="Completed" value="1" trend="+ 2 this week" />
               <StatCard label="High Priority" value="3" trend="+ 1 added today" highlight />
            </div>

            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              Active Jobs <span className="text-sm font-bold text-slate-400">({JOBS.length})</span>
            </h2>

            <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
              {JOBS.map((job) => (
                <JobCard key={job.id} {...job} onClick={() => setSelectedJob(job)} />
              ))}
            </section>
          </div>
        ) : (
          <BayScheduler jobs={schedulerJobs} />
        )}
      </main>

      {/* MODALS */}
      <NewCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <JobDetailModal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} job={selectedJob} />
    </div>
  );
};

const StatCard = ({ label, value, trend, highlight = false }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-black text-slate-900">{value}</span>
      <span className={`text-[10px] font-bold ${highlight ? 'text-red-500' : 'text-emerald-500'}`}>{trend}</span>
    </div>
  </div>
);

export default BarkDashboard;
