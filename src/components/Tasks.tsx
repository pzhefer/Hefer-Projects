import { useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';

export default function Tasks() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} />
          <span>Add Task</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <CheckSquare className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tasks Module</h3>
          <p className="text-gray-600">
            This module will allow you to create, assign, and track tasks across your projects.
          </p>
        </div>
      </div>
    </div>
  );
}
