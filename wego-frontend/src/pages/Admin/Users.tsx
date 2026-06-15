import { Search, UserPlus, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getAllUsers } from "../../services/adminService";
import { getDatabase, ref, onValue } from "firebase/database";

const roleColors: Record<string, string> = {
  ADMIN: "bg-slate-800 text-white",
  USER: "bg-blue-100 text-blue-700",
};

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );
  const [presence, setPresence] = useState<any>({});

  useEffect(() => {
    const db = getDatabase();

    const presenceRef = ref(db, "presence");

    const unsubscribe = onValue(
      presenceRef,
      (snapshot) => {
        setPresence(snapshot.val() || {});
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getAllUsers();

        setUsers(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and monitor all registered users.</p>
        </div>
        {/* <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors shadow-sm">
          <UserPlus size={15} />
          Add User
        </button> */}
      </div>

      {/* Search & filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-8 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} users found</span>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              {["Name", "Role", "Status", "Joined", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((user) => {
              const online =
                presence[user.firebaseUid]?.online;

              return (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">
                          {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${roleColors[user.role?.name]}`}>
                      {user.role?.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`flex items-center gap-1.5 text-xs font-medium ${online
                          ? "text-emerald-600"
                          : "text-slate-400"
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${online
                            ? "bg-emerald-400"
                            : "bg-slate-300"
                          }`}
                      />
                      {online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing {filtered.length} of {users.length} users</p>
          <div className="flex gap-1">
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button className="w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-semibold">1</button>
            <button className="w-7 h-7 rounded-lg text-slate-500 text-xs hover:bg-slate-100 transition-colors">2</button>
            <button className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}