// src/components/AttendanceSummary.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Services/firebaseConfig";
import ActivityIndicator from "./ActivityIndicator";
import { jsPDF } from "jspdf";

// normalize date function
// NEW (uses local year/month/day):
const toYMD = dateInput => {
  const d = new Date(dateInput);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function AttendanceSummary() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [detailMonth, setDetailMonth] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const today = new Date();
  const defaultYM = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;
  const activeMonth = filterMonth || defaultYM;

  useEffect(() => {
    (async () => {
      const [attSnap, empSnap] = await Promise.all([
        getDocs(collection(db, "employeesattendance")),
        getDocs(collection(db, "employees")),
      ]);
      setAttendanceRecords(
        attSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const timeToMin = str => {
    if (!str) return 0;
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
  };

  const workingDays = (() => {
    const [y, m] = activeMonth.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    let cnt = 0;
    for (let d = 1; d <= dim; d++) {
      const dow = new Date(`${y}-${m}-${String(d).padStart(2, "0")}`).getDay();
      if (dow !== 0 && dow !== 6) cnt++;
    }
    return cnt;
  })();

  const filtered = attendanceRecords.filter(r => {
    const dt = new Date(r.date);
    const [y, m] = activeMonth.split("-").map(Number);
    return dt.getFullYear() === y && dt.getMonth() === m - 1;
  });

  const getDetail = empId => {
    const ym = detailMonth || activeMonth;
    const existing = attendanceRecords.filter(
      r =>
        r.employeeId === empId &&
        new Date(r.date).getFullYear() === +ym.split("-")[0] &&
        new Date(r.date).getMonth() + 1 === +ym.split("-")[1]
    );
    const recorded = new Set(existing.map(r => toYMD(r.date)));
    const [y, m] = ym.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const missing = [];
    for (let d = 1; d <= dim; d++) {
      const dd = String(d).padStart(2, "0");
      const ds = `${ym}-${dd}`;
      if (!recorded.has(ds)) {
        const dow = new Date(ds).getDay();
        missing.push({
          date: ds,
          status: dow === 0 || dow === 6 ? "Off" : "No Record",
          timeIn: "-",
          lateArrivalApproved: "-",
        });
      }
    }
    return [...existing, ...missing].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  };

  // inside AttendanceSummary.jsx, replace exportPDF with this:

const exportPDF = () => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const emp = employees.find(e => e.id === selectedEmp) || {};
  const detail = getDetail(selectedEmp);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header bar
  doc.setFillColor(75, 85, 99); // Tailwind slate-600
  doc.rect(0, 0, pageWidth, 50, "F");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`Details for ${emp.name}`, 40, 32);

  // Month subtitle
  doc.setFontSize(12);
  doc.setTextColor(200);
  doc.text(`Month: ${detailMonth || activeMonth}`, 40, 50 + 20);
  y = 80;

  // Loop through each record and draw a “card”
  detail.forEach((rec, idx) => {
    if (y + 80 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 40;
    }
    // Card background
    doc.setFillColor(248, 250, 252); // gray-50
    doc.roundedRect(30, y, pageWidth - 60, 70, 6, 6, "F");

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Date", 40, y + 18);
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(new Date(rec.date).toLocaleDateString("en-US"), 40, y + 34);

    // Status
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Status", 160, y + 18);
    doc.setFontSize(12);
    // Status pill
    const statusW = doc.getTextWidth(rec.status) + 12;
    let pillColor = [191, 219, 254]; // blue-200
    let textColor = [30, 58, 138];   // blue-800
    if (rec.status === "Present") {
      pillColor = [220, 252, 231]; textColor = [5, 150, 105];
    } else if (rec.status === "Absent") {
      pillColor = [254, 205, 211]; textColor = [185, 28, 28];
    } else if (rec.status === "Off") {
      pillColor = [209, 213, 219]; textColor = [55, 65, 81];
    } else if (rec.status === "Late Arrival") {
      pillColor = [254, 240, 138]; textColor = [124, 58, 237];
    }
    doc.setFillColor(...pillColor);
    doc.roundedRect(160, y + 24, statusW, 16, 4, 4, "F");
    doc.setFontSize(12);
    doc.setTextColor(...textColor);
    doc.text(rec.status, 166, y + 36);

    // Time In
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Time In", 260, y + 18);
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(rec.timeIn, 260, y + 34);

    // L/A Approved
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("L/A Approved", 340, y + 18);
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(rec.lateArrivalApproved, 340, y + 34);

    y += 90;
  });

  doc.save(`${emp.name || "Employee"}_Attendance_Details.pdf`);
};


  if (loading) {
    return <ActivityIndicator className="h-screen" />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Filter & Title */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white shadow rounded-lg p-6">
        <h2 className="text-3xl font-semibold text-gray-800 mb-4 sm:mb-0">
          Attendance – {activeMonth}
        </h2>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="border-gray-300 focus:outline-indigo rounded-md px-4 py-2"
        />
      </div>

      {/* Employee Summary Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map(emp => {
          const recs = filtered.filter(r => r.employeeId === emp.id);

          // 1) Group recs by normalized date
          const byDate = recs.reduce((acc, r) => {
            const day = toYMD(r.date);
            if (!acc[day]) acc[day] = [];
            acc[day].push(r);
            return acc;
          }, {});

          // 2) For each day, pick one “effective” record:
          //    - If any record is Present or WFH, treat the day as Present/WFH.
          //    - Else if any record is Absent, day is Absent.
          //    - Otherwise it’s “No Record” or Off — but we only care about Present/Late/Absent here.
          const daily = Object.entries(byDate).map(([day, arr]) => {
            // Determine status
            const hasWFH = arr.some(r => r.status === "Work From Home");
            const hasPresent = arr.some(r => r.status === "Present");
            const hasAbsent = arr.some(r => r.status === "Absent");
            const status = hasWFH
              ? "Work From Home"
              : hasPresent
                ? "Present"
                : hasAbsent
                  ? "Absent"
                  : "No Record";

            // Determine if late that day (only for WFH or Present)
            const isLate = (status === "Work From Home" || status === "Present") &&
              arr.some(r => r.lateArrivalApproved === "No" && timeToMin(r.timeIn) > 1030);

            return { day, status, isLate };
          });

          // 3) Now count:
          const presentCount = daily.filter(d => d.status === "Present" || d.status === "Work From Home").length;
          const absentCount = daily.filter(d => d.status === "Absent").length;
          const lateCount = daily.filter(d => d.isLate).length;

          // Missing = workingDays minus days you actually have a record for
          const missingCount = workingDays - daily.length;

          return (
            <div
              key={emp.id}
              className="bg-white shadow-lg rounded-lg p-6 flex flex-col hover:shadow-xl transition"
            >
              <div>
                <h3 className="text-xl font-medium">{emp.name}</h3>
                <p className="text-gray-500">{emp.role}</p>
              </div>
              <div className="mt-4 space-y-2 flex-1">
                {[
                  { label: "Present", value: presentCount, color: "green" },
                  { label: "Absent", value: absentCount, color: "red" },
                  { label: "Late", value: lateCount, color: "yellow" },
                  { label: "No Record", value: missingCount, color: "gray" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-700">{label}</span>
                    <span
                      className={`font-semibold text-${color}-700`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedEmp(emp.id);
                  setDetailMonth("");
                  setModalOpen(true);
                }}
                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {modalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-indigo-600 text-white flex justify-between items-center px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-semibold">
                Details for{" "}
                {employees.find(e => e.id === selectedEmp)?.name}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-2xl hover:text-gray-300"
              >
                &times;
              </button>
            </div>

            {/* Filters & Export */}
            <div className="flex flex-col sm:flex-row items-center gap-4 px-6 py-4">
              <input
                type="month"
                value={detailMonth}
                onChange={e => setDetailMonth(e.target.value)}
                className="border-gray-300 focus:outline-indigo rounded-md px-3 py-2"
              />
              <button
                onClick={exportPDF}
                className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                Export PDF
              </button>
            </div>

            {/* Records Grid */}
            <div className="px-6 pb-6 grid gap-4">
              {getDetail(selectedEmp).map(rec => (
                <div
                  key={rec.date}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4"
                >
                  <div>
                    <div className="text-gray-500 text-xs">Date</div>
                    <div className="font-medium">
                      {new Date(rec.date).toLocaleDateString("en-US")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Status</div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm ${rec.status === "Present"
                          ? "bg-green-100 text-green-800"
                          : rec.status === "Late Arrival"
                            ? "bg-yellow-100 text-yellow-800"
                            : rec.status === "Off"
                              ? "bg-gray-300 text-gray-800"
                              : rec.status === "Absent"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Time In</div>
                    <div>{rec.timeIn}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">L/A Approved</div>
                    <div>{rec.lateArrivalApproved}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
