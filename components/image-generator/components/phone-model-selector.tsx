"use client";

import { useId } from "react";
import { PHONE_MODELS, getPhoneModel, type PhoneModelId } from "@/lib/image-generator/phone-models";

export default function PhoneModelSelector({ value, onChange, disabled }: { value: PhoneModelId; onChange: (value: PhoneModelId) => void; disabled?: boolean }) {
  const id = useId();
  const model = getPhoneModel(value)!;
  const lenses = model.cameraLayout === "triple" ? [[19, 20], [19, 43], [40, 32]] : model.cameraLayout === "dual-diagonal" ? [[19, 20], [40, 43]] : model.cameraLayout === "dual-vertical" ? [[22, 20], [22, 43]] : [[22, 23]];
  return <div className="phone-model-control">
    <label htmlFor={id}>iPhone model</label>
    <select id={id} value={value} disabled={disabled} aria-describedby={`${id}-help`} onChange={(event) => onChange(event.target.value as PhoneModelId)}>
      {PHONE_MODELS.map((item) => <option value={item.id} key={item.id}>{item.label} · {item.rearCameras} rear {item.rearCameras === 1 ? "camera" : "cameras"}</option>)}
    </select>
    <div className="phone-model-preview" role="status">
      <svg viewBox="0 0 66 90" width="48" height="65" aria-hidden="true"><rect x="2" y="2" width="62" height="86" rx="12" fill="#f0ece6" stroke="#bdb4a7" /><rect x="8" y="9" width="44" height="48" rx="10" fill="#ded8ce" />{lenses.map(([x, y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="9" fill="#292b30" /><circle cx={x} cy={y} r="5" fill="#132e45" /><circle cx={x - 1} cy={y - 2} r="2" fill="#749bbd" /></g>)}<circle cx="43" cy="15" r="3" fill="#fff8de" /></svg>
      <span><strong>{model.label}</strong><small>{model.rearCameras} rear {model.rearCameras === 1 ? "camera" : "cameras"} · {model.cameraLayout === "triple" ? "triangular Pro cluster" : model.cameraLayout === "dual-diagonal" ? "diagonal pair" : model.cameraLayout === "dual-vertical" ? "vertical pair" : "single lens"}</small></span>
    </div>
    <p id={`${id}-help`}>Camera layout follows this model. A mockup does not verify case fit.</p>
  </div>;
}
