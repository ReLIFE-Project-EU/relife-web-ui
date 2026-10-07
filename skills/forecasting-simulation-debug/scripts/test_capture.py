"""Regression checks for input preservation and numerical consistency; no network."""

import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import capture


def response():
    return {
        "scenarios": [
            {
                "scenario_id": "baseline",
                "results": {
                    "hourly_building": {
                        "Q_H": [1000.0] * 8760,
                        "Q_C": [0.0] * 8760,
                        "Q_HC": [1000.0] * 8760,
                        "T_ext": [10.0] * 8760,
                        "T_op": [20.0] * 8760,
                    },
                    "primary_energy_uni11300": {
                        "summary": {
                            "Q_ideal_heat_kWh": 8760.0,
                            "Q_ideal_cool_kWh": 0.0,
                            "E_delivered_thermal_kWh": 8760.0,
                            "E_delivered_electric_total_kWh": 0.0,
                            "EP_total_kWh": 9198.0,
                        },
                        "hourly_results": [
                            {
                                "Q_ideal_heat_kWh": 1.0,
                                "Q_ideal_cool_kWh": 0.0,
                                "E_delivered_thermal_kWh": 1.0,
                                "E_delivered_electric_total_kWh": 0.0,
                                "EP_total_kWh": 1.05,
                            }
                        ]
                        * 8760,
                    },
                },
            }
        ]
    }


class CaptureTests(unittest.TestCase):
    def run_case(self, area, selection=None, custom=False):
        building = {
            "bui": {"building": {"net_floor_area": area}},
            "system": {},
            "uni11300_input_example": {},
        }
        original = copy.deepcopy(building)
        calls = []

        def request(
            base, output, label, endpoint, params, multipart=False, fields=None
        ):
            calls.append((label, params, fields))
            return building if label == "building" else response()

        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "case"
            argv = [
                "capture.py",
                "--base-url",
                "http://localhost/api/forecasting",
                "--country",
                "test",
                "--category",
                "house",
                "--name",
                f"model-{area}",
                "--output",
                str(target),
            ]
            if selection:
                argv += ["--selection-area", str(selection)]
            if custom:
                edited = copy.deepcopy(building)
                edited["bui"]["building"]["net_floor_area"] = 150.0
                source = Path(tmp) / "custom.json"
                source.write_text(json.dumps(edited))
                argv += [
                    "--custom-building",
                    str(source),
                    "--change-reason",
                    "Explicit area modification",
                ]
            with patch("sys.argv", argv), patch.object(
                capture, "request_json", side_effect=request
            ), patch("builtins.print"):
                capture.main()
            results = json.loads((target / "data/results.json").read_text())
            inputs = json.loads((target / "data/inputs.json").read_text())
            self.assertEqual(building, original)
            self.assertEqual(results["simulated_area_m2"], 150.0 if custom else area)
            self.assertEqual(results["baseline"]["totals"]["delivered_kWh"], 8760.0)
            self.assertEqual(inputs["model"], edited if custom else building)
            self.assertEqual(calls[1][1]["archetype"], "false" if custom else "true")
            self.assertEqual(
                calls[1][2],
                (
                    {"bui_json": edited["bui"], "system_json": {}, "uni11300_json": {}}
                    if custom
                    else None
                ),
            )

    def test_selection_area_does_not_modify_or_scale_archetype(self):
        for native_area, approximate_area in ((165.4, 165.0), (240.8, 240.0)):
            with self.subTest(area=native_area):
                self.run_case(native_area, selection=approximate_area)

    def test_explicit_custom_model_is_transmitted_unchanged(self):
        self.run_case(165.4, custom=True)

    def test_bad_hourly_coverage_and_annual_sum_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            for corrupt in ("coverage", "system_coverage", "sum"):
                value = response()
                result = value["scenarios"][0]["results"]
                if corrupt == "coverage":
                    result["hourly_building"]["Q_H"].pop()
                elif corrupt == "system_coverage":
                    result["primary_energy_uni11300"]["hourly_results"] = []
                else:
                    result["primary_energy_uni11300"]["summary"][
                        "Q_ideal_heat_kWh"
                    ] += 1
                with self.assertRaises(ValueError):
                    capture.summarize(value, "baseline", Path(tmp))

    def test_custom_input_requires_explicit_reason(self):
        with patch(
            "sys.argv",
            [
                "capture.py",
                "--base-url",
                "http://localhost",
                "--country",
                "test",
                "--category",
                "house",
                "--name",
                "model",
                "--output",
                "unused",
                "--custom-building",
                "unused.json",
            ],
        ), patch("sys.stderr"):
            with self.assertRaises(SystemExit) as error:
                capture.main()
            self.assertEqual(error.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
