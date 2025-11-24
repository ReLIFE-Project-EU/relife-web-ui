import { AppShell, Stack, NavLink } from "@mantine/core";
import {
  IconHome,
  IconChartLine,
  IconCalculator,
  IconChartDots,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";

export const LayoutNavbar = () => {
  const [activeHash, setActiveHash] = useState<string>(
    window.location.hash || "#"
  );

  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash || "#");
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return (
    <AppShell.Navbar p="md">
      <Stack gap="xs">
        <NavLink
          label="Home"
          leftSection={<IconHome size={20} />}
          active={activeHash === "#" || activeHash === ""}
          href="#"
        />
        <NavLink
          label="Financial Analysis"
          leftSection={<IconCalculator size={20} />}
          active={activeHash === "#financial"}
          href="#financial"
        />
        <NavLink
          label="Technical Analysis"
          leftSection={<IconChartLine size={20} />}
          active={activeHash === "#technical"}
          href="#technical"
        />
        <NavLink
          label="Forecasting"
          leftSection={<IconChartDots size={20} />}
          active={activeHash === "#forecasting"}
          href="#forecasting"
        />
      </Stack>
    </AppShell.Navbar>
  );
};
