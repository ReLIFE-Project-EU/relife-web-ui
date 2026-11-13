import {
  IconBriefcase,
  IconBuildingEstate,
  IconHomeHeart,
} from "@tabler/icons-react";

/** The three ReLIFE tools, one per audience; shared by the Home cards and the sidebar. */
export const RELIFE_TOOLS = [
  {
    title: "Renovation Strategy Explorer",
    navLabel: "Strategy Explorer",
    audience: "Policymakers & Researchers",
    description:
      "Compare renovation packages for a building stock by budget, energy, or emissions.",
    icon: IconBuildingEstate,
    link: "/strategy-explorer",
    color: "blue",
  },
  {
    title: "Portfolio Renovation Advisor",
    navLabel: "Portfolio Advisor",
    audience: "Financial Institutions & ESCOs",
    description:
      "Assess renovation costs, energy savings, and financial returns across your buildings.",
    icon: IconBriefcase,
    link: "/portfolio-advisor",
    color: "teal",
  },
  {
    title: "Home Renovation Assistant",
    navLabel: "Home Assistant",
    audience: "Homeowners",
    description:
      "Compare renovation options for your home by cost, energy savings, and financial return.",
    icon: IconHomeHeart,
    link: "/home-assistant",
    color: "orange",
  },
] as const;
