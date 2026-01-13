import BarkSidebar from "../components/BarkSidebar";
import JobCard from "../components/JobCard";
import { SchedulingTab } from "@/modules/bark/components/SchedulingTab";


const BarkDashboard = () => {
  return (
    <div className="flex h-screen bg-bark-surface">
      <BarkSidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Customer Tracker</h1>
            <p className="text-gray-500">
              Monitor and manage all customer jobs in real-time
            </p>
          </div>
        </header>

        <SchedulingTab />
      </div>
    </div>
  );
};

export default BarkDashboard;
