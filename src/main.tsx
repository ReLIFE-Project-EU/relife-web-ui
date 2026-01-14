import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import App from "./App.tsx";
import { theme } from "./theme";
import { GlobalLoadingProvider } from "./contexts/global-loading";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme}>
        <GlobalLoadingProvider>
          <App />
        </GlobalLoadingProvider>
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
);
