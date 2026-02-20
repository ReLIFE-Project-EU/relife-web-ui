import { AppShell, Box } from "@mantine/core";
import { useDisclosure, useElementSize } from "@mantine/hooks";
import { useState, type ReactNode } from "react";
import { GlobalLoadingOverlay } from "./GlobalLoadingOverlay";
import { LayoutFooter } from "./LayoutFooter";
import { LayoutHeader } from "./LayoutHeader";
import { LayoutNavbar } from "./LayoutNavbar";

interface LayoutProps {
  children: ReactNode;
}

const DEFAULT_FOOTER_HEIGHT = 200;
const HEADER_NAV_HEIGHT = 60;
const NOTICE_HEIGHT = 32;

export const Layout = ({ children }: LayoutProps) => {
  const [opened, { toggle }] = useDisclosure();
  const [showNotice, setShowNotice] = useState(true);
  const { ref: footerRef, height: footerHeight } = useElementSize();
  const computedFooterHeight = footerHeight || DEFAULT_FOOTER_HEIGHT;
  const computedHeaderHeight =
    HEADER_NAV_HEIGHT + (showNotice ? NOTICE_HEIGHT : 0);

  return (
    <>
      <GlobalLoadingOverlay />
      <AppShell
        padding="md"
        header={{ height: computedHeaderHeight }}
        navbar={{
          width: 280,
          breakpoint: "lg",
          collapsed: { mobile: !opened },
        }}
        footer={{ height: computedFooterHeight }}
      >
        <LayoutHeader
          opened={opened}
          onToggle={toggle}
          showNotice={showNotice}
          onCloseNotice={() => setShowNotice(false)}
        />
        <LayoutNavbar />
        <AppShell.Main>
          <Box pt="lg">{children}</Box>
        </AppShell.Main>
        <LayoutFooter ref={footerRef} />
      </AppShell>
    </>
  );
};
