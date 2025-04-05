// src/components/AttendanceSummary.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../Services/firebaseConfig';
import ActivityIndicator from './ActivityIndicator';
import { jsPDF } from "jspdf";

const AttendanceSummary = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [detailMonth, setDetailMonth] = useState('');
  const [summaryFilterMonth, setSummaryFilterMonth] = useState('');

  // Helper to format date as "M/D/YYYY"
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US');
  };

  const currentDate = new Date();
  const defaultYear = currentDate.getFullYear();
  const defaultMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // JS month is 0-indexed
  const activeFilterMonth = summaryFilterMonth || `${defaultYear}-${defaultMonth}`;

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "employeesattendance"));
        const records = [];
        querySnapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() });
        });
        setAttendanceRecords(records);
      } catch (error) {
        console.error("Error fetching attendance records:", error);
      }
    };
    fetchAttendance();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "employees"));
        const empList = [];
        querySnapshot.forEach((docSnap) => {
          empList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setEmployees(empList);
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Filter attendance records for the selected month (for summary table)
  const filteredAttendance = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    const [filterYear, filterMonth] = activeFilterMonth.split('-').map(Number);
    return recordDate.getFullYear() === filterYear && recordDate.getMonth() === (filterMonth - 1);
  });

  // Helper: convert "HH:MM" string to total minutes after midnight.
  const timeToMinutes = (timeStr) => {
    const [hh, mm] = timeStr.split(':').map(Number);
    return hh * 60 + mm;
  };

  // For the detailed modal, generate records including missing dates.
  // Weekends (Saturday & Sunday) are auto marked as "Off".
  const getEmployeeRecordsForMonth = (employeeId) => {
    const activeDetailMonth = detailMonth || activeFilterMonth;
    // Filter existing records for employee in the selected month.
    const records = attendanceRecords.filter(record => {
      if (record.employeeId !== employeeId) return false;
      const recordDate = new Date(record.date);
      const [year, month] = activeDetailMonth.split('-').map(Number);
      return recordDate.getFullYear() === year && recordDate.getMonth() === (month - 1);
    });
    const recordedDates = new Set(records.map(record => record.date));
    const [year, month] = activeDetailMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const missingRecords = [];
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      // Create date string in YYYY-MM-DD format.
      const dateStr = `${activeDetailMonth}-${dayStr}`;
      const dateObj = new Date(`${year}-${month}-${dayStr}`);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      if (!recordedDates.has(dateStr)) {
        missingRecords.push({
          id: dateStr,
          date: dateStr,
          status: (dayOfWeek === 0 || dayOfWeek === 6) ? "Off" : "No Record",
          timeIn: "-",
          lateArrivalApproved: "-"
        });
      }
    }
    const mergedRecords = [...records, ...missingRecords];
    mergedRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    return mergedRecords;
  };

  // Export the detailed attendance records as PDF using jsPDF.
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    const employee = employees.find(e => e.id === selectedEmployeeId);
    doc.text(`Attendance Details for ${employee?.name || "Employee"}`, 14, 22);
    doc.setFontSize(12);
    const headers = [["Date", "Status", "Time In", "Late Arrival Approved"]];
    const records = getEmployeeRecordsForMonth(selectedEmployeeId).map(record => [
      formatDate(record.date),
      record.status,
      record.timeIn,
      record.lateArrivalApproved
    ]);
    let startY = 30;
    headers[0].forEach((header, index) => {
      doc.text(header, 14 + index * 50, startY);
    });
    startY += 8;
    records.forEach(row => {
      row.forEach((cell, index) => {
        doc.text(String(cell), 14 + index * 50, startY);
      });
      startY += 8;
    });
    doc.save(`${employee?.name || "Employee"}_Attendance.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold">
        <ActivityIndicator />
      </div>
    );
  }

  const calculateWorkingDays = (activeMonth) => {
    const [year, month] = activeMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateObj = new Date(`${year}-${month}-${dayStr}`);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const workingDaysInMonth = calculateWorkingDays(activeFilterMonth);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8 text-blue-800">Monthly Attendance Summary</h2>

      {/* Filter for main summary */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <label className="text-gray-700 font-medium">Filter by Month:</label>
        <input
          type="month"
          value={summaryFilterMonth}
          onChange={(e) => setSummaryFilterMonth(e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Employee Name</th>
              <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Role</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Present</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Absent</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Late Arrivals</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">No Record</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map(emp => {
              // Filter employee's records for the active month.
              const empRecords = filteredAttendance.filter(record => record.employeeId === emp.id);
              // Only count weekdays for missing count.
              const uniqueDates = new Set(empRecords
                .filter(r => {
                  const d = new Date(r.date);
                  const day = d.getDay();
                  return day !== 0 && day !== 6; // exclude weekends
                })
                .map(r => r.date)
              );
              const missingCount = workingDaysInMonth - uniqueDates.size;
              const summary = {
                present: empRecords.filter(r => r.status === "Present").length,
                absent: empRecords.filter(r => r.status === "Absent").length,
                // Late arrival count: Present, not approved, and timeIn after 9:15 AM (555 minutes)
                lateArrival: empRecords.filter(r =>
                  r.status === "Present" &&
                  r.lateArrivalApproved === "No" &&
                  r.timeIn &&
                  timeToMinutes(r.timeIn) > (9 * 60 + 15)
                ).length
              };

              return (
                <tr key={emp.id} className="hover:bg-gray-100 transition-colors">
                  <td className="py-4 px-4 whitespace-nowrap text-gray-800">{emp.name}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-gray-800">{emp.role}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-center text-green-700 font-bold">{summary.present}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-center text-red-700 font-bold">{summary.absent}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-center text-yellow-700 font-bold">{summary.lateArrival}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-center text-gray-700 font-bold">{missingCount}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        setDetailMonth(''); // reset detail month filter
                        setIsDetailModalOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed Attendance Modal for an Employee */}
      {isDetailModalOpen && selectedEmployeeId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-2xl z-10 p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-2xl font-bold">
                Attendance Details for {employees.find(e => e.id === selectedEmployeeId)?.name || "Employee"}
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-600 hover:text-gray-800 text-3xl mt-2 md:mt-0">
                &times;
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-4">
              <div className="w-full md:w-1/2 mb-4 md:mb-0">
                <label className="block text-gray-700 mb-2">Filter by Month:</label>
                <input
                  type="month"
                  value={detailMonth}
                  onChange={(e) => setDetailMonth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <button
                  onClick={exportPDF}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                    <th className="py-3 px-4 text-center font-semibold">Status</th>
                    <th className="py-3 px-4 text-center font-semibold">Time In</th>
                    <th className="py-3 px-4 text-center font-semibold">Late Arrival Approved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getEmployeeRecordsForMonth(selectedEmployeeId).map(record => (
                    <tr key={record.id} className="hover:bg-gray-100 transition-colors">
                      <td className="py-3 px-4 text-gray-800">{formatDate(record.date)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full font-medium ${record.status === 'Present'
                            ? 'bg-green-200 text-green-800'
                            : record.status === 'Half Present'
                              ? 'bg-yellow-200 text-yellow-800'
                              : record.status === 'Absent'
                                ? 'bg-red-200 text-red-800'
                                : record.status === 'Off'
                                  ? 'bg-gray-400 text-gray-800'
                                  : 'bg-blue-200 text-blue-800'
                          }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{record.timeIn}</td>
                      <td className="py-3 px-4 text-center">{record.lateArrivalApproved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummary;
