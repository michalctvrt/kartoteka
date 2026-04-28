export async function fetchEzadanka(id: string) {
  const res = await fetch(
    `/CardFileWebWS/rest/ezadanka/${encodeURIComponent(id)}`,
    {
      credentials: "include", // 🔑 důležité – používá session z kartotéky
    }
  );

  if (!res.ok) {
    throw new Error("E-žádanka nenalezena");
  }

  return res.json();
}
