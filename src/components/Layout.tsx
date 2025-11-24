import { AppShell, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { LayoutHeader } from "./LayoutHeader";
import { LayoutFooter } from "./LayoutFooter";
import { LayoutNavbar } from "./LayoutNavbar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "lg",
        collapsed: { mobile: !opened },
      }}
      footer={{ height: "auto", offset: false }}
    >
      <LayoutHeader opened={opened} onToggle={toggle} />
      <LayoutNavbar />
      <AppShell.Main
        display="flex"
        style={{ flexDirection: "column", minHeight: "100vh" }}
      >
        <Box flex={1} p="md">
          {children}
        </Box>
        <LayoutFooter />
      </AppShell.Main>
    </AppShell>
  );
};
