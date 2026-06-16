import {
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconPencil,
} from "@tabler/icons-react";
import type {
  ArchetypeDetails,
  BuildingModifications,
} from "../../types/archetype";
import { APARTMENT_LOCATION_OPTIONS } from "../../constants/buildingFormOptions";
import {
  FULL_FIELD_GROUPS,
  LIMITED_FIELDS,
  formatNumber,
  type SelectorCopy,
} from "./selectorConfig";
import {
  getArchetypePeriod,
  getDisplayCountry,
  isApartmentSelection,
} from "./buildingSelectorUtils";
import type {
  ApartmentLocation,
  BuildingSelectorAdjustmentScope,
  BuildingSelectorDraft,
  BuildingSelectorMode,
} from "./types";

interface ModificationValidation {
  isValid: boolean;
  errors: { field: string; message: string }[];
}

interface AreaWarning {
  warning: boolean;
  message: string;
}

interface AdjustmentPanelProps {
  copy: SelectorCopy;
  scope: BuildingSelectorAdjustmentScope;
  details: ArchetypeDetails;
  draft: BuildingSelectorDraft;
  mode: BuildingSelectorMode;
  mapPeriod: string | null;
  activeModifications: BuildingModifications | undefined;
  hasUnsavedChanges: boolean;
  validation: ModificationValidation;
  areaWarning: AreaWarning;
  opened: boolean;
  onToggle: () => void;
  onDraftChange: (patch: Partial<BuildingSelectorDraft>) => void;
  onApply: () => void;
}

export function AdjustmentPanel({
  copy,
  scope,
  details,
  draft,
  mode,
  mapPeriod,
  activeModifications,
  hasUnsavedChanges,
  validation,
  areaWarning,
  opened,
  onToggle,
  onDraftChange,
  onApply,
}: AdjustmentPanelProps) {
  const fieldGroups =
    scope === "limited"
      ? [{ title: "Geometry", fields: LIMITED_FIELDS }]
      : FULL_FIELD_GROUPS;

  return (
    <Paper withBorder radius="md" p="md" bg="gray.0">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon color={copy.accentColor} variant="light" size="sm">
              <IconPencil size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {copy.adjustmentTitle}
            </Text>
            <Text size="xs" c="dimmed">
              optional
            </Text>
            {hasUnsavedChanges && (
              <Badge color={copy.accentColor} variant="light" size="xs">
                Unsaved changes
              </Badge>
            )}
          </Group>
          <Button
            variant="subtle"
            size="xs"
            onClick={onToggle}
            rightSection={
              opened ? (
                <IconChevronUp size={14} />
              ) : (
                <IconChevronDown size={14} />
              )
            }
          >
            {opened ? "Hide" : "Edit"}
          </Button>
        </Group>

        <Collapse in={opened}>
          <Stack gap="md">
            {fieldGroups.map((group) => (
              <Box key={group.title}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                  {group.title}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                  {group.fields.map((field) => (
                    <NumberInput
                      key={field.key}
                      label={field.label}
                      value={draft[field.key]}
                      onChange={(value) =>
                        onDraftChange({ [field.key]: value ?? "" })
                      }
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      decimalScale={field.decimalScale}
                      size="xs"
                    />
                  ))}
                </SimpleGrid>
              </Box>
            ))}

            {isApartmentSelection(details) && (
              <Select
                label="Apartment level"
                data={APARTMENT_LOCATION_OPTIONS}
                value={draft.apartmentLocation}
                onChange={(value) =>
                  onDraftChange({
                    apartmentLocation:
                      (value as ApartmentLocation | null) ?? null,
                  })
                }
                clearable
                size="xs"
              />
            )}

            {areaWarning.warning && (
              <Alert color="yellow" variant="light" p="xs">
                <Text size="sm">{areaWarning.message}</Text>
              </Alert>
            )}
            {!validation.isValid && (
              <Alert color="red" variant="light" p="xs">
                <Stack gap={4}>
                  {validation.errors.map((error) => (
                    <Text key={`${error.field}-${error.message}`} size="sm">
                      {error.message}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}

            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                {scope === "limited"
                  ? "Geometry changes affect the simulation. Apartment level is property context only."
                  : "Only changed values override the selected reference building."}
              </Text>
              <Button
                size="xs"
                color={copy.accentColor}
                disabled={!hasUnsavedChanges || !validation.isValid}
                onClick={onApply}
              >
                Apply adjustments
              </Button>
            </Group>
          </Stack>
        </Collapse>

        <Divider />
        <Group gap="xs" wrap="wrap">
          <Text size="xs" fw={600}>
            Ready:
          </Text>
          <Text size="xs" c="dimmed">
            {getDisplayCountry(details.country)}
          </Text>
          <Text size="xs" c="dimmed">
            {details.category}
          </Text>
          <Text size="xs" c="dimmed">
            {mode === "map" ? mapPeriod : getArchetypePeriod(details)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatNumber(
              typeof draft.floorArea === "number"
                ? draft.floorArea
                : details.floorArea,
            )}{" "}
            m2
          </Text>
          {activeModifications && (
            <Badge color={copy.accentColor} variant="light" size="xs">
              Adjusted
            </Badge>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}
