import BarkSidebar from '../components/BarkSidebar';
import JobCard from '../components/JobCard';


const BarkDashboard =() => {
    return(
        <div className="flex h-screen bg-bark-surface">
            {/* BARK PURPLE SIDEBAR */}
            <BarkSidebar />

            {/* BARK MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between mb-8">
            <div>
                <h1 className="text-2xl font-bold">Customer Tracker</h1>
                <p className="text-gray-500">Monitor and manage all customer jobs in real-time</p>
            </div>
            {/* Search and New Customer button go here */}
        </header>
        
        {/* Stats and Active Jobs Grid HERE */}
      </div>
    </div>
  );
};
