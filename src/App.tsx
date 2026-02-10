import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FinancialCalculator } from "./routes/FinancialCalculator";
import { Forecasting } from "./routes/Forecasting";
import { Home } from "./routes/Home";
import { HomeAssistantLanding } from "./routes/HomeAssistantLanding";
import { HomeAssistantTool } from "./routes/HomeAssistantTool";
import { MyPortfolios } from "./routes/MyPortfolios";
import { PortfolioAdvisorLanding } from "./routes/PortfolioAdvisorLanding";
import { PortfolioAdvisorTool } from "./routes/PortfolioAdvisorTool";
import { StrategyExplorerLanding } from "./routes/StrategyExplorerLanding";
import { TechnicalAnalysis } from "./routes/TechnicalAnalysis";

function App() {
  return (
    <Layout>
      <Routes>
        {/* Home - Tool Selector */}
        <Route path="/" element={<Home />} />

        {/* Group 1: Strategy Explorer (Policymakers, Researchers) */}
        <Route
          path="/strategy-explorer"
          element={<StrategyExplorerLanding />}
        />

        {/* Group 2: Portfolio Advisor (Financial Institutions, ESCOs) */}
        <Route
          path="/portfolio-advisor"
          element={<PortfolioAdvisorLanding />}
        />
        <Route
          path="/portfolio-advisor/tool"
          element={<PortfolioAdvisorTool />}
        />

        {/* Group 3: Home Assistant (Homeowners) */}
        <Route path="/home-assistant" element={<HomeAssistantLanding />} />
        <Route path="/home-assistant/tool" element={<HomeAssistantTool />} />

        {/* Expert Tools - Direct access to underlying calculators */}
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

        {/* User Data Management */}
        <Route
          path="/my-portfolios"
          element={
            <ProtectedRoute>
              <MyPortfolios />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
