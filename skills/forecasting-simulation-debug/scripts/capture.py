#!/usr/bin/env python3
"""Capture an unchanged archetype baseline and an optional window comparison; Python standard library only.

This records API observations, not browser observations or hidden engine inputs.
Verify the deployed contract before use; see the parent SKILL.md.
"""

import argparse
import hashlib
import json
import math
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def positive(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("must be finite and positive")
    return number


def request_json(
    base, output, label, endpoint, params=None, multipart=False, fields=None
):
    url = base.rstrip("/") + endpoint
    if params:
        url += "?" + urlencode(params)
    parts = [
        f'--relife-evidence\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{json.dumps(value)}\r\n'
        for key, value in (fields or {}).items()
    ]
    body = ("".join(parts) + "--relife-evidence--\r\n").encode() if multipart else b""
    headers = (
        {"Content-Type": "multipart/form-data; boundary=relife-evidence"}
        if multipart
        else {}
    )
    write_json(
        output / f"{label}.request.json",
        {
            "method": "POST",
            "url": url,
            "headers": headers,
            "body": body.decode(),
            "started_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    print(f"Requesting {label}...", flush=True)
    try:
        with urlopen(
            Request(url, body, headers, method="POST"), timeout=900
        ) as response:
            raw = response.read()
            status = response.status
    except HTTPError as error:
        (output / f"{label}.error.txt").write_bytes(error.read())
        raise
    (output / f"{label}.response.json").write_bytes(raw)
    write_json(
        output / f"{label}.receipt.json",
        {
            "status": status,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "sha256": hashlib.sha256(raw).hexdigest(),
        },
    )
    return json.loads(raw)


def summarize(response, label, output):
    scenarios = response["scenarios"]
    if len(scenarios) != 1:
        raise ValueError(
            f"{label}: expected exactly one scenario, got {len(scenarios)}"
        )
    scenario = scenarios[0]
    if scenario["scenario_id"] != label:
        raise ValueError(f"Unexpected scenario: {scenario['scenario_id']}")
    result = scenario["results"]
    hourly = result["hourly_building"]
    hours = len(hourly["Q_H"])
    if hours not in (8760, 8784) or any(len(v) != hours for v in hourly.values()):
        raise ValueError(f"Invalid hourly coverage/column lengths: {hours}")
    for key in ("Q_H", "Q_C", "Q_HC", "T_ext", "T_op"):
        if not all(math.isfinite(x) for x in hourly[key]):
            raise ValueError(f"Non-finite {key}")
    if any(x < 0 for key in ("Q_H", "Q_C") for x in hourly[key]):
        raise ValueError("Negative heating or cooling demand")
    if any(
        not math.isclose(h - c, hc, abs_tol=1e-6)
        for h, c, hc in zip(hourly["Q_H"], hourly["Q_C"], hourly["Q_HC"])
    ):
        raise ValueError("Q_HC does not equal signed heating minus cooling")
    uni = result["primary_energy_uni11300"]
    if len(uni["hourly_results"]) != hours:
        raise ValueError("System-conversion hourly coverage differs from demand")
    summary = uni["summary"]
    heat = math.fsum(hourly["Q_H"]) / 1000
    cool = math.fsum(hourly["Q_C"]) / 1000
    checks = {
        "heating_hourly_to_uni": math.isclose(
            heat, summary["Q_ideal_heat_kWh"], rel_tol=1e-9, abs_tol=1e-6
        ),
        "cooling_hourly_to_uni": math.isclose(
            cool, summary["Q_ideal_cool_kWh"], rel_tol=1e-9, abs_tol=1e-6
        ),
    }
    for key, value in summary.items():
        if uni["hourly_results"] and key in uni["hourly_results"][0]:
            checks[f"uni_hourly_sum:{key}"] = math.isclose(
                math.fsum(row[key] for row in uni["hourly_results"]),
                value,
                rel_tol=1e-9,
                abs_tol=1e-6,
            )
    write_json(output / f"{label}.checks.json", checks)
    if not all(checks.values()):
        raise ValueError(f"Failed numerical checks: {checks}")
    # The API drops timestamps. Do not invent a calendar or month allocation here.
    delivered = (
        summary["E_delivered_thermal_kWh"] + summary["E_delivered_electric_total_kWh"]
    )
    native = {
        "heating_kWh": heat,
        "cooling_kWh": cool,
        "demand_kWh": heat + cool,
        "delivered_fuel_kWh": summary["E_delivered_thermal_kWh"],
        "delivered_electricity_kWh": summary["E_delivered_electric_total_kWh"],
        "delivered_kWh": delivered,
        "primary_kWh": summary["EP_total_kWh"],
    }
    return {"hours": hours, "totals": native}


def archive_evidence(staging, destination):
    """Package each raw artifact once, with a purpose and content hash."""
    entries = []
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(staging.rglob("*")):
            if not path.is_file():
                continue
            name = path.relative_to(staging).as_posix()
            purpose = (
                "Exact HTTP request for replay"
                if ".request." in name
                else (
                    "Observed API response"
                    if ".response." in name
                    else (
                        "HTTP status, time and response hash"
                        if ".receipt." in name
                        else (
                            "Numerical consistency checks"
                            if ".checks." in name
                            else "Collector and reproduction metadata"
                        )
                    )
                )
            )
            entries.append(
                {
                    "path": name,
                    "purpose": purpose,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }
            )
            archive.write(path, name)
        archive.writestr("index.json", json.dumps(entries, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url", required=True, help="Forecasting root, including its proxy prefix"
    )
    parser.add_argument("--country", required=True)
    parser.add_argument("--category", required=True)
    parser.add_argument("--name", required=True, help="Exact catalogue archetype name")
    parser.add_argument(
        "--selection-area",
        type=positive,
        help="Approximate selection criterion only; never edits or scales",
    )
    parser.add_argument(
        "--window-u",
        type=positive,
        help="Explicitly requested comparison target, W/(m² K)",
    )
    parser.add_argument(
        "--custom-building",
        type=Path,
        help="Explicit custom input: validated bui, system, uni11300_input_example",
    )
    parser.add_argument(
        "--change-reason",
        help="Requested custom modification or supplied custom-building provenance",
    )
    parser.add_argument(
        "--output", type=Path, required=True, help="New evidence directory"
    )
    args = parser.parse_args()
    parsed_url = urlsplit(args.base_url)
    if (
        parsed_url.scheme not in ("http", "https")
        or not parsed_url.netloc
        or parsed_url.username
        or parsed_url.password
    ):
        parser.error("base URL must be HTTP(S), without embedded credentials")
    if bool(args.custom_building) != bool(
        args.change_reason and args.change_reason.strip()
    ):
        parser.error(
            "custom-building and a nonempty change-reason must be supplied together"
        )
    custom = (
        json.loads(args.custom_building.read_text()) if args.custom_building else None
    )
    if custom is not None:
        for key in ("bui", "system", "uni11300_input_example"):
            if key not in custom:
                parser.error(
                    f"Custom building missing {key}; do not silently use example defaults"
                )
    args.output.mkdir(parents=True, exist_ok=False)
    data = args.output / "data"
    raw = args.output / "raw"
    data.mkdir()
    raw.mkdir()
    case = {"country": args.country, "category": args.category, "name": args.name}
    with tempfile.TemporaryDirectory(prefix="forecasting-capture-") as temporary:
        staging = Path(temporary)
        metadata = {
            "archetype": case,
            "selection_area_m2": args.selection_area,
            "window_u_W_m2K": args.window_u,
            "capture_kind": "direct API",
            "weather_source": "pvgis",
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "hourly_units": {
                "Q_H": "Wh",
                "Q_C": "Wh",
                "Q_HC": "signed Wh",
                "T_ext": "degC",
                "T_op": "degC",
            },
            "timestamp_note": "API omits timestamps; obtain engine index before grouping by month",
            "change_reason": args.change_reason,
            "versions_note": "Runtime versions require separate inspection; see SKILL.md",
        }
        write_json(staging / "capture.json", metadata)
        (staging / "capture.py").write_bytes(Path(__file__).read_bytes())
        try:
            building = request_json(
                args.base_url,
                staging,
                "building",
                "/building",
                {"archetype": "true", **case},
            )
            simulated = custom if custom is not None else building
            reference_area = simulated["bui"]["building"]["net_floor_area"]
            if not math.isfinite(reference_area) or reference_area <= 0:
                raise ValueError("Invalid simulated floor area")
            write_json(data / "inputs.json", {**metadata, "model": simulated})
            results = {
                "archetype": case,
                "archetype_area_m2": building["bui"]["building"]["net_floor_area"],
                "simulated_area_m2": reference_area,
                "selection_area_m2": args.selection_area,
                "mode": "custom" if custom is not None else "archetype",
                "output_basis": "Unscaled API simulation; no UI observation",
            }
            identity = (
                {"archetype": "false"}
                if custom is not None
                else {"archetype": "true", **case}
            )
            fields = (
                {
                    "bui_json": simulated["bui"],
                    "system_json": simulated["system"],
                    "uni11300_json": simulated["uni11300_input_example"],
                }
                if custom is not None
                else None
            )
            scenarios = [("baseline", {"baseline_only": "true"})]
            if args.window_u is not None:
                scenarios.append(
                    (
                        "window",
                        {"scenario_elements": "window", "u_window": args.window_u},
                    )
                )
            temperatures = {}
            for label, overrides in scenarios:
                response = request_json(
                    args.base_url,
                    staging,
                    label,
                    "/ecm_application",
                    {**identity, "weather_source": "pvgis", **overrides},
                    True,
                    fields,
                )
                results[label] = summarize(response, label, staging)
                temperatures[label] = response["scenarios"][0]["results"][
                    "hourly_building"
                ]["T_ext"]
            if args.window_u is not None:
                results["same_outdoor_temperature_series"] = (
                    temperatures["baseline"] == temperatures["window"]
                )
                results["weather_note"] = (
                    "Temperature parity alone does not prove solar/wind parity; verify engine replay."
                )
                results["savings"] = {}
                for key, before in results["baseline"]["totals"].items():
                    difference = before - results["window"]["totals"][key]
                    results["savings"][key] = {
                        "absolute": difference,
                        "percent": 100 * difference / before if before else None,
                    }
            write_json(data / "results.json", results)
        except Exception as error:
            write_json(staging / "incomplete.json", {"error": str(error)})
            raise
        finally:
            archive_evidence(staging, raw / "evidence.zip")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
