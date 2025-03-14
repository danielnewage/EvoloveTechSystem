// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./Pages/MainLayout";
import LoginPage from "./Pages/Login";
import DashboardContent from "./Pages/Dashboard";
import Employees from "./Component/Empolyee";
import SalaryManagement from "./Component/SalaryManagement";
import ProtectedRoute from "./ProtectedRoute"; // Ensure this path is correct
import { browserLocalPersistence, setPersistence } from "firebase/auth";
import { auth } from "./Services/firebaseConfig";
import EmployeeSalaryTable from "./Component/EmployeeSalaryTable";
import AttendanceMarkSheet from "./Component/Attandance";

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // Persistence set successfully
  })
  .catch((error) => {
    console.error("Failed to set persistence:", error);
  });

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardContent />} />
          <Route path="dashboard" element={<DashboardContent />} />
          <Route path="employee" element={<Employees />} />
          <Route path="management" element={<SalaryManagement />} />
          <Route path="EmployeeSalaryList" element={<EmployeeSalaryTable />} />
          <Route path="AttendanceMarkSheet" element={<AttendanceMarkSheet />} />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
