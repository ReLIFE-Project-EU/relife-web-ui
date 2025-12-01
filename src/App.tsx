import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FinancialCalculator } from "./routes/FinancialCalculator";
import { Forecasting } from "./routes/Forecasting";
import { Home } from "./routes/Home";
import { TechnicalAnalysis } from "./routes/TechnicalAnalysis";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/financial" element={<FinancialCalculator />} />
        <Route path="/technical" element={<TechnicalAnalysis />} />
        <Route
          path="/forecasting"
          element={
            <ProtectedRoute>
              <Forecasting />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
