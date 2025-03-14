// Component/Employee.jsx
import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  
} from "firebase/firestore";
import { auth } from "../Services/firebaseConfig";
import ActivityIndicator from "./ActivityIndicator"; // Adjust path if needed

const Employees = () => {
  const db = getFirestore();
  const employeesCollection = collection(db, "employees");

  // Employees state (fetched from Firestore)
  const [employees, setEmployees] = useState([]);
  // Loading state for data fetch
  const [loading, setLoading] = useState(true);

  // Modal control states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Updated form state with additional fields
  const [formData, setFormData] = useState({
    id: null, // Firestore document id when editing
    name: "",
    dob: "", // Date of Birth
    gender: "", // e.g., Male, Female, Other
    address: "",
    email: "",
    phone: "",
    employeeId: "", // Custom employee id if needed
    role: "", // Designation/Role
    department: "", // Optional
    joiningDate: "",
    password: "", // System access password if required
    // Removed permissionLevel
    emergencyContact: "", // Optional
    bankAccount: "", // Bank Account Details for payroll
    employmentType: "", // e.g., Full-time, Part-time, Contract, Remote, Trainee, Internship, etc.
    cnic: "",
    salary: "",
  });

  // Fetch employees from Firestore when component mounts
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const querySnapshot = await getDocs(employeesCollection);
        const employeesData = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setEmployees(employeesData);
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [employeesCollection]);

  // Toggle Add/Edit Modal and reset form if needed
  const openFormModal = (employee = null) => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        id: null,
        name: "",
        dob: "",
        gender: "",
        address: "",
        email: "",
        phone: "",
        employeeId: "",
        role: "",
        department: "",
        joiningDate: "",
        password: "",
        emergencyContact: "",
        bankAccount: "",
        employmentType: "",
        cnic: "",
        salary: "",
      });
    }
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setFormData({
      id: null,
      name: "",
      dob: "",
      gender: "",
      address: "",
      email: "",
      phone: "",
      employeeId: "",
      role: "",
      department: "",
      joiningDate: "",
      password: "",
      emergencyContact: "",
      bankAccount: "",
      employmentType: "",
      cnic: "",
      salary: "",
    });
  };

  // Delete modal controls
  const openDeleteModal = (employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedEmployee(null);
  };

  // View modal controls
  const openViewModal = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEmployee(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission for add or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check if required fields are filled (department is optional)
    if (
      !formData.name ||
      !formData.dob ||
      !formData.gender ||
      !formData.address ||
      !formData.email ||
      !formData.phone ||
      !formData.employeeId ||
      !formData.role ||
      !formData.joiningDate ||
      !formData.employmentType
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      if (formData.id) {
        // Update existing employee in Firestore
        const employeeDocRef = doc(db, "employees", formData.id);
        await updateDoc(employeeDocRef, {
          name: formData.name,
          dob: formData.dob,
          gender: formData.gender,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          employeeId: formData.employeeId,
          role: formData.role,
          department: formData.department,
          joiningDate: formData.joiningDate,
          password: formData.password,
          emergencyContact: formData.emergencyContact,
          bankAccount: formData.bankAccount,
          employmentType: formData.employmentType,
          cnic: formData.cnic,
          salary: formData.salary,
        });
        // Update local state
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === formData.id ? { ...formData } : emp))
        );
      } else {
        // Add new employee to Firestore
        const docRef = await addDoc(employeesCollection, {
          name: formData.name,
          dob: formData.dob,
          gender: formData.gender,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          employeeId: formData.employeeId,
          role: formData.role,
          department: formData.department,
          joiningDate: formData.joiningDate,
          password: formData.password,
          emergencyContact: formData.emergencyContact,
          bankAccount: formData.bankAccount,
          employmentType: formData.employmentType,
          cnic: formData.cnic,
          salary: formData.salary,
        });
        setEmployees((prev) => [
          ...prev,
          { id: docRef.id, ...formData },
        ]);
      }
      closeFormModal();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  // Handle delete employee
  const handleDelete = async () => {
    if (selectedEmployee) {
      try {
        await deleteDoc(doc(db, "employees", selectedEmployee.id));
        setEmployees((prev) =>
          prev.filter((emp) => emp.id !== selectedEmployee.id)
        );
        closeDeleteModal();
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF("p", "pt");
    const tableColumn = [
      "ID",
      "Name",
      "DOB",
      "Gender",
      "Address",
      "Email",
      "Phone",
      "Employee ID",
      "Role",
      "Department",
      "Joining Date",
      "Salary",
    ];
    const tableRows = employees.map((emp) => [
      emp.id,
      emp.name,
      emp.dob,
      emp.gender,
      emp.address,
      emp.email,
      emp.phone,
      emp.employeeId,
      emp.role,
      emp.department,
      emp.joiningDate,
      emp.salary,
    ]);

    doc.setFontSize(18);
    doc.text("Employee List", 40, 40);
    autoTable(doc, {
      startY: 60,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [22, 160, 133] },
      margin: { left: 40, right: 40 },
    });
    doc.save("employee_list.pdf");
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(employees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employee_list.xlsx");
  };

  const freezeEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      // Copy employee data to "exEmployees" collection with a frozen timestamp.
      const exEmpDocRef = await addDoc(collection(db, "exEmployees"), {
        ...selectedEmployee,
        frozenAt: new Date().toISOString(),
      });
      console.log("Employee data frozen to exEmployees:", exEmpDocRef.id);
  
      // Access salaries as a subcollection under the employee in "employees"
      const salaryCollectionRef = collection(db, "employees", selectedEmployee.id, "salaries");
      const salarySnapshot = await getDocs(salaryCollectionRef);
  
      // For each salary document, copy it to the subcollection "exSalaries" inside the frozen employee doc
      salarySnapshot.forEach(async (salaryDoc) => {
        console.log("Freezing salary document:", salaryDoc.id);
        await addDoc(collection(db, "exEmployees", exEmpDocRef.id, "exSalaries"), {
          ...salaryDoc.data(),
          frozenAt: new Date().toISOString(),
        });
        console.log("Salary document frozen to exSalaries inside exEmployees:", salaryDoc.id);
        // Delete the salary document from the original subcollection.
        await deleteDoc(doc(db, "employees", selectedEmployee.id, "salaries", salaryDoc.id));
        console.log("Salary document deleted from employees:", salaryDoc.id);
      });
  
      // Delete employee document from "employees" collection.
      await deleteDoc(doc(db, "employees", selectedEmployee.id));
      console.log("Employee document deleted:", selectedEmployee.id);
  
      alert("Employee and related salary details have been frozen and removed from active records.");
      // Update local state to remove the employee.
      setEmployees((prev) => prev.filter((emp) => emp.id !== selectedEmployee.id));
      closeViewModal();
    } catch (error) {
      console.error("Error freezing employee:", error);
      alert("There was an error freezing the employee.");
    }
  };
  
  

  if (loading) {
    return <ActivityIndicator message="Loading ..." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Employee Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={exportPDF}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
          >
            Export PDF
          </button>
          <button
            onClick={exportExcel}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            Export Excel
          </button>
          <button
            onClick={() => openFormModal()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Add Employee
          </button>
        </div>
      </div>

      {/* Employees Table: Only showing Employee ID, Name, Role, and Actions */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2 text-left">Employee ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-t">
                <td className="px-4 py-2">{employee.employeeId}</td>
                <td className="px-4 py-2">{employee.name}</td>
                <td className="px-4 py-2">{employee.role}</td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => openViewModal(employee)}
                    className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openFormModal(employee)}
                    className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
                  >
                    Edit
                  </button>
                  {/* <button
                    onClick={() => openDeleteModal(employee)}
                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button> */}
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan="4" className="px-4 py-2 text-center text-gray-500">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl overflow-y-auto max-h-full">
            <h3 className="text-xl font-semibold mb-4">
              {formData.id ? "Edit Employee" : "Add Employee"}
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <h4 className="text-lg font-medium mb-2">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="name">
                    Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="dob">
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    id="dob"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="gender">
                    Gender*
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="address">
                    Address*
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Contact Details */}
              <h4 className="text-lg font-medium mb-2">Contact Details</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="email">
                    Email Address*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="phone">
                    Phone Number*
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Professional Details */}
              <h4 className="text-lg font-medium mb-2">Professional Details</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="employeeId">
                    Employee ID*
                  </label>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter employee ID"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="role">
                    Designation/Role*
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Select Role</option>
                    <option value="Sales Agent">Sales Agent</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Manager">Manager</option>
                    <option value="IT Lead">IT Lead</option>
                    <option value="Team Lead & Dispatcher">
                      Team Lead & Dispatcher
                    </option>
                    <option value="COO">COO</option>
                    <option value="CFO">CFO</option>
                    <option value="CEO">CEO</option>
                    <option value="Office Boy">Office Boy</option>
                    <option value="HR">HR</option>
                    <option value="Marketing Team">Marketing Team</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="department">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter department"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="joiningDate">
                    Date of Joining*
                  </label>
                  <input
                    type="date"
                    id="joiningDate"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="salary">
                    Salary
                  </label>
                  <input
                    type="text"
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter salary (e.g., RS: 5000)"
                  />
                </div>
              </div>

              {/* System Access & Additional Information */}
              <h4 className="text-lg font-medium mb-2">
                System Access & Additional Information
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="password">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter system password"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="emergencyContact">
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="text"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter emergency contact"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="bankAccount">
                    Bank Account Details
                  </label>
                  <input
                    type="text"
                    id="bankAccount"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="Enter bank account details"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1" htmlFor="employmentType">
                    Employment Type*
                  </label>
                  <select
                    id="employmentType"
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Select Employment Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                    <option value="Trainee">Trainee</option>
                    <option value="Internship">Internship</option>
                    <option value="Myself">Myself</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  {formData.id ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold">{selectedEmployee.name}</span>?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={closeDeleteModal}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-2xl z-10 p-8 w-full max-w-2xl overflow-y-auto max-h-full">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Employee Details</h2>
              <button
                onClick={closeViewModal}
                className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 uppercase">Employee ID</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.employeeId}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Name</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Date of Birth</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.dob || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Gender</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.gender || "N/A"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 uppercase">Address</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.address || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Email</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Phone</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Role</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.role}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Department</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.department || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Date of Joining</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.joiningDate}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Salary</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.salary || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Employment Type</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.employmentType || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">CNIC</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.cnic || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Emergency Contact</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.emergencyContact || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Bank Account</p>
                <p className="text-lg text-gray-800 font-medium">
                  {selectedEmployee.bankAccount || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-8 space-x-4">
              <button
                onClick={freezeEmployee}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Freeze Employee
              </button>
              <button
                onClick={closeViewModal}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors"
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

export default Employees;
