import { Factory } from 'lucide-react';

export default function Plant() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
          <Factory size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Plant Management</h1>
          <p className="text-gray-600">Track machinery, equipment, and maintenance schedules</p>
        </div>
      </div>

      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <Factory size={40} className="text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600 max-w-md">
            The Plant Management module is currently under development.
            Check back soon for equipment tracking and maintenance features.
          </p>
        </div>
      </div>
    </div>
  );
}
