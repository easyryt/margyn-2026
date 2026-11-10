"use client";
import { useEffect, useId, useState } from "react";
import type { Address, IndianState } from "@/lib/types";

type CitySuggestions = { code: string; cities: string[]; failed?: boolean };

export default function AddressLocationFields({
  states,
  initialAddress = {},
}: {
  states: IndianState[];
  initialAddress?: Partial<Address>;
}) {
  const id = useId();
  const [state, setState] = useState(() => {
    const saved = initialAddress.state?.trim() || "";
    return (
      states.find(
        (item) =>
          item.name.toLowerCase() === saved.toLowerCase() ||
          item.code === saved.toUpperCase(),
      )?.name || saved
    );
  });
  const [city, setCity] = useState(initialAddress.city || "");
  const [pincode, setPincode] = useState(initialAddress.pincode || "");
  const [result, setResult] = useState<CitySuggestions | null>(null);
  const code = states.find((item) => item.name === state)?.code || "";
  const legacyState = state && !code;
  const loading = Boolean(code && result?.code !== code);
  const failed = result?.code === code && result.failed;
  const cities = result?.code === code ? result.cities : [];

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    // Only the public state code is requested. No address details leave this form.
    fetch("/api/locations/cities?state=" + encodeURIComponent(code), {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Suggestions unavailable");
        const data = await response.json();
        if (
          !Array.isArray(data.cities) ||
          !data.cities.every((name: unknown) => typeof name === "string")
        )
          throw new Error("Invalid suggestions");
        if (!controller.signal.aborted)
          setResult({ code, cities: data.cities });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ code, cities: [], failed: true });
      });
    return () => controller.abort();
  }, [code]);

  return (
    <section className="address-location" aria-label="Delivery location">
      <div className="address-location-heading">
        <span>Delivery location</span>
        <span>India</span>
      </div>
      <div className="address-location-fields">
        <label htmlFor={id + "-state"}>
          State
          <select
            id={id + "-state"}
            aria-label="State"
            name="state"
            required
            autoComplete="address-level1"
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setCity("");
              setPincode("");
            }}
          >
            <option value="" disabled>
              Select state / union territory
            </option>
            {legacyState && (
              <option value={state}>{state} (saved address)</option>
            )}
            {states.map((item) => (
              <option key={item.code} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={id + "-city"}>
          City / Town
          <input
            id={id + "-city"}
            aria-label="City"
            name="city"
            required
            minLength={2}
            maxLength={80}
            autoComplete="address-level2"
            placeholder="Type your city or town"
            list={id + "-cities"}
            aria-describedby={id + "-hint"}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
          <datalist id={id + "-cities"}>
            {cities.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label htmlFor={id + "-pin"}>
          PIN code
          <input
            id={id + "-pin"}
            aria-label="PIN code"
            name="pincode"
            required
            inputMode="numeric"
            pattern="[1-9][0-9]{5}"
            minLength={6}
            maxLength={6}
            autoComplete="postal-code"
            placeholder="6-digit PIN"
            value={pincode}
            onChange={(event) => setPincode(event.target.value)}
          />
        </label>
      </div>
      <div className="address-location-footer">
        <p id={id + "-hint"} role="status" aria-live="polite">
          {loading
            ? "Loading city suggestions…"
            : failed
              ? "Suggestions unavailable. You can still type your city or town."
              : code
                ? "Choose a city suggestion or type your town."
                : "Choose your state for city suggestions. You can also type your town."}
        </p>
        <a
          href="https://github.com/dr5hn/countrystatecity-npm/tree/main/packages/countries"
          target="_blank"
          rel="noreferrer"
        >
          Location data: CSC Database (ODbL)
        </a>
      </div>
    </section>
  );
}
