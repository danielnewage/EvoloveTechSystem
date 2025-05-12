// src/components/SalaryManageAuto.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../Services/firebaseConfig";
import ActivityIndicator from "./ActivityIndicator";
import { jsPDF } from "jspdf";
import logo from '../assets/1.png'

// --- Helper: Normalize a date string to "YYYY-MM-DD" ---
const normalizeDate = (dateInput) => {
  if (typeof dateInput === "string" && dateInput.includes("/")) {
    const parts = dateInput.split("/");
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  } else {
    const date = new Date(dateInput);
    return date.toISOString().split("T")[0];
  }
};

// --- Sandwich Leave Calculation ---
function calculateSandwichLeave(appliedLeaveDays, publicHolidays = []) {
  if (!appliedLeaveDays.length) return 0;
  const sortedLeaveDays = appliedLeaveDays.slice().sort();
  let totalDeducted = sortedLeaveDays.length;
  for (let i = 0; i < sortedLeaveDays.length - 1; i++) {
    const currentDate = new Date(sortedLeaveDays[i]);
    const nextDate = new Date(sortedLeaveDays[i + 1]);
    const gapDays = Math.floor((nextDate - currentDate) / (1000 * 60 * 60 * 24)) - 1;
    if (gapDays > 0 && gapDays <= 2) {
      for (let j = 1; j <= gapDays; j++) {
        const gapDate = new Date(currentDate);
        gapDate.setDate(gapDate.getDate() + j);
        const gapDateStr = gapDate.toISOString().split("T")[0];
        const dayOfWeek = gapDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6 || publicHolidays.includes(gapDateStr)) {
          totalDeducted++;
        }
      }
    }
  }
  return totalDeducted;
}

