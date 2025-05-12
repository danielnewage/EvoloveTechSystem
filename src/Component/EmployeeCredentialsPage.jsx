import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ActivityIndicator from "./ActivityIndicator";

const SECURITY_CODE = "9899"; // change to your secure key

const initialForm = {
  id: null,
  employeeName: "",
  companyEmail: "",
  companyEmailPassword: "",
  companyTeamPassword: "",
  agentName: "",
  laptopPassword: "",
};

const EmployeeCredentialsPage = () => {
  const db = getFirestore();
  const employeesRef = collection(db, "employees");
  const credsRef = collection(db, "employeeCredentials");

  const [employees, setEmployees] = useState([]);
  const [creds, setCreds] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [empSnap, credSnap] = await Promise.all([
          getDocs(employeesRef),
          getDocs(credsRef),
        ]);
        setEmployees(
          empSnap.docs.map((d) => ({ id: d.id, name: d.data().name }))
        );
        setCreds(credSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openModal = (item = null) => {
    setFormData(item || initialForm);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setFormData(initialForm);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id, ...data } = formData;
    if (Object.values(data).some((v) => !v))
      return alert("Please fill all fields.");
    try {
      if (id) {
        await updateDoc(doc(db, "employeeCredentials", id), data);
        setCreds((list) =>
          list.map((x) => (x.id === id ? formData : x))
        );
      } else {
        const { id: newId } = await addDoc(credsRef, data);
        setCreds((list) => [...list, { id: newId, ...data }]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, "employeeCredentials", id));
      setCreds((list) => list.filter((x) => x.id !== id));
      closeViewModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleView = (item) => {
    const code = prompt("Enter security code:");
    if (code === SECURITY_CODE) {
      setViewData(item);
      setViewModalOpen(true);
    } else {
      alert("Incorrect security code.");
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewData(null);
  };

  const exportPDF = () => {
    const code = prompt("Enter security code to export PDF:");
    if (code !== SECURITY_CODE) {
      alert("Incorrect code. Cannot export.");
      return;
    }
    const docInst = new jsPDF();
    docInst.text("Employee Credentials", 20, 20);
    autoTable(docInst, {
      startY: 30,
      head: [["Employee", "Email", "Team Pass", "Agent", "Laptop Pass"]],
      body: creds.map((c) => [
        c.employeeName,
        c.companyEmail,
        c.companyTeamPassword,
        c.agentName,
        c.laptopPassword,
      ]),
    });
    docInst.save("credentials.pdf");
  };

  if (loading) {
    return <ActivityIndicator message="Loading ..." />;
  }
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 bg-gray-100 rounded-2xl shadow-lg">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-800">
          Employee Credentials
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPDF}
            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
          >
            Export PDF
          </button>
          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Add New
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              {[
                "Employee",
                "Email",
                "Team Pass",
                "Agent",
                "Laptop Pass",
                "Actions",
              ].map((col) => (
                <th
                  key={col}
                  className="px-4 sm:px-6 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {creds.length ? (
              creds.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-3 text-sm sm:text-base">
                    {c.employeeName}
                  </td>

                  <td className="px-4 sm:px-6 py-3 text-sm sm:text-base">
                    {c.companyEmail}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-sm sm:text-base">
                    ••••••
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-sm sm:text-base">
                    {c.agentName}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-sm sm:text-base">
                    ••••••
                  </td>
                  <td className="px-4 sm:px-6 py-3 space-x-2">
                    <button
                      onClick={() => handleView(c)}
                      className="px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openModal(c)}
                      className="px-2 py-1 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-8 text-center text-gray-500 text-sm sm:text-base"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center bg-blue-600 px-4 py-3">
              <h2 className="text-white text-xl">
                {formData.id ? "Edit" : "Add"} Credentials
              </h2>
              <button
                onClick={closeModal}
                className="text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block mb-1">Employee Name*</label>
                <select
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleChange}
                  className="w-full border rounded p-2"
                >
                  <option value="">Select Name</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                  <option value="Nothing Use">No Use</option>
                  <option value="CEO">CEO</option>
                  <option value="CFO">CFO</option>
                  <option value="Main Account">Main Account</option>
                  <option value="Billing">Billing</option>
                  <option value="Other">Other</option>


                </select>
              </div>
              {[
                {
                  name: "companyEmail",
                  label: "Company Email",
                  type: "email",
                },
                {
                  name: "companyEmailPassword",
                  label: "Email Password",
                  type: "password",
                },
                {
                  name: "companyTeamPassword",
                  label: "Team Password",
                  type: "password",
                },
                {
                  name: "agentName",
                  label: "Agent Name",
                  type: "text",
                },
                {
                  name: "laptopPassword",
                  label: "Laptop Password",
                  type: "password",
                },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block mb-1">{f.label}*</label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={formData[f.name]}
                    onChange={handleChange}
                    className="w-full border rounded p-2"
                  />
                </div>
              ))}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {formData.id ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModalOpen && viewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center bg-blue-600 px-4 py-3">
              <h2 className="text-white text-xl">View Credentials</h2>
              <button
                onClick={closeViewModal}
                className="text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4 space-y-2 text-gray-800">
              {Object.entries(viewData)
                .filter(([key]) => key !== "id")
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1")}:
                    </span>
                    <span>{value || "N/A"}</span>
                  </div>
                ))}
            </div>
            <div className="p-4 flex justify-end space-x-2 bg-gray-50">
              <button
                onClick={() => handleDelete(viewData.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
              <button
                onClick={closeViewModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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

export default EmployeeCredentialsPage;
