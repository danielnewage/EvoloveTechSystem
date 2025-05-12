// Pages/DashboardContent.jsx
import React, { useState, useEffect } from "react";
import {
  AiOutlineUser,
  AiOutlineClockCircle,
  AiOutlineCloseCircle,
} from "react-icons/ai";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Services/firebaseConfig";

const LATE_THRESHOLD = "17:10";  // Late after 5:10 PM

const DashboardContent = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalLateArrivals, setTotalLateArrivals] = useState(0);
  const [totalAbsents, setTotalAbsents] = useState(0);

  // For header
  const now = new Date();
  const monthLabel = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      // 1️⃣ Total Employees
      const empSnap = await getDocs(collection(db, "employees"));
      setTotalEmployees(empSnap.size);

      // 2️⃣ Fetch all attendance (you can scope to date‐indexed subcollection
      //    if you have an indexed “date” field to limit reads)
      const attSnap = await getDocs(collection(db, "employeesattendance"));
      const allRecords = attSnap.docs.map(doc => doc.data());

      // 3️⃣ Keep only this month’s records by parsing the `date` string
      const monthRecords = allRecords.filter(r => {
        // assume r.date is "MM/DD/YYYY"
        const d = new Date(r.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });

      // 4️⃣ Late Arrivals
      const lateCount = monthRecords.filter(
        r =>
          r.status === "Present" &&
          r.lateArrivalApproved === "No" &&
          r.timeIn > LATE_THRESHOLD
      ).length;
      setTotalLateArrivals(lateCount);

      // 5️⃣ Absents
      const absentCount = monthRecords.filter(r => r.status === "Absent")
        .length;
      setTotalAbsents(absentCount);
    };

    fetchMetrics().catch(console.error);
  }, [now.getMonth(), now.getFullYear()]);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">
        Dashboard Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Employees */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <AiOutlineUser className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Staff</p>
            <p className="text-xl font-semibold">{totalEmployees}</p>
          </div>
        </div>
        
      </div>

      <h2 className="text-2xl font-semibold mb-4 mt-8">
        Attandance Details — {monthLabel}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
       
        {/* Late Arrivals */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <AiOutlineClockCircle className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">
              Late Arrivals (after {LATE_THRESHOLD})
            </p>
            <p className="text-xl font-semibold">{totalLateArrivals}</p>
          </div>
        </div>
        {/* Absents */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-red-100 text-red-600">
            <AiOutlineCloseCircle className="text-2xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Absents</p>
            <p className="text-xl font-semibold">{totalAbsents}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
