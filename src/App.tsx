import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./routes/Home";
import { FinancialAnalysis } from "./routes/FinancialAnalysis";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/financial" element={<FinancialAnalysis />} />
      </Routes>
    </Layout>
  );
}

export default App;
