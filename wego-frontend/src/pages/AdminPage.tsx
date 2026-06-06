import React from "react";

const stats = [
  { title: "Users", value: 1280 },
  { title: "Groups", value: 356 },
  { title: "Checklists", value: 4120 },
  { title: "Reports", value: 17 },
];

const users = [
  {
    id: 1,
    name: "Long Nguyen",
    email: "long@gmail.com",
    role: "ADMIN",
  },
  {
    id: 2,
    name: "Minh Tran",
    email: "minh@gmail.com",
    role: "USER",
  },
];

const groups = [
  {
    id: 1,
    title: "Coffee Weekend",
    members: 5,
    status: "WAITING",
  },
  {
    id: 2,
    title: "Study Group",
    members: 8,
    status: "ON_GOING",
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold mb-8">
        WeGo Admin Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-xl p-6 shadow"
          >
            <p className="text-slate-500">{item.title}</p>
            <h2 className="text-3xl font-bold text-green-600">
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Recent Users
        </h2>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Name</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Role</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="py-3">{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Groups */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Recent Groups
        </h2>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Group</th>
              <th className="text-left py-2">Members</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-b">
                <td className="py-3">{group.title}</td>
                <td>{group.members}</td>
                <td>{group.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button className="bg-green-600 text-white px-6 py-3 rounded-lg">
          Manage Users
        </button>

        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg">
          Manage Groups
        </button>

        <button className="bg-red-600 text-white px-6 py-3 rounded-lg">
          Manage Reports
        </button>
      </div>
    </div>
  );
}