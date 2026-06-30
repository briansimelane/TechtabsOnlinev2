import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { Users, Server, BookOpen, Activity, UserPlus, Clock } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { classes, facilitators } = useSimulation();

  // Aggregate stats
  const totalStudents = classes.reduce((acc, c) => acc + (c.teams.length * 5), 0); // Assuming ~5 students per team
  const activeClasses = classes.filter(c => c.currentPeriod > 0).length;
  
  const stats = [
    { label: 'Total Facilitators', value: facilitators.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Classes', value: activeClasses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Est. Students', value: totalStudents, icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'System Load', value: 'Low', icon: Server, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Console</h1>
        <p className="text-slate-500 mt-1">System overview and health metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-slate-400" />
             Recent System Activity
          </h3>
          <div className="space-y-4">
             {[1, 2, 3].map((_, i) => (
               <div key={i} className="flex items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                 <div className="bg-slate-100 p-2 rounded-full mr-4">
                   <Clock size={16} className="text-slate-500" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-slate-800">New class "MBA Cohort B" created</p>
                   <p className="text-xs text-slate-500 mt-0.5">By Facilitator Sarah Smith • 2 hours ago</p>
                 </div>
               </div>
             ))}
             <div className="flex items-start">
                 <div className="bg-slate-100 p-2 rounded-full mr-4">
                   <UserPlus size={16} className="text-slate-500" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-slate-800">New facilitator account registered</p>
                   <p className="text-xs text-slate-500 mt-0.5">Admin Action • 5 hours ago</p>
                 </div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
           <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
           <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-left">
                  <UserPlus className="mb-2 text-blue-600" size={24} />
                  <div className="font-semibold text-slate-800">Add Facilitator</div>
                  <div className="text-xs text-slate-500 mt-1">Create new staff account</div>
              </button>
              <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-left">
                  <BookOpen className="mb-2 text-emerald-600" size={24} />
                  <div className="font-semibold text-slate-800">Manage Classes</div>
                  <div className="text-xs text-slate-500 mt-1">View all global instances</div>
              </button>
              <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-left">
                  <Server className="mb-2 text-indigo-600" size={24} />
                  <div className="font-semibold text-slate-800">System Logs</div>
                  <div className="text-xs text-slate-500 mt-1">Audit trail & errors</div>
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;