import React, { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import {
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineDashboard,
  AiOutlineUser,
  AiOutlineBank,
  AiOutlineDollarCircle,
  AiOutlineSetting,
  AiOutlineSearch,
} from "react-icons/ai";
import { FaSignOutAlt } from "react-icons/fa";
import logo from "../assets/logo.png"; // Ensure logo is accessible
import { signOut } from "firebase/auth";
import { auth } from "../Services/firebaseConfig";
import { useNavigate } from "react-router-dom";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Fixed Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#0a2635] flex flex-col transition-all duration-300 overflow-hidden ${
          isSidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 bg-[#0a2635]">
          {isSidebarOpen ? (
            <span className="text-xl font-bold text-white">Newage Dispatch</span>
          ) : (
            <span className="text-xl font-bold text-white"></span>
          )}
          <button
            onClick={toggleSidebar}
            className="text-white hover:text-gray-300 transition-colors"
          >
            {isSidebarOpen ? (
              <AiOutlineClose size={20} />
            ) : (
              <AiOutlineMenu size={20} />
            )}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-2">
            <li>
              <Link
                to="dashboard"
                className="flex items-center p-2 text-white rounded hover:bg-[#0c3044] transition-colors"
              >
                <AiOutlineDashboard className="text-xl" />
                {isSidebarOpen && <span className="ml-3">Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link
                to="employee"
                className="flex items-center p-2 text-white rounded hover:bg-[#0c3044] transition-colors"
              >
                <AiOutlineUser className="text-xl" />
                {isSidebarOpen && <span className="ml-3">Employee</span>}
              </Link>
            </li>
            <li>
              <Link
                to="management"
                className="flex items-center p-2 text-white rounded hover:bg-[#0c3044] transition-colors"
              >
                <AiOutlineBank className="text-xl" />
                {isSidebarOpen && <span className="ml-3">Manage Salary</span>}
              </Link>
            </li>
            <li>
              <Link
                to="EmployeeSalaryList"
                className="flex items-center p-2 text-white rounded hover:bg-[#0c3044] transition-colors"
              >
                <AiOutlineDollarCircle className="text-xl" />
                {isSidebarOpen && <span className="ml-3">Salary List</span>}
              </Link>
            </li>
            <li>
              <Link
                to="AttendanceMarkSheet"
                className="flex items-center p-2 text-white rounded hover:bg-[#0c3044] transition-colors"
              >
                <AiOutlineSetting className="text-xl" />
                {isSidebarOpen && <span className="ml-3">Attendance Mark Sheet</span>}
              </Link>
            </li>
            <li>
              <Link
                to="AttendanceMarkSheet"
                className="flex items-center p-2 text-white rounded hover:bg-[#0c3044] transition-colors"
              >
                <AiOutlineSetting className="text-xl" />
                {isSidebarOpen && <span className="ml-3">Check Attendance</span>}
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-16"
        }`}
      >
        {/* Persistent Header */}
        <header className="flex items-center justify-between bg-white shadow p-4">
          {/* Search Bar */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded px-2 py-1">
            <AiOutlineSearch className="text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent focus:outline-none text-sm"
            />
          </div>
          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img
                src={logo}
                alt="User Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="hidden sm:block font-medium">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-red-500 hover:text-red-600 transition-colors"
            >
              <FaSignOutAlt />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>

        <main className="p-6 flex flex-col space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
