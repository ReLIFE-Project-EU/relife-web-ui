import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./routes/Home";
import { FinancialAnalysis } from "./routes/FinancialAnalysis";
import { TechnicalAnalysis } from "./routes/TechnicalAnalysis";
import { Forecasting } from "./routes/Forecasting";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/financial" element={<FinancialAnalysis />} />
        <Route path="/technical" element={<TechnicalAnalysis />} />
        <Route path="/forecasting" element={<Forecasting />} />
      </Routes>
    </Layout>
  );
}

export default App;
