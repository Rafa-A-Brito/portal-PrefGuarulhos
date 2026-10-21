export function prazoRetryAfter(value, now = Date.now()) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  let deadline;
  if (/^\d+$/.test(text)) deadline = now + Number(text) * 1000;
  else if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(text)) deadline = Date.parse(text);
  else return null;
  return Number.isFinite(deadline) && deadline >= now && deadline <= 8640000000000000 ? deadline : null;
}
