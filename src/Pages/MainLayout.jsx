import React, { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import {
  AiOutlineDashboard,
  AiOutlineUser,
  AiOutlineBank,
  AiOutlineDollarCircle,
  AiOutlineCalendar,
  AiOutlineWallet,
  AiOutlineFileSearch,
  AiOutlineSearch,
  AiOutlineClose,
  AiOutlineMenu
} from "react-icons/ai";
import { FaSignOutAlt } from "react-icons/fa";
import logo from "../assets/logo.png";
import { signOut } from "firebase/auth";
import { auth } from "../Services/firebaseConfig";

export default function MainLayout() {
  const [open, setOpen] = useState(true);
  const nav = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    nav("/");
  };

  const items = [
    { to: "/admin/dashboard", icon: <AiOutlineDashboard />, label: "Dashboard" },
    { to: "/admin/employee", icon: <AiOutlineUser />, label: "Employees" },
    { to: "/admin/management", icon: <AiOutlineBank />, label: "Manage Salary" },
    { to: "/admin/salaries", icon: <AiOutlineDollarCircle />, label: "Salary List" },
    { to: "/admin/attendance-mark", icon: <AiOutlineCalendar />, label: "Mark Attendance" },
    { to: "/admin/salary-auto", icon: <AiOutlineWallet />, label: "Salary w/ Attendance" },
    { to: "/admin/attendance-summary", icon: <AiOutlineFileSearch />, label: "Check Attendance" },
  ];

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-[#0a2635] text-white transition-width duration-300 ${
        open ? "w-64" : "w-16"
      }`}>
        <div className="flex items-center justify-between p-4">
          {open && <span className="text-xl font-bold">Evolove Tech</span>}
          <button onClick={() => setOpen(o => !o)}>
            {open ? <AiOutlineClose /> : <AiOutlineMenu />}
          </button>
        </div>
        <nav className="mt-4">
          {items.map(({to, icon, label}) => (
            <Link
              key={to}
              to={to}
              className="flex items-center p-2 mx-2 rounded hover:bg-[#0c3044] transition-colors"
            >
              <span className="text-xl">{icon}</span>
              {open && <span className="ml-3">{label}</span>}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 w-full text-center">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-3/4 mx-auto bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full transition-colors"
          >
            <FaSignOutAlt />
            {open && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-margin duration-300 ${
        open ? "ml-64" : "ml-16"
      }`}>
        <header className="flex items-center justify-between bg-white shadow px-6 py-4">
          <div className="flex items-center bg-gray-100 rounded px-3 py-1 w-60">
            <AiOutlineSearch className="text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent focus:outline-none flex-1 text-sm ml-2"
            />
          </div>
        </header>
        <main className="p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
