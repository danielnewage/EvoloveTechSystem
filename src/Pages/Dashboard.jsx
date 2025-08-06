// Pages/DashboardContent.jsx
import React, { useState, useEffect } from "react";
import {
  AiOutlineUser,
  AiOutlineClockCircle,
  AiOutlineCloseCircle,
  AiOutlineWifi,
} from "react-icons/ai";
import { collection, getDocs, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../Services/firebaseConfig";

const LATE_THRESHOLD = "17:10";  // Late after 5:10 PM

const DashboardContent = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalLateArrivals, setTotalLateArrivals] = useState(0);
  const [totalAbsents, setTotalAbsents] = useState(0);
  const [isIPModalOpen, setIsIPModalOpen] = useState(false);
  const [newIP, setNewIP] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleUpdateIP = async () => {
    const trimmedIP = newIP.trim();
    if (!trimmedIP) {
      alert("Please enter a valid IP address");
      return;
    }

    try {
      setIsUpdating(true);
      const docRef = doc(db, "clientIP", "rOa7UHKS6ZZ02JtaqtG9");
      await setDoc(docRef, {
        clientIP: trimmedIP
      }, { merge: true });
      alert("IP address updated successfully!");
      setIsIPModalOpen(false);
      setNewIP("");
    } catch (error) {
      console.error("Error updating IP:", error);
      alert("Failed to update IP address");
    } finally {
      setIsUpdating(false);
    }
  };

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
        
        {/* IP Update Button */}
        <div className="bg-white rounded shadow p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <AiOutlineWifi className="text-2xl" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Client IP Settings</p>
            <button
              onClick={() => setIsIPModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Update IP
            </button>
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

      {/* IP Update Modal */}
      {isIPModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Update Client IP Address</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New IP Address:
              </label>
              <input
                type="text"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                placeholder="Enter IP address (e.g., 103.151.47.14)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsIPModalOpen(false);
                  setNewIP("");
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateIP}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Update IP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