// --- Helper to generate calendar days for a given month (YYYY-MM) ---
const generateCalendarDays = (year, month) => {
  const days = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// --- Helper: Format a date string (or Date object) to "M/D/YYYY" ---
const formatDate = (dateInput) => {
  const date = new Date(dateInput);
  return date.toLocaleDateString("en-US");
};

// --- Function to compute extra leave penalty based on Late Arrival count ---
const computeExtraLeave = (lateArrivalCount) => {
  if (lateArrivalCount >= 5 && lateArrivalCount <= 9) return 1;
  if (lateArrivalCount >= 10 && lateArrivalCount <= 14) return 2;
  if (lateArrivalCount >= 15 && lateArrivalCount <= 19) return 3;
  if (lateArrivalCount >= 20 && lateArrivalCount <= 24) return 4;
  if (lateArrivalCount >= 25 && lateArrivalCount <= 29) return 5;
  if (lateArrivalCount >= 30 && lateArrivalCount <= 31) return 6;
  return 0;
};

const SalaryManageAuto = () => {
  // Data state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and UI states
  const [summaryFilterMonth, setSummaryFilterMonth] = useState("");
  const [detailMonth, setDetailMonth] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  // Salary management state
  const [calculatedSalary, setCalculatedSalary] = useState(0);
  const [effectiveLeave, setEffectiveLeave] = useState(0);
  // Receipt state for confirmation
  const [calculationReceipt, setCalculationReceipt] = useState(null);
  // New state: indicates if salary record already exists for this month
  const [salaryConfirmed, setSalaryConfirmed] = useState(false);

  // Public holidays (if any)
  const publicHolidays = [
    // Add dates in "YYYY-MM-DD" format if needed.
  ];

  // Default month for summary and details (current month)
  const currentDate = new Date();
  const defaultYear = currentDate.getFullYear();
  const defaultMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
  const activeFilterMonth = summaryFilterMonth || `${defaultYear}-${defaultMonth}`;

  // --- Helper: Convert "HH:MM" string to minutes after midnight ---
  const timeToMinutes = (timeStr) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    return hh * 60 + mm;
  };

  // --- Data Fetching ---
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

  // --- Filtering Attendance for Summary ---
  const filteredAttendance = attendanceRecords.filter((record) => {
    const recordDate = new Date(record.date);
    const [filterYear, filterMonth] = activeFilterMonth.split("-").map(Number);
    return recordDate.getFullYear() === filterYear && recordDate.getMonth() === filterMonth - 1;
  });

  // --- Get complete attendance sheet for an employee for a given month ---
  const getEmployeeRecordsForMonth = (employeeId) => {
    const activeDetailMonth = detailMonth || activeFilterMonth;
    const records = attendanceRecords.filter((record) => {
      if (record.employeeId !== employeeId) return false;
      const recordDate = new Date(record.date);
      const [year, month] = activeDetailMonth.split("-").map(Number);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month - 1;
    });
    const recordedDates = new Set(records.map((record) => normalizeDate(record.date)));
    const [year, month] = activeDetailMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const missingRecords = [];
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, "0");
      const dateStr = `${activeDetailMonth}-${dayStr}`;
      const dateObj = new Date(`${year}-${month}-${dayStr}`);
      const dayOfWeek = dateObj.getDay();
      if (!recordedDates.has(dateStr)) {
        missingRecords.push({
          id: dateStr,
          date: dateStr,
          status: dayOfWeek === 0 || dayOfWeek === 6 ? "Off" : "No Record",
          timeIn: "-",
          lateArrivalApproved: "-",
        });
      }
    }
    const mergedRecords = [...records, ...missingRecords];
    mergedRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Update records based on timeIn
    const updatedRecords = mergedRecords.map((record) => {
      if (record.status === "Present" && record.timeIn !== "-") {
        const minutes = timeToMinutes(record.timeIn);
        if (minutes > 20 * 60 ) {
          return { ...record, status: "Half Present" };
        } else if (minutes > (17 * 60 + 10)) {
          return { ...record, status: "Late Arrival" };
        }
      }
      return record;
    });
    return updatedRecords;
  };

  // --- Calculate working days in a month (excluding weekends) ---
  const calculateWorkingDays = (activeMonth) => {
    const [year, month] = activeMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, "0");
      const dateObj = new Date(`${year}-${month}-${dayStr}`);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const workingDaysInMonth = calculateWorkingDays(activeFilterMonth);

  const checkSalaryExists = async (employeeId, monthToCheck) => {
    const salarySnapshot = await getDocs(collection(db, "employees", employeeId, "salaries"));
    let existingRecord = null;
    salarySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.month === monthToCheck) {
        existingRecord = data;
      }
    });
    return existingRecord;
  };

  const openSalaryModal = async (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setDetailMonth("");
    setEffectiveLeave(0);
    setCalculatedSalary(0);
    setCalculationReceipt(null);
    const monthToCheck = detailMonth || activeFilterMonth;
    const record = await checkSalaryExists(employeeId, monthToCheck);
    if (record) {
      // Salary record exists – show the receipt.
      setSalaryConfirmed(true);
      setCalculationReceipt(record);
    } else {
      setSalaryConfirmed(false);
    }
    setIsSalaryModalOpen(true);
  };

  const closeSalaryModal = () => {
    setIsSalaryModalOpen(false);
    setSelectedEmployeeId(null);
    setDetailMonth("");
    setEffectiveLeave(0);
    setCalculatedSalary(0);
    setCalculationReceipt(null);
    setSalaryConfirmed(false);
  };


  // --- Updated Salary Calculation Handler ---
  const handleCalculateSalary = () => {
    if (!selectedEmployeeId) return;
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return;
    if (employee.employmentType === 'Myself') {
      alert('Salary calculation not applicable for this employee.');
      return;
    }
    const records = getEmployeeRecordsForMonth(selectedEmployeeId);

    let fullLeaveDates;
    let fullLeave;
    let lateArrivalCount;
    let halfPresentCount;
    let extraLeave;
    let effective;
    let baseSalary = Number(employee.salary);
    const [year, month] = (detailMonth || activeFilterMonth).split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    let deduction;
    let calculated;

    fullLeaveDates = records
      .filter(r => r.status === 'Absent' || r.status === 'No Record')
      .map(r => normalizeDate(r.date))
      .sort();
    fullLeave = calculateSandwichLeave(fullLeaveDates, publicHolidays);

    // Count late arrivals and half-days
    lateArrivalCount = records.filter(
      r => r.status === 'Late Arrival' && r.lateArrivalApproved !== 'Yes'
    ).length;
    halfPresentCount = records.filter(r => r.status === 'Half Present').length;

    extraLeave = computeExtraLeave(lateArrivalCount);
    effective = fullLeave + halfPresentCount * 0.5 + extraLeave;
    setEffectiveLeave(effective);
    handleCalculateSalary

    // Compute salary and deduction
    deduction = (employee.employmentType === 'Remote')
      ? 0
      : (baseSalary / totalDaysInMonth) * effective;
    calculated = baseSalary - deduction;
    setCalculatedSalary(calculated);

    const receipt = {
      employeeId: selectedEmployeeId,
      employeeName: employee.name,
      role: employee.role,
      month: detailMonth || activeFilterMonth,
      lateArrivalCount,
      fullLeave,
      halfPresentCount,
      deduction: deduction.toFixed(2),
      calculatedSalary: calculated.toFixed(2),
    };
    setCalculationReceipt(receipt);
  };

  const handleConfirmSalary = async () => {
    if (!selectedEmployeeId || !calculationReceipt) return;

    try {
      // 1) load existing salary docs
      const snap = await getDocs(
        collection(db, "employees", selectedEmployeeId, "salaries")
      );

      // 2) find the doc for this month
      let existingDoc = null;
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.month === calculationReceipt.month) {
          existingDoc = { id: docSnap.id, ...data };
        }
      });

      if (existingDoc) {
        // 3a) update existing
        const ref = doc(
          db,
          "employees",
          selectedEmployeeId,
          "salaries",
          existingDoc.id
        );
        await updateDoc(ref, {
          ...calculationReceipt,
          salariescalculatestatus: true,
          SalarySend: false,
          timestamp: new Date(),
        });
        alert("Salary record updated successfully.");
      } else {
        // 3b) add new
        await addDoc(
          collection(db, "employees", selectedEmployeeId, "salaries"),
          {
            ...calculationReceipt,
            salariescalculatestatus: true,
            SalarySend: false,
            timestamp: new Date(),
          }
        );
        alert("Salary record confirmed successfully.");
      }

      setSalaryConfirmed(true);
      exportReceiptPDF();
    } catch (error) {
      console.error("Error saving salary record:", error);
      alert("Error saving salary record.");
    }
  };

  // --- PDF Generation (Receipt) ---
  const exportReceiptPDF = () => {
    if (!calculationReceipt) return;

    const doc = new jsPDF();

    // Page 1: Header, Employee & Salary Details, Attendance Details, Policy Rules

    // Header Section
    doc.addImage(logo, "PNG", 15, 10, 25, 25);
    doc.setFontSize(12);
    doc.setTextColor("#555555");
    doc.text("Evolove Tech Systems", 45, 15);
    doc.setFontSize(14);
    doc.setTextColor("#000000");
    doc.text(`Payslip for the month of ${calculationReceipt.month}`, 45, 25);
    doc.setFontSize(9);
    doc.setTextColor("#666666");
    doc.text(calculationReceipt.location || "", 45, 30);
    doc.setDrawColor(200);
    doc.line(10, 35, 200, 35);

    // Employee Details Section
    let y = 45;
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    doc.text(`Employee: ${calculationReceipt.employeeName}`, 15, y);
    doc.text(`Role: ${calculationReceipt.role}`, 110, y);
    y += 6;
    doc.text(`Full Leave Days: ${calculationReceipt.fullLeave}`, 15, y);
    doc.text(`Late Arrival (Unapproved): ${calculationReceipt.lateArrivalCount}`, 110, y);
    y += 6;
    doc.text(`Half Present Count: ${calculationReceipt.halfPresentCount}`, 15, y);
    doc.text(`Deduction: RS ${calculationReceipt.deduction}`, 110, y);
    y += 6;
    doc.text(`Calculated Salary: RS ${calculationReceipt.calculatedSalary}`, 15, y);
    y += 8;
    doc.setDrawColor(200);
    doc.line(10, y, 200, y);
    y += 10;

    // Attendance Details Section (on Page 1)
    doc.setFontSize(14);
    doc.setTextColor("#000000");
    doc.text("Attendance Details:", 10, y);
    y += 5;
    doc.setDrawColor(200);
    doc.line(10, y, 200, y);
    y += 10;

    let y2 = y;
    const headersPDF = ["Date", "Status", "Time In", "L/A Approved"];
    const headerXPositions = [15, 65, 115, 165];
    const addAttendanceTableHeader = () => {
      doc.setFontSize(10);
      doc.setTextColor("#000000");
      doc.setFillColor(230, 230, 230);
      doc.rect(15, y2 - 4, 180, 8, "F");
      headersPDF.forEach((header, index) => {
        doc.text(header, headerXPositions[index], y2);
      });
      y2 += 8;
    };
    addAttendanceTableHeader();

    const records = getEmployeeRecordsForMonth(selectedEmployeeId).map(record => [
      formatDate(record.date),
      record.status,
      record.timeIn,
      record.lateArrivalApproved === "Yes" ? "Yes" : "No",
    ]);

    records.forEach((row, rowIndex) => {
      if (y2 > 270) {
        doc.addPage();
        y2 = 20;
        addAttendanceTableHeader();
      }
      if (rowIndex % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y2 - 4, 180, 8, "F");
      }
      row.forEach((cell, colIndex) => {
        doc.text(String(cell), headerXPositions[colIndex], y2);
      });
      y2 += 8;
    });

    // Policy Rules Section
    let yPolicy = y2 + 10;
    if (yPolicy > 270) {
      doc.addPage();
      yPolicy = 20;
    }
    doc.setFontSize(10);
    doc.setTextColor("#1C2833");
    doc.text("Attendance & Leave Policy Rules:", 15, yPolicy);
    yPolicy += 6;
    doc.setFontSize(8);
    doc.setTextColor("#000000");
    doc.text("1. Late Arrival Policy (Unapproved):", 15, yPolicy);
    yPolicy += 4;
    doc.text("   - Every 5 instances of unapproved late arrivals equate to 1 full day leave deduction.", 15, yPolicy);
    yPolicy += 4;
    doc.text("   - A late arrival is defined as clocking in after the official shift start time without prior approval.", 15, yPolicy);
    yPolicy += 4;
    doc.text("   - All late entries are automatically tracked and accumulated.", 15, yPolicy);
    yPolicy += 6;
    doc.text("2. Half-Day Attendance Rule:", 15, yPolicy);
    yPolicy += 4;
    doc.text("   - Any employee checking in at or after 8:00 PM will be marked as Half Present.", 15, yPolicy);
    yPolicy += 4;
    doc.text("   - Two half-day attendances may be counted as 1 full day leave, per organizational policy.", 15, yPolicy);
    yPolicy += 6;
    doc.text("3. Sandwich Leave Rule:", 15, yPolicy);
    yPolicy += 4;
    doc.text("   - If leave is taken on both Friday and the following Monday,", 15, yPolicy);
    yPolicy += 4;
    doc.text("     the intervening weekend (Saturday & Sunday) will also be counted as leave.", 15, yPolicy);
    yPolicy += 6;

    if (yPolicy > 270) {
      doc.addPage();
      yPolicy = 20;
    }
    doc.setFontSize(9);
    doc.setTextColor("#777777");
    doc.text("This is a system-generated payslip and does not require a signature.", 15, 285);

    doc.save(`${calculationReceipt.employeeName}-${calculationReceipt.month}_Payslip.pdf`);
  };

  // --- PDF Generation (Salary & Attendance Report) ---
  const exportPDF = () => {
    const doc = new jsPDF();
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    doc.setFontSize(18);
    doc.text(`Salary & Attendance Report for ${employee?.name || "Employee"}`, 14, 22);
    doc.setFontSize(12);

    const headersPDFReport = [["Date", "Status", "Time In", "L/A Approved"]];
    const records = getEmployeeRecordsForMonth(selectedEmployeeId).map((record) => [
      formatDate(record.date),
      record.status,
      record.timeIn,
      record.lateArrivalApproved,
    ]);
    let startY = 30;
    doc.text("Attendance Details:", 16, startY);
    startY += 8;
    headersPDFReport[0].forEach((header, index) => {
      doc.text(header, 14 + index * 50, startY);
    });
    startY += 8;
    records.forEach((row) => {
      row.forEach((cell, index) => {
        doc.text(String(cell), 14 + index * 50, startY);
      });
      startY += 8;
    });

    startY += 10;
    doc.text("Salary Details:", 14, startY);
    startY += 8;
    doc.text(`Base Salary: RS ${employee?.salary || 0}`, 14, startY);
    startY += 8;
    doc.text(`Effective Leave Days: ${effectiveLeave}`, 14, startY);
    startY += 8;
    doc.text(`Calculated Salary: RS ${calculatedSalary.toFixed(2)}`, 14, startY);

    doc.save(`${employee?.name || "Employee"}_Salary_Attendance.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8 text-blue-800">
        Salary & Attendance Manager
      </h2>

      {/* Filter by Month for Summary */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <label className="text-gray-700 font-medium">Filter by Month:</label>
        <input
          type="month"
          value={summaryFilterMonth}
          onChange={(e) => setSummaryFilterMonth(e.target.value)}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Summary Table with Attendance Data */}
      <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-blue-500 text-white">
              <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Employee Name</th>
              <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Role</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Present</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Absent</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Late Arrival</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Half Present</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">No Record</th>
              <th className="py-3 px-4 text-center font-semibold uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => {
              // 1) Filter this employee’s raw records
              const empRecordsRaw = filteredAttendance.filter(r => r.employeeId === emp.id);

              // 2) Group by normalized date
              const byDate = empRecordsRaw.reduce((acc, record) => {
                const day = normalizeDate(record.date); // e.g. "2025-04-04"
                if (!acc[day]) acc[day] = [];
                acc[day].push(record);
                return acc;
              }, {});

              // 3) Reduce each day’s array into a single “daily record”
              const dailyRecords = Object.values(byDate).map(recordsForDay => {
                // If any Work From Home → treat as WFH
                if (recordsForDay.some(r => r.status === "Work From Home")) {
                  return { date: recordsForDay[0].date, status: "Work From Home", timeIn: "-", lateArrivalApproved: "-" };
                }
                // Else if any Present → Present
                if (recordsForDay.some(r => r.status === "Present")) {
                  // pick earliest timeIn
                  const presentRecs = recordsForDay.filter(r => r.status === "Present" && r.timeIn !== "-");
                  const earliest = presentRecs.sort((a, b) => timeToMinutes(a.timeIn) - timeToMinutes(b.timeIn))[0];
                  // derive Half Present / Late Arrival
                  const minutes = earliest ? timeToMinutes(earliest.timeIn) : 0;
                  const derivedStatus = minutes > 20 * 60  ? "Half Present"
                    : minutes > 17 * 60 + 10 ? "Late Arrival"
                      : "Present";
                  return {
                    date: earliest.date,
                    status: derivedStatus,
                    timeIn: earliest.timeIn,
                    lateArrivalApproved: earliest.lateArrivalApproved
                  };
                }
                // Else if any Absent
                if (recordsForDay.some(r => r.status === "Absent")) {
                  return { date: recordsForDay[0].date, status: "Absent", timeIn: "-", lateArrivalApproved: "-" };
                }
                // Otherwise it’s No Record or Off (we’ll count Off separately or ignore)
                const sample = recordsForDay[0];
                return { date: sample.date, status: sample.status, timeIn: sample.timeIn, lateArrivalApproved: sample.lateArrivalApproved };
              });

              // 4) Now count unique daily statuses
              const presentCount = dailyRecords.filter(d => d.status === "Present" || d.status === "Work From Home").length 
              +dailyRecords.filter(d => d.status === "Late Arrival").length
              +dailyRecords.filter(d => d.status === "Half Present").length;
              const absentCount = dailyRecords.filter(d => d.status === "Absent").length;
              const lateCount = dailyRecords.filter(d => d.status === "Late Arrival").length;
              const halfCount = dailyRecords.filter(d => d.status === "Half Present").length;

              const missingCount = workingDaysInMonth - dailyRecords.length;

              return (
                <tr key={emp.id} className="hover:bg-gray-100 transition-colors">
                  <td className="py-4 px-4">{emp.name}</td>
                  <td className="py-4 px-4">{emp.role}</td>
                  <td className="py-4 px-4 text-center text-green-700 font-bold">{presentCount}</td>
                  <td className="py-4 px-4 text-center text-red-700 font-bold">{absentCount}</td>
                  <td className="py-4 px-4 text-center text-purple-700 font-bold">{lateCount}</td>
                  <td className="py-4 px-4 text-center text-yellow-700 font-bold">{halfCount}</td>
                  <td className="py-4 px-4 text-center text-gray-700 font-bold">{missingCount}</td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => openSalaryModal(emp.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                    >
                      Manage Salary
                    </button>
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>

      {/* Salary & Attendance Modal */}
      {isSalaryModalOpen && selectedEmployeeId && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-2xl z-10 p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-2xl font-bold">
                {`Attendance & Salary for ${employees.find((e) => e.id === selectedEmployeeId)?.name || "Employee"}`}
              </h3>
              <button onClick={closeSalaryModal} className="text-gray-600 hover:text-gray-800 text-3xl mt-2 md:mt-0">
                &times;
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-4">
              <div className="w-full md:w-1/2 mb-4 md:mb-0">
                {/* Label for status */}
                <label className="block text-gray-700 mb-2">Salary Calculation Status</label>

                {/* Status Badge */}
                <div className="mt-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${salaryConfirmed
                      ? "bg-green-100 text-green-800"
                      : calculationReceipt
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                      }`}
                  >

                    {salaryConfirmed
                      ? "Salary Confirmed"
                      : calculationReceipt
                        ? "Calculated (awaiting confirmation)"
                        : "Not calculated yet"}
                  </span>
                </div>

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
            <div className="overflow-x-auto mb-4">
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
                  {getEmployeeRecordsForMonth(selectedEmployeeId).map((record) => (
                    <tr key={record.id} className="hover:bg-gray-100 transition-colors">
                      <td className="py-3 px-4 text-gray-800">{formatDate(record.date)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full font-medium ${record.status === "Present"
                          ? "bg-green-200 text-green-800"
                          : record.status === "Late Arrival"
                            ? "bg-purple-200 text-purple-800"
                            : record.status === "Half Present"
                              ? "bg-yellow-200 text-yellow-800"
                              : record.status === "Absent"
                                ? "bg-red-200 text-red-800"
                                : record.status === "Off"
                                  ? "bg-gray-400 text-gray-800"
                                  : "bg-blue-200 text-blue-800"
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

            {/* Salary Calculation Section */}
            <div className="mt-6 p-4 bg-gray-100 rounded">
              <p>Name: <strong>{employees.find((e) => e.id === selectedEmployeeId)?.name}</strong></p>
              <p>Role: <strong>{employees.find((e) => e.id === selectedEmployeeId)?.role}</strong></p>
              <p>Month: <strong>{detailMonth || activeFilterMonth}</strong></p>
              <p>
                Effective Leave Days (incl. Sandwich Rule, Late Arrival & Half Present Penalties):{" "}
                <strong>{effectiveLeave}</strong>
              </p>
              <p>
                Deduction: RS:{" "}
                <strong>
                  {(
                    (Number(employees.find((e) => e.id === selectedEmployeeId)?.salary) /
                      new Date(...(detailMonth || activeFilterMonth).split("-").map(Number), 0).getDate()) *
                    effectiveLeave
                  ).toFixed(2)}
                </strong>
              </p>
              <p>Calculated Salary: RS: <strong>{calculatedSalary.toFixed(2)}</strong></p>
            </div>

            {/* Receipt Section */}
            {calculationReceipt && (
              <div className="mt-6 p-4 bg-green-50 rounded border border-green-300">
                <h4 className="text-xl font-bold mb-2">Salary Receipt</h4>
                <p><strong>Employee:</strong> {calculationReceipt.employeeName}</p>
                <p><strong>Role:</strong> {calculationReceipt.role}</p>
                <p><strong>Month:</strong> {calculationReceipt.month}</p>
                <p><strong>Full Leave Days:</strong> {calculationReceipt.fullLeave}</p>
                <p><strong>Late Arrival (Unapproved):</strong> {calculationReceipt.lateArrivalCount}</p>
                <p><strong>Half Present Count:</strong> {calculationReceipt.halfPresentCount}</p>
                <p><strong>Deduction:</strong> RS {calculationReceipt.deduction}</p>
                <p><strong>Calculated Salary:</strong> RS {calculationReceipt.calculatedSalary}</p>
                <button
                  onClick={handleConfirmSalary}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  disabled={salaryConfirmed}
                >
                  Confirm Salary & Download Receipt
                </button>

              </div>
            )}

            <div className="flex justify-end space-x-4 mt-4">
              {salaryConfirmed ? (
                <button
                  onClick={() => {
                    // Clear confirmation to allow editing
                    setSalaryConfirmed(false);
                    setCalculationReceipt(null);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition"
                >
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleCalculateSalary}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Calculate Salary
                </button>
              )}
              <button
                onClick={closeSalaryModal}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManageAuto;
