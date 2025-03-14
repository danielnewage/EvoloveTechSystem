import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from '../Services/firebaseConfig'; // Adjust the path as needed

const AttendanceMarkSheet = () => {
  // Generate time options from 06:00 to 15:00 in 15-minute intervals
  const generateTimeOptions = () => {
    const times = [];
    const start = 6 * 60;
    const end = 15 * 60;
    const step = 15;
    for (let t = start; t <= end; t += step) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
      times.push(timeString);
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Form, attendance and modal states
  const [attendance, setAttendance] = useState([]); // from top-level "employeesattendance"
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Holiday');
  const [timeIn, setTimeIn] = useState(timeOptions[0]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter and modal states
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  // Employees state (from Firestore)
  const [employees, setEmployees] = useState([]);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "employees"));
        const employeeList = [];
        querySnapshot.forEach((docSnap) => {
          employeeList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setEmployees(employeeList);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch attendance records for the selected date from "employeesattendance"
  useEffect(() => {
    const fetchAttendance = async () => {
      const dateString = selectedDate.toLocaleDateString('en-US');
      const q = query(
        collection(db, "employeesattendance"),
        where("date", "==", dateString)
      );
      try {
        const querySnapshot = await getDocs(q);
        const attendanceRecords = [];
        querySnapshot.forEach((docSnap) => {
          attendanceRecords.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        setAttendance(attendanceRecords);
        console.log("Fetched attendance records:", attendanceRecords);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
    };
    fetchAttendance();
  }, [selectedDate]);

  // Handle employee selection from dropdown
  const handleEmployeeSelect = (e) => {
    const selectedEmployeeId = e.target.value;
    const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
    if (selectedEmployee) {
      setEmployeeId(selectedEmployeeId);
      setName(selectedEmployee.name);
      setRole(selectedEmployee.role);
    } else {
      setEmployeeId('');
      setName('');
      setRole('');
    }
  };

  // Determine if time selection is required
  const requiresTime = status === 'Present' || status === 'Work From Home' || status === 'Holiday';

  // Mark attendance: add record to both employee subcollection (optional) and top-level "employeesattendance"
  const markAttendance = async () => {
    if (name.trim() === '' || role.trim() === '' || employeeId === '') {
      alert("Please select an employee (name and role).");
      return;
    }
    if (requiresTime && timeIn.trim() === '') {
      alert("Please select Time In.");
      return;
    }
    if (selectedDate > new Date()) {
      alert("Selected date cannot be in the future.");
      return;
    }

    let finalStatus = status;
    if (status === 'Holiday') {
      finalStatus = "Present";
    } else if (requiresTime) {
      if (status === 'Present' && timeIn >= "08:00") {
        finalStatus = "Half Present";
      } else if (status === 'Work From Home') {
        finalStatus = "Present";
      }
    }

    const dateString = selectedDate.toLocaleDateString('en-US');
    const newRecord = {
      name,
      role,
      employeeId,
      status: finalStatus,
      date: dateString,
      timeIn: requiresTime ? timeIn : '-',
      createdAt: new Date()
    };

    try {
      // Optionally add to employee's subcollection
      const subcollectionRef = collection(db, "employees", employeeId, "attendance");
      await addDoc(subcollectionRef, newRecord);

      // Add record to top-level "employeesattendance" collection
      const topLevelRef = collection(db, "employeesattendance");
      const docRef = await addDoc(topLevelRef, newRecord);
      console.log("Attendance marked with ID:", docRef.id);
      setAttendance([...attendance, { id: docRef.id, ...newRecord }]);

      // Reset form fields
      setEmployeeId('');
      setName('');
      setRole('');
    } catch (error) {
      console.error("Error marking attendance:", error);
    }
  };

  // Current date string
  const currentDateString = selectedDate.toLocaleDateString('en-US');

  // Filter employees: exclude "Remote"/"Myself" and those with attendance record for current date
  const filteredEmployees = employees.filter(
    emp =>
      emp.employmentType !== "Remote" &&
      emp.employmentType !== "Myself" &&
      !attendance.some(record => record.employeeId === emp.id && record.date === currentDateString)
  );

  // Filter attendance records based on search
  const filteredAttendanceRecords = attendance.filter(record => {
    if (filterName.trim() && !record.name.toLowerCase().includes(filterName.toLowerCase())) {
      return false;
    }
    if (filterStatus !== 'All' && record.status !== filterStatus) {
      return false;
    }
    return true;
  });

  // Open edit modal if record exists for current date
  const openEditModal = (record) => {
    if (attendance.find(rec => rec.employeeId === record.employeeId && rec.date === currentDateString)) {
      setEditRecord(record);
      setIsModalOpen(true);
    } else {
      alert("No attendance record to edit. Please mark attendance first.");
    }
  };

  // Update attendance record in top-level "employeesattendance"
  const updateRecord = async () => {
    if (!editRecord.name.trim() || !editRecord.role.trim()) {
      alert("Name and Role cannot be changed.");
      return;
    }
    const timingRequired = editRecord.status === 'Present' || editRecord.status === 'Work From Home' || editRecord.status === 'Holiday';
    let updatedStatus = editRecord.status;
    if (editRecord.status === 'Holiday') {
      updatedStatus = "Present";
    } else if (timingRequired) {
      if (editRecord.status === 'Present' && editRecord.timeIn >= "08:00") {
        updatedStatus = "Half Present";
      } else if (editRecord.status === 'Work From Home') {
        updatedStatus = "Present";
      }
    }
    const updatedRecord = {
      ...editRecord,
      status: updatedStatus,
      timeIn: timingRequired ? editRecord.timeIn : '-',
    };
    try {
      // Update document in top-level "employeesattendance" collection
      const attendanceDocRef = doc(db, "employeesattendance", editRecord.id);
      await updateDoc(attendanceDocRef, updatedRecord);
      setAttendance(attendance.map(rec => rec.id === updatedRecord.id ? updatedRecord : rec));
      setIsModalOpen(false);
      setEditRecord(null);
    } catch (error) {
      console.error("Error updating record:", error);
    }
  };

  const handleEditChange = (field, value) => {
    setEditRecord({
      ...editRecord,
      [field]: value,
    });
  };

  const modalRequiresTime =
    editRecord &&
    ((editRecord.status === 'Present' ||
      editRecord.status === 'Work From Home' ||
      editRecord.status === 'Holiday') ||
      (editRecord.timeIn && editRecord.timeIn !== '-'));

  return (
    <div className="bg-white min-h-screen flex flex-col items-center">
      <div className="w-full max-w-5xl p-10">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">
          Attendance Mark Sheet
        </h1>

        <div className="flex justify-between mb-10">
          <div className="p-4 bg-gray-100 rounded-l shadow-md">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              maxDate={new Date()}
              className="rounded-md"
              style={{ width: '200px' }}
            />
          </div>
          <div className="w-full ml-6">
            {/* Employee selection dropdown */}
            <div className="grid grid-cols-1 gap-4 mb-4">
              <select
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                onChange={handleEmployeeSelect}
                value={employeeId}
              >
                <option value="" disabled>
                  Select Employee
                </option>
                {filteredEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Read-only Name & Role fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Employee Name"
                className="p-3 border border-gray-300 rounded-md bg-gray-100"
                value={name}
                readOnly
                disabled
              />
              <input
                type="text"
                placeholder="Employee Role"
                className="p-3 border border-gray-300 rounded-md bg-gray-100"
                value={role}
                readOnly
                disabled
              />
            </div>

            {/* Status and Time In fields */}
            <div className={`grid ${requiresTime ? "grid-cols-2" : "grid-cols-1"} gap-4 mb-4`}>
              <select
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Present">Present</option>
                <option value="Approved Leave">Approved Leave</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="Absent">Absent</option>
                <option value="Holiday">Holiday</option>
              </select>
              {requiresTime && (
                <select
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                >
                  {timeOptions.map((time, index) => (
                    <option key={index} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={markAttendance}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-md transition"
            >
              Mark Attendance
            </button>
          </div>
        </div>

        {requiresTime && (
          <div className="mb-6 text-sm text-gray-600">
            Office Timing: 06:00 to 15:00 (Select from dropdown)
          </div>
        )}

        {/* Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <input
            type="text"
            placeholder="Search by name"
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <select
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Half Present">Half Present</option>
            <option value="Approved Leave">Approved Leave</option>
            <option value="Work From Home">Work From Home</option>
            <option value="Emergency Leave">Emergency Leave</option>
            <option value="Medical Leave">Medical Leave</option>
            <option value="Absent">Absent</option>
            <option value="Holiday">Holiday</option>
          </select>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-blue-500 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Role</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Time In</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendanceRecords.map(record => (
                <tr key={record.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-700">{record.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{record.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{record.role}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full font-medium ${
                        record.status === 'Present'
                          ? 'bg-green-200 text-green-800'
                          : record.status === 'Half Present'
                          ? 'bg-yellow-200 text-yellow-800'
                          : record.status === 'Absent'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{record.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{record.timeIn}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => openEditModal(record)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold p-2 rounded-md transition"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAttendanceRecords.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-center text-sm text-gray-700" colSpan="7">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editRecord && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-lg shadow-2xl z-10 p-6 w-full max-w-lg">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-2xl font-bold">Edit Attendance</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-800">
                X
              </button>
            </div>
            <div className="space-y-4">
              {/* Disabled Name and Role fields */}
              <div>
                <label className="block mb-1 font-medium">Name</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-100"
                  value={editRecord.name}
                  disabled
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Role</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-100"
                  value={editRecord.role}
                  disabled
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Status</label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={editRecord.status}
                  onChange={(e) => handleEditChange('status', e.target.value)}
                >
                  <option value="Present">Present</option>
                  <option value="Approved Leave">Approved Leave</option>
                  <option value="Work From Home">Work From Home</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Absent">Absent</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
              {modalRequiresTime && (
                <div>
                  <label className="block mb-1 font-medium">Time In</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={editRecord.timeIn}
                    onChange={(e) => handleEditChange('timeIn', e.target.value)}
                  >
                    {timeOptions.map((time, index) => (
                      <option key={index} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-semibold p-2 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={updateRecord}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded-md transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarkSheet;
