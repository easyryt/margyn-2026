"use client";

import { useId } from "react";
import { PHONE_MODELS, type PhoneModelId } from "@/lib/image-generator/phone-models";

export default function PhoneModelSelector({ value, onChange, disabled }: { value: PhoneModelId; onChange: (value: PhoneModelId) => void; disabled?: boolean }) {
  const id = useId();
  return <div className="phone-model-control">
    <label htmlFor={id}>iPhone model</label>
    <select id={id} value={value} disabled={disabled} aria-describedby={`${id}-help`} onChange={(event) => onChange(event.target.value as PhoneModelId)}>
      {PHONE_MODELS.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.rearCameras} rear {item.rearCameras === 1 ? "camera" : "cameras"}</option>)}
    </select>
    <p id={`${id}-help`}>Choose the model that matches the cover’s camera cutout.</p>
  </div>;
}
