/**
 * Financing type selector: the exclusive "how is the cost covered" axis
 * (own funds vs loan), plus the loan terms when a loan is chosen.
 *
 * Shared by HRA and PRA, so it is fully controlled — no tool context inside.
 * The two options map onto the Financial service's mutually exclusive
 * `equity` / `bank_loan` schemes; a subsidy is a separate modifier and lives
 * in `SubsidyInput`.
 */

import {
  Badge,
  Card,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconCash, IconCreditCard, IconPigMoney } from "@tabler/icons-react";
import { relifeConcepts } from "../../constants/relifeConcepts";
import type { FinancingType, LoanDetails } from "../../types/renovation";
import { browserNumberSeparators } from "../../utils/formatters";
import { ConceptExplainer } from "./ConceptExplainer";

const ownFunds = relifeConcepts["own-funds"];
const renovationLoan = relifeConcepts["renovation-loan"];

interface FinancingTypeCardsProps {
  value: FinancingType;
  onChange: (value: FinancingType) => void;
  loan: LoanDetails;
  onLoanChange: (loan: LoanDetails) => void;
  /** Label for the borrowed share. Defaults to a portfolio-neutral wording. */
  loanPercentageLabel?: string;
  loanPercentageDescription?: string;
}

export function FinancingTypeCards({
  value,
  onChange,
  loan,
  onLoanChange,
  loanPercentageLabel = "How much to borrow",
  loanPercentageDescription = "Share of the renovation cost covered by the loan",
}: FinancingTypeCardsProps) {
  // Re-selecting the current option would still reach the reducers, which clear
  // computed results on every financing change. Don't emit a no-op change.
  const handleSelect = (next: FinancingType) => {
    if (next !== value) onChange(next);
  };

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <FinancingCard
          selected={value === "self-funded"}
          icon={<IconCash size={18} />}
          conceptId="own-funds"
          title={ownFunds.label}
          description={ownFunds.description}
          onClick={() => handleSelect("self-funded")}
        />
        <FinancingCard
          selected={value === "loan"}
          icon={<IconCreditCard size={18} />}
          conceptId="renovation-loan"
          title={renovationLoan.label}
          description={renovationLoan.description}
          onClick={() => handleSelect("loan")}
        />
      </SimpleGrid>

      {value === "loan" && (
        <Card withBorder radius="md" p="md" bg="blue.0">
          <Stack gap="md">
            <Group gap="sm" align="flex-start">
              <ThemeIcon color="blue" variant="light" size="lg" radius="xl">
                <IconPigMoney size={16} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={600}>
                  Loan configuration
                </Text>
                <Text size="xs" c="dimmed">
                  {renovationLoan.caveat}
                </Text>
              </div>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label={loanPercentageLabel}
                description={loanPercentageDescription}
                value={loan.percentage}
                onChange={(next) =>
                  onLoanChange({
                    ...loan,
                    percentage: typeof next === "number" ? next : 0,
                  })
                }
                suffix="%"
                min={0}
                max={100}
                step={5}
                size="sm"
                {...browserNumberSeparators}
              />

              <NumberInput
                label="Repayment period"
                description="How long the loan is repaid over"
                value={loan.duration}
                onChange={(next) =>
                  onLoanChange({
                    ...loan,
                    duration: typeof next === "number" ? next : 1,
                  })
                }
                suffix=" years"
                min={1}
                max={30}
                size="sm"
                {...browserNumberSeparators}
              />
            </SimpleGrid>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

interface FinancingCardProps {
  selected: boolean;
  icon: React.ReactNode;
  conceptId: "own-funds" | "renovation-loan";
  title: string;
  description: string;
  onClick: () => void;
}

function FinancingCard({
  selected,
  icon,
  conceptId,
  title,
  description,
  onClick,
}: FinancingCardProps) {
  return (
    <UnstyledButton onClick={onClick} w="100%">
      <Card
        withBorder
        radius="md"
        p="md"
        bg={selected ? "relife.0" : undefined}
        style={{
          borderColor: selected ? "var(--mantine-color-relife-7)" : undefined,
          borderWidth: selected ? 2 : 1,
        }}
      >
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            {icon}
            <Text fw={600} size="sm">
              {title}
            </Text>
            {/* The whole card is the selection target, so the explainer must
                not bubble — a click on it would otherwise switch the financing
                type and discard computed results. Same guard as
                RenovationMeasureCard. */}
            <span
              role="presentation"
              onClick={(event) => event.stopPropagation()}
            >
              <ConceptExplainer conceptId={conceptId} />
            </span>
          </Group>
          {selected && (
            <Badge size="xs" color="relife" variant="filled">
              Selected
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Card>
    </UnstyledButton>
  );
}
