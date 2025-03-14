// Pages/DashboardContent.jsx
import React from "react";
import {
  AiOutlineUser,
  AiOutlineBank,
  AiOutlineDollarCircle,
} from "react-icons/ai";

const DashboardContent = () => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <AiOutlineUser className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Employees</p>
            <p className="text-xl font-semibold">13</p>
          </div>
        </div>
        {/* Card 2 */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <AiOutlineBank className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Departments</p>
            <p className="text-xl font-semibold">5</p>
          </div>
        </div>
        {/* Card 3 */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <AiOutlineDollarCircle className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Monthly Salary</p>
            <p className="text-xl font-semibold">$654</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
