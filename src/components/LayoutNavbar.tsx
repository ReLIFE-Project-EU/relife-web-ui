import { AppShell, ScrollArea } from "@mantine/core";
import {
  IconCalculator,
  IconChartDots,
  IconChartLine,
  IconFileAnalytics,
  IconHome,
} from "@tabler/icons-react";
import { useLocation } from "react-router-dom";
import classes from "./LayoutNavbar.module.css";
import { LinksGroup } from "./NavbarLinksGroup";

const navigationData = [
  { label: "Home", icon: IconHome, link: "/" },
  { label: "Financial Analysis", icon: IconCalculator, link: "/financial" },
  { label: "Technical Analysis", icon: IconChartLine, link: "/technical" },
  { label: "Forecasting", icon: IconChartDots, link: "/forecasting" },
  {
    label: "Reports",
    icon: IconFileAnalytics,
    initiallyOpened: true,
    links: [{ label: "Export Data", link: "/reports/export" }],
  },
];

export const LayoutNavbar = () => {
  const location = useLocation();
  const activePath = location.pathname;

  const links = navigationData.map((item) => {
    const hasActiveChild = item.links?.some(
      (child) => child.link === activePath || activePath.startsWith(child.link),
    );

    return (
      <LinksGroup
        {...item}
        key={item.label}
        active={item.link === activePath || hasActiveChild}
        activePath={activePath}
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
