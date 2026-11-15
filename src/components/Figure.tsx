// A measured value with its unit; a missing value shows as a grey dash.
export function Figure({ value, unit, digits = 0 }: { value: number | null; unit?: string; digits?: number }) {
  if (value === null || Number.isNaN(value)) return <span className="missing">&mdash;</span>;
  return (
    <>
      {value.toFixed(digits)}
      {unit && <small>{unit}</small>}
    </>
  );
}
