import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import LessonManage from "./pages/teacher/LessonManage";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CreateLesson from "./pages/teacher/CreateLesson";
import ApproveLesson from "./pages/teacher/ApproveLesson";
import LessonStats from "./pages/teacher/LessonStats";
import StudentDashboard from "./pages/student/StudentDashboard";
import LessonViewer from "./pages/student/LessonViewer";
import LessonGroups from "./pages/teacher/LessonGroups";
import TestSession from "./pages/teacher/TestSession";
import GuestTest from "./pages/guest/GuestTest";

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registrace" element={<Register />} />
          <Route path="/pripojit" element={<GuestTest />} />
          <Route path="/pripojit/:code" element={<GuestTest />} />

          <Route
            path="/"
            element={
              user
                ? (["teacher", "admin"].includes(user.role) ? <Navigate to="/ucitel" replace /> : <Navigate to="/student" replace />)
                : <Navigate to="/login" replace />
            }
          />

          {/* UČITEL */}
          <Route path="/ucitel/skupiny" element={<ProtectedRoute roles={["teacher", "admin"]}><LessonGroups /></ProtectedRoute>} />
          <Route path="/ucitel/qr/:sessionId" element={<ProtectedRoute roles={["teacher", "admin"]}><TestSession /></ProtectedRoute>} />
          <Route
            path="/ucitel"
            element={
              <ProtectedRoute roles={["teacher", "admin"]}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ucitel/vytvorit"
            element={
              <ProtectedRoute roles={["teacher", "admin"]}>
                <CreateLesson />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ucitel/schvalit/:lessonId"
            element={
              <ProtectedRoute roles={["teacher", "admin"]}>
                <ApproveLesson />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ucitel/statistiky/:lessonId"
            element={
              <ProtectedRoute roles={["teacher", "admin"]}>
                <LessonStats />
              </ProtectedRoute>
            }
          />

          <Route path="/ucitel/lekce/:lessonId/sprava" element={
            <ProtectedRoute roles={["teacher", "admin"]}><LessonManage /></ProtectedRoute>
          } />

          {/* STUDENT */}
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/lekce/:lessonId"
            element={
              <ProtectedRoute roles={["student"]}>
                <LessonViewer />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
