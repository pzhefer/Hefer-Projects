import {
  FolderKanban,
  Calendar,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Users,
  ShieldAlert,
  FileText,
  Package,
  Wrench,
  TrendingDown,
  Shield,
  Activity,
  BarChart3,
  Bell,
  FileCheck,
  Briefcase,
  Truck,
  HardHat
} from 'lucide-react';
import { useState } from 'react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('active');

  const stats = [
    {
      name: 'Active Projects',
      value: '12',
      change: '+2 from last month',
      trend: 'up',
      icon: FolderKanban,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      name: 'Open RFIs',
      value: '28',
      change: '8 overdue',
      trend: 'down',
      icon: ClipboardCheck,
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      name: 'Pending Inspections',
      value: '15',
      change: '5 this week',
      trend: 'up',
      icon: CheckCircle,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      name: 'Open Snags',
      value: '47',
      change: '12 critical',
      trend: 'down',
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      name: 'Safety Score',
      value: '94%',
      change: '+3% this month',
      trend: 'up',
      icon: Shield,
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      name: 'Budget Status',
      value: '$2.4M',
      change: '2% under budget',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-cyan-500',
      bgLight: 'bg-cyan-50',
      textColor: 'text-cyan-600'
    },
    {
      name: 'Overdue Tasks',
      value: '23',
      change: '6 high priority',
      trend: 'down',
      icon: AlertCircle,
      color: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    {
      name: 'Team Utilization',
      value: '87%',
      change: 'Optimal level',
      trend: 'stable',
      icon: Users,
      color: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
  ];

  const priorityAlerts = [
    {
      type: 'critical',
      title: 'Safety Incident Requires Investigation',
      description: 'Minor injury reported at Office Building A - Level 3',
      time: '15 min ago',
      action: 'Review Incident',
      icon: ShieldAlert,
      color: 'bg-red-50 border-red-200 text-red-800'
    },
    {
      type: 'high',
      title: 'Change Order Awaiting Approval',
      description: 'CO-2024-045 - $45,000 MEP modifications',
      time: '2 hours ago',
      action: 'Review & Approve',
      icon: FileCheck,
      color: 'bg-amber-50 border-amber-200 text-amber-800'
    },
    {
      type: 'medium',
      title: 'Submittal Deadline Approaching',
      description: '3 submittals due for Retail Complex B in 2 days',
      time: '4 hours ago',
      action: 'View Submittals',
      icon: FileText,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    },
  ];

  const projects = {
    active: [
      {
        name: 'Office Building A',
        progress: 75,
        status: 'On Track',
        statusColor: 'text-green-600',
        bgColor: 'bg-green-50',
        dueDate: '2025-12-15',
        budget: '$2.4M',
        team: 24,
        health: 'good'
      },
      {
        name: 'Warehouse Extension',
        progress: 90,
        status: 'On Track',
        statusColor: 'text-green-600',
        bgColor: 'bg-green-50',
        dueDate: '2025-11-30',
        budget: '$1.8M',
        team: 18,
        health: 'good'
      },
      {
        name: 'Residential Tower',
        progress: 30,
        status: 'On Schedule',
        statusColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        dueDate: '2026-06-10',
        budget: '$8.5M',
        team: 45,
        health: 'good'
      },
    ],
    atRisk: [
      {
        name: 'Retail Complex B',
        progress: 45,
        status: 'Delayed',
        statusColor: 'text-red-600',
        bgColor: 'bg-red-50',
        dueDate: '2026-03-20',
        budget: '$3.2M',
        team: 32,
        health: 'poor',
        issues: ['Schedule delay', 'Budget overrun']
      },
    ],
    milestones: [
      {
        name: 'Office Building A - MEP Rough-in Complete',
        date: '2025-10-12',
        status: 'Upcoming',
        project: 'Office Building A'
      },
      {
        name: 'Warehouse Extension - Final Inspection',
        date: '2025-10-15',
        status: 'Upcoming',
        project: 'Warehouse Extension'
      },
      {
        name: 'Retail Complex B - Foundation Pour',
        date: '2025-10-20',
        status: 'At Risk',
        project: 'Retail Complex B'
      },
    ]
  };

  const recentActivity = [
    {
      type: 'Incident',
      title: 'Safety incident reported and under investigation',
      project: 'Office Building A',
      time: '15 min ago',
      user: 'Safety Manager',
      icon: ShieldAlert,
      color: 'text-red-600'
    },
    {
      type: 'RFI',
      title: 'Structural steel connection detail required',
      project: 'Office Building A',
      time: '2 hours ago',
      user: 'John Smith',
      icon: ClipboardCheck,
      color: 'text-blue-600'
    },
    {
      type: 'Inspection',
      title: 'Foundation inspection completed - Passed',
      project: 'Retail Complex B',
      time: '4 hours ago',
      user: 'Quality Inspector',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      type: 'Submittal',
      title: 'HVAC equipment submittal approved',
      project: 'Office Building A',
      time: '5 hours ago',
      user: 'MEP Coordinator',
      icon: FileCheck,
      color: 'text-emerald-600'
    },
    {
      type: 'Change Order',
      title: 'Change order CO-2024-045 submitted for approval',
      project: 'Retail Complex B',
      time: '6 hours ago',
      user: 'Project Manager',
      icon: FileText,
      color: 'text-amber-600'
    },
    {
      type: 'Daily Report',
      title: 'Daily report submitted - 32 workers on site',
      project: 'Warehouse Extension',
      time: '8 hours ago',
      user: 'Site Supervisor',
      icon: Briefcase,
      color: 'text-cyan-600'
    },
  ];

  const quickActions = [
    { icon: FolderKanban, label: 'New Project', color: 'hover:border-blue-500 hover:bg-blue-50' },
    { icon: ClipboardCheck, label: 'Create RFI', color: 'hover:border-blue-500 hover:bg-blue-50' },
    { icon: CheckCircle, label: 'New Inspection', color: 'hover:border-green-500 hover:bg-green-50' },
    { icon: AlertTriangle, label: 'Add Snag', color: 'hover:border-red-500 hover:bg-red-50' },
    { icon: ShieldAlert, label: 'Report Incident', color: 'hover:border-red-500 hover:bg-red-50' },
    { icon: Activity, label: 'Log Observation', color: 'hover:border-amber-500 hover:bg-amber-50' },
    { icon: Briefcase, label: 'Daily Report', color: 'hover:border-cyan-500 hover:bg-cyan-50' },
    { icon: FileCheck, label: 'New Submittal', color: 'hover:border-emerald-500 hover:bg-emerald-50' },
    { icon: FileText, label: 'Change Order', color: 'hover:border-amber-500 hover:bg-amber-50' },
    { icon: Package, label: 'Upload Drawing', color: 'hover:border-purple-500 hover:bg-purple-50' },
    { icon: Truck, label: 'Purchase Order', color: 'hover:border-indigo-500 hover:bg-indigo-50' },
    { icon: Calendar, label: 'Schedule Meeting', color: 'hover:border-pink-500 hover:bg-pink-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, John</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your projects today</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock size={16} />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Priority Alerts */}
      {priorityAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Bell size={20} className="mr-2 text-red-500" />
              Priority Alerts
            </h2>
            <button className="text-sm text-gray-500 hover:text-gray-700">View all</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {priorityAlerts.map((alert, index) => {
              const AlertIcon = alert.icon;
              return (
                <div
                  key={index}
                  className={`${alert.color} border rounded-lg p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <AlertIcon size={20} className="flex-shrink-0" />
                    <span className="text-xs">{alert.time}</span>
                  </div>
                  <h3 className="font-semibold mb-1">{alert.title}</h3>
                  <p className="text-sm mb-3">{alert.description}</p>
                  <button className="text-sm font-medium underline hover:no-underline">
                    {alert.action} →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${stat.bgLight} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={24} className={stat.textColor} />
                </div>
                {stat.trend === 'up' && (
                  <TrendingUp size={16} className="text-green-500" />
                )}
                {stat.trend === 'down' && (
                  <TrendingDown size={16} className="text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Section with Tabs */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Projects Overview</h3>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </a>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Projects ({projects.active.length})
            </button>
            <button
              onClick={() => setActiveTab('atRisk')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'atRisk'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              At Risk ({projects.atRisk.length})
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'milestones'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Upcoming Milestones ({projects.milestones.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'active' && projects.active.map((project) => (
              <div key={project.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{project.name}</h4>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${project.bgColor} ${project.statusColor}`}>
                    {project.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium text-gray-900">{project.budget}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Team Size</p>
                    <p className="font-medium text-gray-900">{project.team} members</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">{project.dueDate}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{project.progress}%</span>
                </div>
              </div>
            ))}

            {activeTab === 'atRisk' && projects.atRisk.map((project) => (
              <div key={project.name} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{project.name}</h4>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${project.bgColor} ${project.statusColor}`}>
                    {project.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium text-gray-900">{project.budget}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Team Size</p>
                    <p className="font-medium text-gray-900">{project.team} members</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">{project.dueDate}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center space-x-4 mb-2">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{project.progress}%</span>
                  </div>
                </div>

                {project.issues && (
                  <div className="flex flex-wrap gap-2">
                    {project.issues.map((issue, idx) => (
                      <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-red-200 text-red-700">
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'milestones' && projects.milestones.map((milestone, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{milestone.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{milestone.project}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar size={14} className="mr-1" />
                      {milestone.date}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    milestone.status === 'At Risk'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {milestone.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-xs text-gray-500 hover:text-gray-700">Filter</button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex space-x-3 pb-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 p-2 rounded transition-colors cursor-pointer">
                  <div className={`flex-shrink-0 ${activity.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">{activity.type}</span>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{activity.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{activity.project}</p>
                    <p className="text-xs text-gray-400 mt-1">by {activity.user}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <a href="#" className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium mt-4 pt-4 border-t">
            View all activity →
          </a>
        </div>
      </div>

      {/* Safety & Quality Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Performance Widget */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield size={20} className="mr-2 text-green-600" />
              Safety Performance
            </h3>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View details
            </a>
          </div>

          <div className="space-y-4">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <p className="text-4xl font-bold text-green-600 mb-2">143</p>
              <p className="text-sm text-gray-600">Days Since Last Recordable Incident</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">0.42</p>
                <p className="text-xs text-gray-600 mt-1">Incident Rate (TRIR)</p>
                <span className="text-xs text-green-600">↓ 15% vs last period</span>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-xs text-gray-600 mt-1">Pending Observations</p>
                <span className="text-xs text-amber-600">3 high priority</span>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-xs text-gray-600 mt-1">Toolbox Talks This Week</p>
                <span className="text-xs text-green-600">↑ 20% participation</span>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">96%</p>
                <p className="text-xs text-gray-600 mt-1">Training Compliance</p>
                <span className="text-xs text-green-600">On target</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview Widget */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign size={20} className="mr-2 text-cyan-600" />
              Financial Overview
            </h3>
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View details
            </a>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-cyan-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">$28.5M</p>
                <p className="text-xs text-gray-600 mt-1">Total Portfolio Value</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">-2.4%</p>
                <p className="text-xs text-gray-600 mt-1">Overall Budget Variance</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">Pending Change Orders</p>
                  <p className="text-xs text-gray-500">8 awaiting approval</p>
                </div>
                <p className="text-lg font-bold text-amber-600">$145K</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">Uncommitted Budget</p>
                  <p className="text-xs text-gray-500">Available funds</p>
                </div>
                <p className="text-lg font-bold text-green-600">$2.1M</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">Outstanding POs</p>
                  <p className="text-xs text-gray-500">24 open orders</p>
                </div>
                <p className="text-lg font-bold text-gray-900">$425K</p>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-900">Cash Flow (30 days)</p>
                  <p className="text-xs text-gray-500">Projected payments</p>
                </div>
                <p className="text-lg font-bold text-gray-900">$1.8M</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {quickActions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={index}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-300 ${action.color} transition-all hover:scale-105`}
              >
                <ActionIcon size={24} className="text-gray-500 mb-2" />
                <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
