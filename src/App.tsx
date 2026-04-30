import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { EditGate } from './pages/EditGate';
import { ViewPage } from './pages/ViewPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ViewPage />} />
        <Route path="/edit" element={<EditGate />} />
        <Route path="/view" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
