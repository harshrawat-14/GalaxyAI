const key = process.env.GEMINI_API_KEY;
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Say hello in exactly three words." }] }] }),
});
console.log("status:", res.status);
const body = await res.json();
console.log(JSON.stringify(body, null, 2).slice(0, 800));
