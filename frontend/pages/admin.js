import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null));
  const [expiresAt, setExpiresAt] = useState(null);
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [busy, setBusy] = useState(false);

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const saveToken = (t, exp) => {
    setToken(t);
    setExpiresAt(exp);
    if (typeof window !== "undefined") {
      localStorage.setItem("adminToken", t);
    }
  };

  const logout = () => {
    setToken(null);
    setExpiresAt(null);
    if (typeof window !== "undefined") localStorage.removeItem("adminToken");
  };

  const doLogin = async (e) => {
    e && e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND || ""}/api/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      saveToken(data.token, data.expiresAt);
    } catch (err) {
      alert(String(err.message || err));
    } finally { setBusy(false); }
  };

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND || ""}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      setStats(await res.json());
    } catch (err) {
      console.error(err); logout();
    }
  }, [token]);

  const fetchPublicRooms = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND || ""}/api/admin/public-rooms`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    } catch (err) {
      console.error(err); logout();
    }
  }, [token]);

  useEffect(() => { if (token) { fetchStats(); fetchPublicRooms(); const t = setInterval(() => { fetchStats(); fetchPublicRooms(); }, 15000); return () => clearInterval(t); } }, [token, fetchStats, fetchPublicRooms]);

  const createPublicRoom = async (ev) => {
    ev && ev.preventDefault();
    const form = ev.target;
    const timeout = Number(form.timeout.value || 10);
    const roomName = form.roomName.value || null;
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND || ""}/api/admin/public-rooms`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ timeout, roomName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      fetchPublicRooms();
      fetchStats();
      form.reset();
    } catch (err) { alert(String(err.message || err)); }
    finally { setBusy(false); }
  };

  const deletePublicRoom = async (id) => {
    if (!confirm(`Delete public room ${id}? This is permanent.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND || ""}/api/admin/public-rooms/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      fetchPublicRooms(); fetchStats();
    } catch (err) { alert(String(err.message || err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#07070e] text-white p-6">
      <Head><title>Admin Panel — Blip</title></Head>
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      {!token && (
        <form onSubmit={doLogin} className="max-w-md">
          <p className="mb-2 text-sm text-gray-300">Enter admin password to access the panel.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" className="w-full p-2 rounded bg-[#0e0e1c] mb-2" />
          <div className="flex gap-2">
            <button disabled={busy} className="px-3 py-2 bg-yellow-500 text-black font-semibold rounded">Login</button>
          </div>
        </form>
      )}

      {token && (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <div className="text-sm text-gray-300">Token expires: {expiresAt ? new Date(expiresAt).toLocaleString() : "—"}</div>
            <button onClick={logout} className="ml-auto px-3 py-1 bg-red-600 rounded">Logout</button>
          </div>

          <section className="bg-[#0e0e1c] p-4 rounded max-w-2xl">
            <h2 className="font-semibold mb-2">Site Stats</h2>
            {!stats && <div className="text-sm text-gray-400">Loading…</div>}
            {stats && (
              <div className="text-sm grid grid-cols-2 gap-2">
                <div>Active rooms: <strong>{stats.activeRooms}</strong></div>
                <div>Public rooms: <strong>{stats.publicRooms}</strong></div>
                <div>Total participants: <strong>{stats.totalParticipants}</strong></div>
                <div>Total messages: <strong>{stats.totalMessages}</strong></div>
              </div>
            )}
          </section>

          <section className="bg-[#0e0e1c] p-4 rounded max-w-3xl">
            <h2 className="font-semibold mb-2">Manage Public Rooms</h2>
            <form onSubmit={createPublicRoom} className="flex gap-2 mb-3">
              <select name="timeout" defaultValue="10" className="p-2 bg-[#07070e] rounded">
                <option value="10">10 min</option>
                <option value="20">20 min</option>
                <option value="30">30 min</option>
                <option value="60">60 min</option>
              </select>
              <input name="roomName" placeholder="Optional room name" className="flex-1 p-2 bg-[#07070e] rounded" />
              <button disabled={busy} className="px-3 py-2 bg-green-600 rounded">Create</button>
            </form>

            <div className="space-y-2">
              {rooms.length === 0 && <div className="text-sm text-gray-400">No active public rooms</div>}
              {rooms.map((r) => (
                <div key={r.roomId} className="flex items-center gap-3 bg-[#07070e] p-2 rounded">
                  <div className="font-mono text-sm text-red-400">{r.roomId}</div>
                  <div className="flex-1 text-sm truncate">{r.roomName || "(unnamed)"}</div>
                  <div className="text-xs text-gray-300">{Math.max(0, Math.ceil((r.expiresAt - Date.now()) / 60000))}m left</div>
                  <button onClick={() => deletePublicRoom(r.roomId)} className="px-2 py-1 bg-red-600 rounded text-sm">Delete</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
