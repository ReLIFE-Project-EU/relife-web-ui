import { AppShell, ScrollArea } from "@mantine/core";
import {
  IconCalculator,
  IconChartDots,
  IconChartLine,
  IconFileAnalytics,
  IconHome,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import classes from "./LayoutNavbar.module.css";
import { LinksGroup } from "./NavbarLinksGroup";

const mockdata = [
  { label: "Home", icon: IconHome, link: "#" },
  { label: "Financial Analysis", icon: IconCalculator, link: "#financial" },
  { label: "Technical Analysis", icon: IconChartLine, link: "#technical" },
  { label: "Forecasting", icon: IconChartDots, link: "#forecasting" },
  {
    label: "Reports",
    icon: IconFileAnalytics,
    initiallyOpened: true,
    link: "#reports",
    links: [
      { label: "Monthly Overview", link: "#reports/monthly" },
      { label: "Yearly Summary", link: "#reports/yearly" },
      { label: "Export Data", link: "#reports/export" },
    ],
  },
];

export const LayoutNavbar = () => {
  const [activeHash, setActiveHash] = useState<string>(
    window.location.hash || "#",
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

  const links = mockdata.map((item) => {
    const hasActiveChild = item.links?.some(
      (child) => child.link === activeHash || activeHash.startsWith(child.link),
    );

    return (
      <LinksGroup
        {...item}
        key={item.label}
        active={
          item.link === activeHash ||
          (item.link === "#" && activeHash === "#") ||
          hasActiveChild
        }
        activeHash={activeHash}
        onNavigate={(link) => {
          window.location.hash = link;
        }}
      />
    );
  });

  return (
    <AppShell.Navbar className={classes.navbar}>
      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>{links}</div>
      </ScrollArea>
    </AppShell.Navbar>
  );
};
