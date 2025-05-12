import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { auth } from "./Services/firebaseConfig";
import ProtectedRoute from "./ProtectedRoute";

import LoginPage from "./Pages/Login";
import MainLayout from "./Pages/MainLayout";
import AttendanceLayout from "./Pages/ChildLayout";

import DashboardContent from "./Pages/Dashboard";
import Employees from "./Component/Empolyee";
import SalaryManagement from "./Component/SalaryManagement";
import EmployeeSalaryTable from "./Component/EmployeeSalaryTable";
import AttendanceMarkSheet from "./Component/Attandance";
import AttendanceSummary from "./Component/AttendanceSummary";
import SalaryManageAuto from "./Component/SalaryMngWithAttandance";
import EmployeeCredentialsPage from "./Component/EmployeeCredentialsPage";
// Set persistence once at startup
setPersistence(auth, browserLocalPersistence)
  .catch(err => console.error("Persistence error:", err));

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const isAttendanceUser = user?.email == "attendance@evolovetechsystems.com";
  // if(isAttendanceUser){
  //   console.log(true)
  // }
  // else{
  //   console.log(user?.email)

  // }
  return (
    <Router basename="/EvoloveTechSystem">
      <Routes>
        {/* Public Login */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Admin Section (single parent) */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              {isAttendanceUser ? <AttendanceLayout /> : <MainLayout />}
            </ProtectedRoute>
          }
        >
          {isAttendanceUser ? (
            <>
              <Route path="dashboard" element={<DashboardContent />} />
              {/* <Route path="employee" element={<Employees />} /> */}
              <Route index element={<Navigate to="attendance-mark" replace />} />
              <Route path="attendance-mark" element={<AttendanceMarkSheet />} />
              <Route path="attendance-summary" element={<AttendanceSummary />} />
              <Route path="*" element={<Navigate to="attendance-mark" replace />} />
            </>
          ) : (
            <>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardContent />} />
              <Route path="EmployeeCredentialsPage" element={<EmployeeCredentialsPage />} />
              <Route path="employee" element={<Employees />} />
              <Route path="management" element={<SalaryManagement />} />
              <Route path="salaries" element={<EmployeeSalaryTable />} />
              <Route path="attendance-mark" element={<AttendanceMarkSheet />} />
              <Route path="attendance-summary" element={<AttendanceSummary />} />
              <Route path="salary-auto" element={<SalaryManageAuto />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </>
          )}
        </Route>

        {/* Fallback to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
