import { useState } from 'react';
import { X, ChevronRight, Upload, Plus, Trash2, Printer, CheckCircle } from 'lucide-react';
import JobCard from '@/modules/bark/components/JobCard';

const NewCustomerModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    customerName: '', phone: '', email: '',
    carMake: '', carModel: '', carColor: '', plateNumber: '',
    // Step 2
    insurance: '', phase: 'Estimate Done', status: 'Active', media: null, jobNotes: '',
    // Step 3
    estimateAmount: 0,
    estimateRows: [{ id: 1, description: '', partCost: 0, laborCost: 0 }],
    estimateNotes: ''
  });

  if (!isOpen) return null;

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // --- RENDER STEPS ---
  const renderStep = () => {
    switch (step) {
      case 1: return <Step1CustomerVehicle data={formData} onChange={handleChange} />;
      case 2: return <Step2JobInfo data={formData} onChange={handleChange} />;
      case 3: return <Step3Estimate data={formData} setData={setFormData} />;
      case 4: return <Step4Review data={formData} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-4xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header with Progress */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Repair Job</h2>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400 mt-1">
              <span className={step >= 1 ? 'text-indigo-600' : ''}>Customer</span>
              <ChevronRight size={14} />
              <span className={step >= 2 ? 'text-indigo-600' : ''}>Job Details</span>
              <ChevronRight size={14} />
              <span className={step >= 3 ? 'text-indigo-600' : ''}>Estimate</span>
              <ChevronRight size={14} />
              <span className={step >= 4 ? 'text-indigo-600' : ''}>Review</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB]">
          {renderStep()}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-between items-center">
          {step > 1 ? (
            <button onClick={prevStep} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
              Back
            </button>
          ) : (
            <div></div> /* Spacer */
          )}

          {step < 4 ? (
            <button onClick={nextStep} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-2">
              Next Step <ChevronRight size={18} />
            </button>
          ) : (
            <button onClick={() => alert('Submitting to Django...')} className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:scale-105 transition-all flex items-center gap-2">
              Create Job <CheckCircle size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

// STEP 1: Customer & Vehicle
const Step1CustomerVehicle = ({ data, onChange }) => (
  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
    {/* Section 1: Customer */}
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</span>
        Customer Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputGroup label="Full Name" name="customerName" value={data.customerName} onChange={onChange} placeholder="Search MODU Customers..." isSearch />
        <InputGroup label="Phone Number" name="phone" value={data.phone} onChange={onChange} placeholder="(555) 000-0000" />
        <InputGroup label="Email Address" name="email" value={data.email} onChange={onChange} placeholder="client@email.com" />
      </div>
    </div>

    {/* Section 2: Vehicle */}
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</span>
        Vehicle Details
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputGroup label="Make" name="carMake" value={data.carMake} onChange={onChange} placeholder="Tesla" />
        <InputGroup label="Model" name="carModel" value={data.carModel} onChange={onChange} placeholder="Model Y" />
        <InputGroup label="Color" name="carColor" value={data.carColor} onChange={onChange} placeholder="Midnight Silver" />
        <InputGroup label="Plate #" name="plateNumber" value={data.plateNumber} onChange={onChange} placeholder="ABC123" />
      </div>
    </div>
  </div>
);

// STEP 2: Job Details
const Step2JobInfo = ({ data, onChange }) => (
  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Job Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Insurance</label>
          <select
            name="insurance"
            value={data.insurance}
            onChange={onChange}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
          >
            <option value="">Select Insurance</option>
            <option value="GEICO">GEICO</option>
            <option value="State Farm">State Farm</option>
            <option value="Progressive">Progressive</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Phase</label>
          <select
            name="phase"
            value={data.phase}
            onChange={onChange}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
          >
            <option>Estimate Done</option>
            <option>LOA Processing</option>
            <option>Repairing</option>
            <option>Ready for Pickup</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
          <select
            name="status"
            value={data.status}
            onChange={onChange}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"
          >
            <option>Active</option>
            <option>Waiting</option>
            <option>Complete</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Media Upload (Optional)</label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 bg-slate-50 cursor-pointer">
            <Upload size={32} className="mb-2" />
            <p className="text-sm">Click to upload files</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Job Notes</label>
        <textarea
          name="jobNotes"
          value={data.jobNotes}
          onChange={onChange}
          className="w-full min-h-[120px] px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none resize-none"
          placeholder="Add notes about the job..."
        />
      </div>
    </div>
  </div>
);

// STEP 3: Estimate
const Step3Estimate = ({ data, setData }) => {
  const addRow = () => {
    const newRow = { id: Date.now(), description: '', partCost: 0, laborCost: 0 };
    setData(prev => ({ ...prev, estimateRows: [...prev.estimateRows, newRow] }));
  };

  const updateRow = (id, key, value) => {
    setData(prev => ({
      ...prev,
      estimateRows: prev.estimateRows.map(row => row.id === id ? { ...row, [key]: value } : row)
    }));
  };

  const removeRow = (id) => {
    setData(prev => ({
      ...prev,
      estimateRows: prev.estimateRows.filter(row => row.id !== id)
    }));
  };

  const total = data.estimateRows.reduce((acc, row) => acc + Number(row.partCost) + Number(row.laborCost), 0);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Estimate Breakdown</h3>
        <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <Printer size={16} /> Print Estimate
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
        <span className="col-span-6">Description</span>
        <span className="col-span-2 text-right">Parts</span>
        <span className="col-span-2 text-right">Labor</span>
        <span className="col-span-2 text-center">Action</span>
      </div>

      <div className="space-y-4">
        {data.estimateRows.map((row) => (
          <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-6">
              <input
                type="text"
                placeholder="Item Description"
                value={row.description}
                onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                placeholder="0.00"
                value={row.partCost}
                onChange={(e) => updateRow(row.id, 'partCost', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none text-right font-mono"
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                placeholder="0.00"
                value={row.laborCost}
                onChange={(e) => updateRow(row.id, 'laborCost', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none text-right font-mono"
              />
            </div>
            <div className="col-span-2 flex justify-center">
              <button onClick={() => removeRow(row.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline mb-8">
        <Plus size={16} /> Add Line Item
      </button>

      <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-100">
        <span className="text-slate-400 font-bold">Total Estimate</span>
        <span className="text-3xl font-black text-slate-900">Php{total.toFixed(2)}</span>
      </div>
    </div>
  );
};

// STEP 4: Review
const Step4Review = ({ data }) => (
  <div className="flex flex-col items-center justify-center animate-in slide-in-from-right-4 duration-300">
    <h3 className="text-2xl font-bold text-slate-900 mb-2">Review New Job Card</h3>
    <p className="text-slate-500 mb-8">This is how the job will appear in the dashboard.</p>

    <div className="w-full max-w-md pointer-events-none">
      <JobCard
        customerName={data.customerName || 'New Customer'}
        phase={data.phase}
        status={data.status}
        daysActive="0"
      />
    </div>

    <div className="mt-8 grid grid-cols-2 gap-8 text-sm text-slate-500 w-full max-w-2xl bg-white p-6 rounded-2xl border border-slate-100">
      <div>
        <p className="font-bold text-slate-900">Vehicle</p>
        <p>{data.carColor} {data.carMake} {data.carModel}</p>
        <p className="uppercase tracking-wider text-xs mt-1">{data.plateNumber}</p>
      </div>
      <div>
        <p className="font-bold text-slate-900">Financials</p>
        <p>Insurance: {data.insurance}</p>
        <p>Total Estimate: <span className="text-emerald-600 font-bold">${data.estimateRows.reduce((a, b) => a + Number(b.partCost) + Number(b.laborCost), 0).toFixed(2)}</span></p>
      </div>
    </div>
  </div>
);

// Helper for Inputs
const InputGroup = ({ label, name, value, onChange, placeholder, isSearch }) => (
  <div className="relative">
    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{label}</label>
    <div className="relative">
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 placeholder:text-slate-300 transition-all"
        placeholder={placeholder}
      />
      {isSearch && value.length > 0 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded-md text-[10px] font-bold text-indigo-600 shadow-sm border border-indigo-100">
          MODU LINKED
        </div>
      )}
    </div>
  </div>
);

export default NewCustomerModal;
