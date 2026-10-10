import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FarmManagement from './pages/FarmManagement';
import Advisory from './pages/Advisory';
import Activities from './pages/Activities';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="farms" element={<FarmManagement />} />
          <Route path="advisory" element={<Advisory />} />
          <Route path="activities" element={<Activities />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
