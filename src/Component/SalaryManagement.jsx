// src/components/SalaryManagement.jsx
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../Services/firebaseConfig";
import ActivityIndicator from "./ActivityIndicator";
import { jsPDF } from "jspdf"; // Install via npm install jspdf
import logo from "../assets/logo.png"
import SalaryDetailsFilter from "./SalaryDetailsFilter";
/**
 * Calculate the total leave days under a sandwich policy.
 * For each consecutive pair in the applied leave days:
 * - If the gap is 1 or 2 days, add extra leave for any weekend or public holiday between them.
 * - If the gap is exactly 3 days AND the first date is Friday and the second is Monday,
 *   then add Saturday and Sunday.
 * @param {string[]} appliedLeaveDays - Array of leave dates (YYYY-MM-DD)
 * @param {string[]} publicHolidays - Array of public holiday dates (YYYY-MM-DD)
 * @returns {number} Total leave days (applied plus any extra deductions)
 */
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
                const dayOfWeek = gapDate.getDay(); // Sunday=0, Saturday=6
                if (dayOfWeek === 0 || dayOfWeek === 6 || publicHolidays.includes(gapDateStr)) {
                    totalDeducted++;
                }
            }
        }
    }
    return totalDeducted;
}

// Generate an array of date strings (YYYY-MM-DD) for the given year and month.
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

// Function to generate and download the PDF with a professional design.
const generatePDF = (salaryData) => {
    const { name, role, month, selectedLeaveDates, effectiveLeaveDays, deduction, effectiveSalary } = salaryData;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // === Header Section ===
    // Draw a filled rectangle as header background.
    doc.setFillColor(70, 130, 180); // Steel blue.
    doc.rect(0, 0, pageWidth, 40, "F");

    // Add logo at top left. Replace 'logo' with your actual logo base64 string.
    const logoBase64 = logo; // Ensure 'logo' is defined in your scope.
    doc.addImage(logoBase64, "PNG", margin, 5, 30, 30);

    // Add a centered header title.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255); // White.
    doc.text("Salary Report", pageWidth / 2, 25, { align: "center" });

    // Draw a separator line below the header.
    doc.setLineWidth(0.5);
    doc.setDrawColor(255, 255, 255);
    doc.line(margin, 40, pageWidth - margin, 40);

    // === Salary Details Section ===
    let y = 50;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    // Layout using a two-column style.
    const labelWidth = 60;
    doc.text("Employee Name:", margin, y);
    doc.text(name, margin + labelWidth, y);
    y += 8;
    doc.text("Role:", margin, y);
    doc.text(role, margin + labelWidth, y);
    y += 8;
    doc.text("Month:", margin, y);
    doc.text(month, margin + labelWidth, y);
    y += 8;
    doc.text("Effective Leave Days:", margin, y);
    doc.text(`${effectiveLeaveDays}`, margin + labelWidth, y);
    y += 8;
    doc.text("Deduction:", margin, y);
    doc.text(`RS ${deduction.toFixed(2)}`, margin + labelWidth, y);
    y += 8;
    doc.text("Effective Salary:", margin, y);
    doc.text(`RS ${effectiveSalary.toFixed(2)}`, margin + labelWidth, y);
    y += 10;
    if (selectedLeaveDates && selectedLeaveDates.length > 0) {
        doc.text("Leave Dates:", margin, y);
        y += 8;
        doc.text(selectedLeaveDates.join(", "), margin + 10, y, { maxWidth: pageWidth - margin * 2 - 10 });
        y += 10;
    }

    // Draw a border around the salary details section.
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin - 5, 45, pageWidth - margin * 2 + 10, y - 45 + 5);

    // === Sandwich Leave Policy Explanation Section ===
    y += 10; // Space between sections.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Sandwich Leave Policy Explanation", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    const explanation = `If an employee takes leave on Friday and Monday, with Saturday and Sunday being a weekend, a company with a sandwich leave policy might count the entire period (Friday, Saturday, Sunday, Monday) as leave taken. Even though the employee is not technically working on the weekend, the policy treats the non-working days as part of the leave period. This approach discourages splitting leave around non-working days and ensures that leave is taken in a continuous block.`;
    // Add the explanation text with word-wrapping.
    doc.text(explanation, margin, y, { maxWidth: pageWidth - margin * 2 });

    // === Footer Section ===
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Generated by Taimoor Nasir", pageWidth / 2, pageHeight - 10, { align: "center" });

    // Create a file name using the employee's name and month.
    const fileName = `${name.replace(/\s+/g, "_")}_${month}.pdf`;
    doc.save(fileName);
};



