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
import { db } from '../Services/firebaseConfig';

const AttendanceMarkSheet = () => {
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const [selectedTime, setSelectedTime] = useState(getCurrentTime());
  const [updateSelectedTime, setupdateSelectedTime] = useState(getCurrentTime());

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const [attendance, setAttendance] = useState([]);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Present');
  const [lateArrivalApproved, setLateArrivalApproved] = useState('No');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter and modal states
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState([]);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayOption, setHolidayOption] = useState('No');

  const [employees, setEmployees] = useState([]);

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

  const isWithinAttendanceWindow = () => {
    const now = new Date();
    const currentHour = now.getHours();
    return currentHour >= 11 || currentHour < 3;
  };

  const markAttendance = async () => {
    if (!isWithinAttendanceWindow()) {
      alert("Attendance can only be marked between 17:00 and 02:00.");
      return;
    }
    if (name.trim() === '' || role.trim() === '' || employeeId === '') {
      alert("Please select an employee (name and role).");
      return;
    }
    if (selectedDate > new Date()) {
      alert("Selected date cannot be in the future.");
      return;
    }
    const currentTime = selectedTime;
    let finalStatus = status;
    if (isWeekend(selectedDate)) {
      finalStatus = "Off";
    } else if (status === 'Holiday') {
      finalStatus = "Holiday";
    } else {
      if (status === 'Present' && currentTime >= "20:00" && lateArrivalApproved === 'No') {
        finalStatus = "Half Present";
      } else if (status === 'Work From Home') {
        finalStatus = "Work From Home";
      }
    }
    const dateString = selectedDate.toLocaleDateString('en-US');
    const newRecord = {
      name,
      role,
      employeeId,
      status: finalStatus,
      date: dateString,
      timeIn: currentTime,
      lateArrivalApproved,
      createdAt: new Date()
    };
    try {
      const subcollectionRef = collection(db, "employees", employeeId, "attendance");
      await addDoc(subcollectionRef, newRecord);
      const topLevelRef = collection(db, "employeesattendance");
      const docRef = await addDoc(topLevelRef, newRecord);
      console.log("Attendance marked with ID:", docRef.id);
      setAttendance([...attendance, { id: docRef.id, ...newRecord }]);
      setEmployeeId('');
      setName('');
      setRole('');
      setLateArrivalApproved('No');
    } catch (error) {
      console.error("Error marking attendance:", error);
    }
  };

  const markHolidayAttendanceForAll = async () => {
    if (holidayOption !== 'Yes') {
      alert("Please select 'Yes' for holiday.");
      return;
    }
    if (!isWithinAttendanceWindow()) {
      alert("Attendance can only be marked between 17:00 and 02:00.");
      return;
    }
    const currentTime = selectedTime;
    const dateString = selectedDate.toLocaleDateString('en-US');
    const eligibleEmployees = employees.filter(
      emp =>
        emp.employmentType !== "Remote" &&
        emp.employmentType !== "Myself" &&
        !attendance.some(record => record.employeeId === emp.id && record.date === dateString)
    );
    if (eligibleEmployees.length === 0) {
      alert("Attendance for all eligible employees has already been marked for the selected date.");
      return;
    }
    for (const emp of eligibleEmployees) {
      const holidayRecord = {
        name: emp.name,
        role: emp.role,
        employeeId: emp.id,
        status: isWeekend(selectedDate) ? "Off" : "Present",
        date: dateString,
        timeIn: currentTime,
        lateArrivalApproved: "No",
        createdAt: new Date()
      };
      try {
        const subcollectionRef = collection(db, "employees", emp.id, "attendance");
        await addDoc(subcollectionRef, holidayRecord);
        const topLevelRef = collection(db, "employeesattendance");
        const docRef = await addDoc(topLevelRef, holidayRecord);
        console.log("Holiday attendance marked for", emp.name, "with ID:", docRef.id);
        setAttendance(prev => [...prev, { id: docRef.id, ...holidayRecord }]);
      } catch (error) {
        console.error("Error marking holiday attendance for", emp.name, error);
      }
    }
    setIsHolidayModalOpen(false);
    setHolidayOption('No');
  };

  const currentDateString = selectedDate.toLocaleDateString('en-US');

  const filteredEmployees = employees.filter(
    emp =>
      emp.employmentType !== "Remote" &&
      emp.employmentType !== "Myself" &&
      !attendance.some(record => record.employeeId === emp.id && record.date === currentDateString)
  );

  const filteredAttendanceRecords = attendance.filter(record => {
    if (filterName.trim() && !record.name.toLowerCase().includes(filterName.toLowerCase())) {
      return false;
    }
    if (filterStatus !== 'All' && record.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const openEditModal = (record) => {
    if (attendance.find(rec => rec.employeeId === record.employeeId && rec.date === currentDateString)) {
      setEditRecord(record);
      setupdateSelectedTime(record.timeIn);           
      setIsModalOpen(true);
    } else {
      alert("No attendance record to edit. Please mark attendance first.");
    }
  };


  const updateRecord = async () => {
    if (!isWithinAttendanceWindow()) {
      alert("Attendance can only be updated between 17:00 and 03:00.");
      return;
    }
    if (!editRecord.name.trim() || !editRecord.role.trim()) {
      alert("Name and Role cannot be changed.");
      return;
    }

    const currentTime = updateSelectedTime;            // ← use the modal’s time
    let updatedStatus = editRecord.status;

    if (isWeekend(selectedDate)) {
      updatedStatus = "Off";
    } else if (editRecord.status === 'Holiday') {
      updatedStatus = "Present";
    } else {
      // now this will see the time the user picked in the modal
      if (editRecord.status === 'Present' &&
        currentTime >= "20:00" &&
        editRecord.lateArrivalApproved === 'No') {
        updatedStatus = "Half Present";
      } else if (editRecord.status === 'Work From Home') {
        updatedStatus = "Present";
      }
    }

    const updatedRecord = {
      ...editRecord,
      status: updatedStatus,
      timeIn: currentTime,    // ensure timeIn and status line up
    };
    try {
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
            <div className="grid grid-cols-1 gap-4 mb-4">
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
              </select>
            </div>
            {(status === 'Present' || status === 'Work From Home') && (
              <div className="grid grid-cols-1 gap-4 mb-4">
                <label className="font-medium">Late Arrival Approved?</label>
                <select
                  className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={lateArrivalApproved}
                  onChange={(e) => setLateArrivalApproved(e.target.value)}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 mb-4">
              <label className="font-medium">Select Time:</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                step="600"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              onClick={markAttendance}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-3 rounded-md transition"
            >
              Mark Attendance
            </button>
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-semibold p-3 rounded-md transition"
            >
              Mark Holiday For All
            </button>
          </div>
        </div>

        {/* Display note about manual time selection */}
        <div className="mb-6 text-sm text-gray-600">
          Note: Please manually select the time.
        </div>

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
            <option value="Off">Off</option>
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
                      className={`px-3 py-1 rounded-full font-medium ${record.status === 'Present'
                        ? 'bg-green-200 text-green-800'
                        : record.status === 'Half Present'
                          ? 'bg-yellow-200 text-yellow-800'
                          : record.status === 'Absent'
                            ? 'bg-red-200 text-red-800'
                            : record.status === 'Off'
                              ? 'bg-gray-400 text-gray-800'
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
                  <option value="Approved Leave">Approved Leave</option>
                  <option value="Present">Present</option>
                  <option value="Work From Home">Work From Home</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Absent">Absent</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Off">Off</option>
                </select>
              </div>
              {(editRecord.status === 'Present' || editRecord.status === 'Work From Home') && (
                <div>
                  <label className="block mb-1 font-medium">Late Arrival Approved?</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={editRecord.lateArrivalApproved || 'No'}
                    onChange={(e) => handleEditChange('lateArrivalApproved', e.target.value)}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <label className="font-medium">Select Time:</label>
              <input
                type="time"
                value={updateSelectedTime}
                onChange={(e) => setupdateSelectedTime(e.target.value)}
                step="600"
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
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
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Mark Holiday For All</h3>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Is today a holiday?</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={holidayOption}
                onChange={(e) => setHolidayOption(e.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={markHolidayAttendanceForAll}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Mark Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceMarkSheet;
