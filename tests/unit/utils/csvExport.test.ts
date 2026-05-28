import { describe, expect, test } from "vitest";
import { serializeCsv, type CsvColumn } from "../../../src/utils/csvExport";

interface Row {
  name: string;
  value: number | null | undefined;
}

const columns: CsvColumn<Row>[] = [
  { key: "name", header: "Name", value: (r) => r.name },
  { key: "value", header: "Value (EUR)", value: (r) => r.value },
];

describe("serializeCsv", () => {
  test("emits a header row then one row per item with CRLF endings", () => {
    const csv = serializeCsv(
      [
        { name: "Office A", value: 100 },
        { name: "Office B", value: 200 },
      ],
      columns,
    );

    expect(csv).toBe("Name,Value (EUR)\r\nOffice A,100\r\nOffice B,200");
  });

  test("renders null and undefined as empty cells", () => {
    const csv = serializeCsv(
      [
        { name: "A", value: null },
        { name: "B", value: undefined },
      ],
      columns,
    );

    expect(csv).toBe("Name,Value (EUR)\r\nA,\r\nB,");
  });

  test("quotes and escapes cells containing commas, quotes, or newlines", () => {
    const csv = serializeCsv(
      [{ name: 'Tower, "North"\nwing', value: 1 }],
      columns,
    );

    expect(csv).toBe('Name,Value (EUR)\r\n"Tower, ""North""\nwing",1');
  });

  test("omits columns marked include: false", () => {
    const csv = serializeCsv(
      [{ name: "A", value: 1 }],
      [columns[0], { ...columns[1], include: false }],
    );

    expect(csv).toBe("Name\r\nA");
  });
});
