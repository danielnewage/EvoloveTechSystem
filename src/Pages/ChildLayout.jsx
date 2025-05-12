import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AiOutlineCalendar,
  AiOutlineFileSearch,
  AiOutlineSearch,
  AiOutlineClose,
  AiOutlineMenu
} from "react-icons/ai";
import { FaSignOutAlt } from "react-icons/fa";
import logo from "../assets/logo.png";
import { signOut } from "firebase/auth";
import { auth } from "../Services/firebaseConfig";

const navItems = [
  { to: "/admin/attendance-mark", icon: <AiOutlineCalendar />, label: "Mark Attendance" },
  { to: "/admin/attendance-summary", icon: <AiOutlineFileSearch />, label: "Summary" },
];

export default function AttendanceLayout() {
  const [open, setOpen] = useState(true);
  const loc = useLocation();
  const nav = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    nav("/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <motion.aside
        animate={{ width: open ? 240 : 64 }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="bg-gradient-to-b from-teal-600 to-teal-800 text-white overflow-hidden relative"
      >
        <div className="flex items-center justify-between px-4 py-3">
          {open && <h1 className="text-lg font-bold">Evolove Tech</h1>}
          <button onClick={() => setOpen(o => !o)}>
            {open ? <AiOutlineClose /> : <AiOutlineMenu />}
          </button>
        </div>
        <nav className="mt-8">
          {navItems.map(({to, icon, label}) => {
            const active = loc.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center p-2 mx-2 rounded-md hover:bg-teal-500 transition-colors ${
                  active ? "bg-teal-500" : ""
                }`}
              >
                <span className="text-xl">{icon}</span>
                {open ? (
                  <span className="ml-3">{label}</span>
                ) : (
                  <span className="absolute left-full ml-2 bg-black text-white text-xs rounded px-2 py-1">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
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
      </motion.aside>

      <div className={`flex-1 flex flex-col transition-all`}>
        <header className="flex items-center justify-between bg-white shadow px-6 py-4">
          <div className="flex items-center bg-gray-100 rounded px-3 py-1 w-60">
            <AiOutlineSearch className="text-gray-500" />
            <input
              type="text"
              placeholder="Search attendance..."
              className="bg-transparent focus:outline-none flex-1 text-sm ml-2"
            />
          </div>
        </header>
        <main className="p-6 bg-white overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