const SalaryManagement = () => {
    // 1. Fetch employees from Firestore (or use dummy data if none)
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const snapshot = await getDocs(collection(db, "employees"));
                if (snapshot.empty) {
                    console.warn("No employees found in Firestore. Using dummy data.");
                    setEmployees([]);
                } else {
                    const employeeData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setEmployees(employeeData);
                }
            } catch (error) {
                console.error("Error fetching employees:", error);
                setEmployees([
                    { id: "1", name: "John Doe", salary: 5000, role: "Employee" },
                    { id: "2", name: "Jane Smith", salary: 4500, role: "Employee" },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    // 2. State variables for managing month, leave dates, and calculations.
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedLeaveDates, setSelectedLeaveDates] = useState([]);
    const [effectiveLeave, setEffectiveLeave] = useState(0);
    const [calculatedSalary, setCalculatedSalary] = useState(0);
    const [activeEmployee, setActiveEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Confirmation modal state for notifications instead of alerts.
    const [confirmationModal, setConfirmationModal] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState("");

    // Public holidays (if any) in YYYY-MM-DD format.
    const publicHolidays = [
        // e.g. "2025-03-08"
    ];

    // 3. Modal handlers for the salary management modal.
    const openModal = (employee) => {
        console.log("Opening modal for:", employee.name);
        setActiveEmployee(employee);
        setSelectedMonth("");
        setSelectedLeaveDates([]);
        setEffectiveLeave(0);
        setCalculatedSalary(Number(employee.salary));
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setActiveEmployee(null);
        setSelectedMonth("");
        setSelectedLeaveDates([]);
        setEffectiveLeave(0);
        setCalculatedSalary(0);
    };

    // 4. Toggle date selection.
    const toggleDate = (dateStr) => {
        if (selectedLeaveDates.includes(dateStr)) {
            setSelectedLeaveDates(selectedLeaveDates.filter((d) => d !== dateStr));
        } else {
            setSelectedLeaveDates([...selectedLeaveDates, dateStr]);
        }
    };

    // 5. Calculate salary.
    const handleCalculateSalary = async () => {
        if (!selectedMonth) return;
        const salariesRef = collection(db, "employees", activeEmployee.id, "salaries");
        const q = query(salariesRef, where("month", "==", selectedMonth));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const existingSalaryData = querySnapshot.docs[0].data();
            setCalculatedSalary(existingSalaryData.effectiveSalary);
            setConfirmationMessage(
                `Salary for ${activeEmployee.name} for ${selectedMonth} is already calculated! Effective Salary: RS ${existingSalaryData.effectiveSalary.toFixed(2)}`
            );
            setConfirmationModal(true);
            return;
        } else {
            let leaveDates = [...selectedLeaveDates].sort();
            for (let i = 0; i < leaveDates.length - 1; i++) {
                const current = new Date(leaveDates[i]);
                const next = new Date(leaveDates[i + 1]);
                if (current.getDay() === 5 && next.getDay() === 1) {
                    const diffDays = (next - current) / (1000 * 60 * 60 * 24);
                    if (diffDays === 3) {
                        const saturday = new Date(current);
                        saturday.setDate(saturday.getDate() + 1);
                        const sunday = new Date(current);
                        sunday.setDate(sunday.getDate() + 2);
                        const satStr = saturday.toISOString().split("T")[0];
                        const sunStr = sunday.toISOString().split("T")[0];
                        if (!leaveDates.includes(satStr)) leaveDates.push(satStr);
                        if (!leaveDates.includes(sunStr)) leaveDates.push(sunStr);
                    }
                }
            }
            const effective = calculateSandwichLeave(leaveDates, publicHolidays);
            setEffectiveLeave(effective);
            const baseSalary = Number(activeEmployee.salary);
            const [year, month] = selectedMonth.split("-").map(Number);
            const totalDaysInMonth = new Date(year, month, 0).getDate();
            const deduction = (baseSalary / totalDaysInMonth) * effective;
            setCalculatedSalary(baseSalary - deduction);
        }
    };

    // 6. Confirm the calculated salary, store data in Firestore, and generate PDF.
    const handleConfirmSalary = async () => {
        if (!activeEmployee) return;
        const baseSalary = Number(activeEmployee.salary);
        const [year, month] = selectedMonth.split("-").map(Number);
        const totalDaysInMonth = new Date(year, month, 0).getDate();
        const deduction = (baseSalary / totalDaysInMonth) * effectiveLeave;
        const salaryData = {
            name: activeEmployee.name,
            role: activeEmployee.role,
            month: selectedMonth,
            selectedLeaveDates: selectedLeaveDates,
            effectiveLeaveDays: effectiveLeave,
            deduction: deduction,
            effectiveSalary: calculatedSalary,
        };
        try {
            const salariesCollectionRef = collection(db, "employees", activeEmployee.id, "salaries");
            await addDoc(salariesCollectionRef, salaryData);
            setConfirmationMessage(`Salary confirmed for ${salaryData.name} for ${salaryData.month}!`);
            setConfirmationModal(true);
            // Generate PDF using jsPDF with file name based on employee name and month.
            generatePDF(salaryData);
            closeModal();
        } catch (error) {
            console.error("Error updating salary data:", error);
            setConfirmationMessage("Error updating salary data.");
            setConfirmationModal(true);
        }
    };

    // 7. Render calendar grid.
    const renderCalendar = () => {
        if (!selectedMonth) return null;
        const [year, month] = selectedMonth.split("-").map(Number);
        const days = generateCalendarDays(year, month);
        return (
            <div className="grid grid-cols-7 gap-2 mt-4">
                {days.map((day) => {
                    const dayObj = new Date(day);
                    const isWeekend = dayObj.getDay() === 0 || dayObj.getDay() === 6;
                    return (
                        <button
                            key={day}
                            onClick={() => !isWeekend && toggleDate(day)}
                            disabled={isWeekend}
                            className={`border p-2 rounded transition-colors ${selectedLeaveDates.includes(day)
                                ? "bg-blue-500 text-white"
                                : isWeekend
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-white text-gray-800 hover:bg-blue-100"
                                }`}
                        >
                            {parseInt(day.slice(-2))}
                        </button>
                    );
                })}
            </div>
        );
    };

    // 8. Render main component.
    if (loading) {
        return <ActivityIndicator message="Loading ..." />;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h2 className="text-3xl font-bold mb-4 text-center">Salary Management</h2>
            <div className="overflow-x-auto bg-white rounded shadow-lg p-4">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="px-4 py-2 text-left">Employee</th>
                            <th className="px-4 py-2 text-left">Base Salary</th>
                            <th className="px-4 py-2 text-left">Effective Salary</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.id} className="border-t">
                                <td className="px-4 py-2">{emp.name}</td>
                                <td className="px-4 py-2">RS: {emp.salary}</td>
                                <td className="px-4 py-2">
                                    {activeEmployee && activeEmployee.id === emp.id
                                        ? `RS: ${calculatedSalary.toFixed(2)}`
                                        : `RS: ${emp.salary}`}
                                </td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => openModal(emp)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                                    >
                                        Manage Salary
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* <SalaryDetailsFilter /> */}
            {showModal && activeEmployee && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            &times;
                        </button>
                        <h3 className="text-2xl font-semibold mb-4">
                            Manage Salary for {activeEmployee.name}
                        </h3>
                        <p className="mb-2 text-sm">
                            Base Salary: RS: {activeEmployee.salary}
                        </p>
                        <div className="mb-4">
                            <label htmlFor="monthSelect" className="block text-gray-700 mb-1">
                                Select Month:
                            </label>
                            <input
                                type="month"
                                id="monthSelect"
                                value={selectedMonth}
                                onChange={(e) => {
                                    setSelectedMonth(e.target.value);
                                    // Clear selected leave dates when month changes.
                                    setSelectedLeaveDates([]);
                                }}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                        {selectedMonth && (
                            <div>
                                <p className="mb-2 text-sm">
                                    Click on dates to mark leave days (weekends are disabled):
                                </p>
                                {renderCalendar()}
                                {selectedLeaveDates.length > 0 && (
                                    <p className="mt-2 text-sm">
                                        Selected Leave Dates:{" "}
                                        <strong>{selectedLeaveDates.join(", ")}</strong>
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end space-x-4 mt-4">
                            <button
                                onClick={handleCalculateSalary}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                            >
                                Calculate Salary
                            </button>
                            <button
                                onClick={closeModal}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        {effectiveLeave > 0 && (
                            <>
                                <div className="mt-4 p-4 bg-gray-100 rounded">
                                    <p>
                                        Name: <strong>{activeEmployee.name}</strong>
                                    </p>
                                    <p>
                                        Role: <strong>{activeEmployee.role}</strong>
                                    </p>
                                    <p>
                                        Month: <strong>{selectedMonth}</strong>
                                    </p>
                                    <p>
                                        Selected Leave Dates:{" "}
                                        <strong>{selectedLeaveDates.join(", ")}</strong>
                                    </p>
                                    <p>
                                        Effective Leave Days (including sandwich rule):{" "}
                                        <strong>{effectiveLeave}</strong>
                                    </p>
                                    <p>
                                        Deduction: RS:{" "}
                                        <strong>
                                            {(
                                                (Number(activeEmployee.salary) /
                                                    new Date(...selectedMonth.split("-").map(Number), 0).getDate()) *
                                                effectiveLeave
                                            ).toFixed(2)}
                                        </strong>
                                    </p>
                                    <p>
                                        Effective Salary: RS:{" "}
                                        <strong>{calculatedSalary.toFixed(2)}</strong>
                                    </p>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={handleConfirmSalary}
                                        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmationModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 sm:w-1/2 md:w-1/3">
                        <h3 className="text-xl font-semibold mb-4">Confirmation</h3>
                        <p className="text-gray-700 mb-6">{confirmationMessage}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setConfirmationModal(false)}
                                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryManagement;
