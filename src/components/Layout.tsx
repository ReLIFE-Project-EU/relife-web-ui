import { AppShell } from "@mantine/core";
import { useDisclosure, useElementSize } from "@mantine/hooks";
import type { ReactNode } from "react";
import { LayoutHeader } from "./LayoutHeader";
import { LayoutFooter } from "./LayoutFooter";
import { LayoutNavbar } from "./LayoutNavbar";

interface LayoutProps {
  children: ReactNode;
}

const DEFAULT_FOOTER_HEIGHT = 200;

export const Layout = ({ children }: LayoutProps) => {
  const [opened, { toggle }] = useDisclosure();
  const { ref: footerRef, height: footerHeight } = useElementSize();
  const computedFooterHeight = footerHeight || DEFAULT_FOOTER_HEIGHT;

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "lg",
        collapsed: { mobile: !opened },
      }}
      footer={{ height: computedFooterHeight }}
    >
      <LayoutHeader opened={opened} onToggle={toggle} />
      <LayoutNavbar />
      <AppShell.Main>{children}</AppShell.Main>
      <LayoutFooter ref={footerRef} />
    </AppShell>
  );
};
