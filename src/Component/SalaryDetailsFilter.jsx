// src/Components/SalaryDetailsFilter.jsx
import React, { useState } from 'react';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../Services/firebaseConfig';
import ActivityIndicator from './ActivityIndicator';

const SalaryDetailsFilter = () => {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [salaryDetails, setSalaryDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle filter button click.
  const handleFilter = async () => {
    if (!year || !month) return;
    setLoading(true);
    // Build filter string as "YYYY-MM"
    const filterMonth = `${year}-${month.padStart(2, '0')}`; // e.g., "2025-01" or "2025-02"
    try {
      // Query across all "salaries" subcollections matching the selected month.
      // Ensure that your salary documents have a field "month" in the same "YYYY-MM" format.
      const q = query(
        collectionGroup(db, "salaries"),
        where("month", "==", filterMonth),
        orderBy("name", "asc")
      );
      const snapshot = await getDocs(q);
      const details = snapshot.docs.map(doc => doc.data());
      setSalaryDetails(details);
    } catch (error) {
      console.error("Error fetching filtered salary details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Filter Salary Details</h2>
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block mb-1 font-medium">Year</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Year</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              {/* Add more years as needed */}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Month</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Month</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="bg-blue-500 text-white px-5 py-2 rounded hover:bg-blue-600 transition-colors focus:outline-none"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <ActivityIndicator message="Loading salary details..." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2 text-left">Employee Name</th>
                <th className="border px-4 py-2 text-left">Month</th>
                <th className="border px-4 py-2 text-left">Effective Leave Days</th>
                <th className="border px-4 py-2 text-left">Deduction</th>
                <th className="border px-4 py-2 text-left">Effective Salary</th>
                <th className="border px-4 py-2 text-left">Leave Dates</th>
              </tr>
            </thead>
            <tbody>
              {salaryDetails.length > 0 ? (
                salaryDetails.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-100">
                    <td className="border px-4 py-2">{s.name || "N/A"}</td>
                    <td className="border px-4 py-2">{s.month}</td>
                    <td className="border px-4 py-2">{s.effectiveLeaveDays}</td>
                    <td className="border px-4 py-2">RS {Number(s.deduction).toFixed(2)}</td>
                    <td className="border px-4 py-2">RS {Number(s.effectiveSalary).toFixed(2)}</td>
                    <td className="border px-4 py-2">
                      {s.selectedLeaveDates && s.selectedLeaveDates.length > 0
                        ? s.selectedLeaveDates.join(", ")
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border px-4 py-2 text-center" colSpan="6">
                    No salary details found for the selected month and year.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalaryDetailsFilter;
