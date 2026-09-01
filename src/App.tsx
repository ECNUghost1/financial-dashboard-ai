import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AddRecord } from './pages/AddRecord';
import { EditRecord } from './pages/EditRecord';
import { RecordHistory } from './pages/RecordHistory';
import { Calendar } from './pages/Calendar';
import { Statistics } from './pages/Statistics';

function App() {
  const { checkAuth, user, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/add" element={user ? <AddRecord /> : <Navigate to="/" />} />
        <Route path="/edit/:id" element={user ? <EditRecord /> : <Navigate to="/" />} />
        <Route path="/history/:id" element={user ? <RecordHistory /> : <Navigate to="/" />} />
        <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/" />} />
        <Route path="/statistics" element={user ? <Statistics /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
