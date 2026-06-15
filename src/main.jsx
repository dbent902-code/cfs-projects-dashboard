import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LogOut, Plus, RefreshCcw, Search, Trash2, Upload } from "lucide-react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const GROUPS = ["SharePoint Projects", "Scheduled / Secured", "On Site", "Complete / Closed"];
const STATUSES = ["Not Started", "Working on it", "Scheduled", "Stuck", "Done"];
const PRIORITIES = ["Low", "Normal", "High"];

const emptyProject = {
  project: "",
  client: "",
  project_group: "SharePoint Projects",
  status: "Not Started",
  priority: "Normal",
  owner: "CFS Team",
  timeline: "TBC",
  notes: "",
  source: "Manual",
  sharepoint_url: ""
};

function initials(name) {
  return String(name || "CFS")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function statusClass(status) {
  if (status === "Done") return "status-done";
  if (status === "Working on it") return "status-working";
  if (status === "Scheduled") return "status-scheduled";
  if (status === "Stuck") return "status-stuck";
  return "status-not-started";
}

function parseCsv(text) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      current.push(value);
      if (current.some(cell => cell.trim() !== "")) rows.push(current);
      current = [];
      value = "";
    } else {
      value += char;
    }
  }

  current.push(value);
  if (current.some(cell => cell.trim() !== "")) rows.push(current);
  return rows;
}

function cleanProjectName(name) {
  return String(name || "")
    .replace(/^Job\s+\d+\s*-\s*/i, "")
    .replace(/^\d+\s*-\s*/i, "")
    .trim();
}

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event) {
    event.preventDefault();
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">CFS</div>
        <h1>CFS Projects Dashboard</h1>
        <p>Sign in with your work email to access the live company board.</p>

        {sent ? (
          <div className="notice">Check your email for the secure login link.</div>
        ) : (
          <form onSubmit={signIn}>
            <label>
              Work email
              <input
                type="email"
                required
                placeholder="name@canaryfirestopping.co.uk"
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </label>
            <button type="submit">Send login link</button>
          </form>
        )}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    fetchProjects();

    const channel = supabase
      .channel("cfs_projects_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cfs_projects" }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cfs_projects")
      .select("*")
      .order("project_group", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error) setProjects(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter(project => {
      const text = [
        project.project,
        project.client,
        project.owner,
        project.status,
        project.priority,
        project.timeline,
        project.notes,
        project.source
      ]
        .join(" ")
        .toLowerCase();

      return (statusFilter === "all" || project.status === statusFilter) && (!q || text.includes(q));
    });
  }, [projects, query, statusFilter]);

  const metrics = useMemo(() => ({
    total: filtered.length,
    active: filtered.filter(item => item.status === "Working on it" || item.status === "Scheduled").length,
    stuck: filtered.filter(item => item.status === "Stuck").length,
    done: filtered.filter(item => item.status === "Done").length
  }), [filtered]);

  function addProject(group = "SharePoint Projects") {
    setEditing({ ...emptyProject, project_group: group });
  }

  function editProject(project) {
    setEditing(project);
  }

  async function saveProject(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      project: editing.project,
      client: editing.client,
      project_group: editing.project_group,
      status: editing.status,
      priority: editing.priority,
      owner: editing.owner,
      timeline: editing.timeline,
      notes: editing.notes,
      source: editing.source,
      sharepoint_url: editing.sharepoint_url
    };

    if (editing.id) {
      await supabase.from("cfs_projects").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("cfs_projects").insert({
        ...payload,
        created_by: session.user.id
      });
    }

    setSaving(false);
    setEditing(null);
    await fetchProjects();
  }

  async function deleteProject() {
    if (!editing?.id) return;
    await supabase.from("cfs_projects").delete().eq("id", editing.id);
    setEditing(null);
    await fetchProjects();
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);

    if (!rows.length) {
      alert("No rows found in the CSV.");
      return;
    }

    const headers = rows[0].map(header => header.trim().toLowerCase());
    const findIndex = names => names.map(name => headers.indexOf(name)).find(index => index >= 0);

    const nameIndex = findIndex(["name", "project", "project name", "title", "folder name", "site", "job", "job name"]) ?? 0;
    const clientIndex = findIndex(["client", "company", "customer"]);
    const notesIndex = findIndex(["notes", "note", "description", "comment"]);
    const urlIndex = findIndex(["url", "web_url", "web url", "sharepoint_url", "sharepoint url"]);

    const imported = rows.slice(1)
      .map((row, index) => {
        const rawName = String(row[nameIndex] || "").trim();
        if (!rawName) return null;

        return {
          project: cleanProjectName(rawName) || rawName,
          client: clientIndex >= 0 ? String(row[clientIndex] || "").trim() : "SharePoint Projects",
          project_group: "SharePoint Projects",
          status: "Not Started",
          priority: "Normal",
          owner: "CFS Team",
          timeline: "TBC",
          notes: notesIndex >= 0 ? String(row[notesIndex] || "").trim() : rawName,
          source: file.name,
          sharepoint_url: urlIndex >= 0 ? String(row[urlIndex] || "").trim() : "",
          position: index
        };
      })
      .filter(Boolean);

    if (!imported.length) {
      alert("No project names found. Check your CSV has a project/folder name column.");
      return;
    }

    const confirmed = window.confirm(`Import ${imported.length} projects into the live board?`);
    if (!confirmed) return;

    const { error } = await supabase.from("cfs_projects").insert(imported);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchProjects();
    alert(`Imported ${imported.length} projects.`);
    event.target.value = "";
  }

  if (!session) return <Login />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">CFS</div>
        <div className="side-dot">🏠</div>
        <div className="side-dot">📋</div>
        <div className="side-dot">📁</div>
        <div className="side-dot">⚙</div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="title-wrap">
            <h1>CFS Projects Board</h1>
            <p>Live Monday-style company dashboard — shared between staff</p>
          </div>

          <div className="top-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Search projects, clients, notes..."
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </div>

            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map(status => <option key={status}>{status}</option>)}
            </select>

            <label className="import-button">
              <Upload size={16} />
              Import CSV
              <input type="file" accept=".csv,.txt" onChange={importCsv} />
            </label>

            <button onClick={() => addProject()}><Plus size={16} /> Add project</button>
            <button className="yellow" onClick={fetchProjects}><RefreshCcw size={16} /> Refresh</button>
            <button className="ghost" onClick={() => supabase.auth.signOut()}><LogOut size={16} /> Sign out</button>
          </div>
        </header>

        <main className="board-area">
          <nav className="views">
            <div className="view-tab active">Main Table</div>
            <div className="view-tab muted">Kanban</div>
            <div className="view-tab muted">Timeline</div>
            <div className="view-tab muted">Files</div>
          </nav>

          <section className="metrics">
            <Metric label="Total projects" value={metrics.total} />
            <Metric label="Working / scheduled" value={metrics.active} />
            <Metric label="Stuck / TBC" value={metrics.stuck} />
            <Metric label="Complete" value={metrics.done} />
          </section>

          {loading ? (
            <section className="loading">Loading live project board...</section>
          ) : (
            <section>
              {GROUPS.map(group => {
                const rows = filtered.filter(project => project.project_group === group);
                return (
                  <section className="group" key={group}>
                    <div className="group-header">
                      <div className="group-title"><span className="group-colour" />{group}</div>
                      <div className="group-count">{rows.length} items</div>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Project</th>
                            <th>Owner</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Timeline</th>
                            <th>Notes</th>
                            <th>Source</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {rows.map(row => (
                            <tr key={row.id}>
                              <td className="project-cell">
                                {row.sharepoint_url ? (
                                  <a href={row.sharepoint_url} target="_blank" rel="noreferrer">{row.project}</a>
                                ) : row.project}
                                <span className="subtext">{row.client}</span>
                              </td>

                              <td><div className="owner"><span className="avatar">{initials(row.owner)}</span>{row.owner}</div></td>
                              <td><span className={`status ${statusClass(row.status)}`}>{row.status}</span></td>
                              <td><span className={`priority priority-${row.priority.toLowerCase()}`}>{row.priority}</span></td>
                              <td><div className="timeline" /><span className="subtext">{row.timeline || "TBC"}</span></td>
                              <td>{row.notes}</td>
                              <td>{row.source}</td>
                              <td><button className="icon-btn" onClick={() => editProject(row)}>Edit</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="add-row"><button onClick={() => addProject(group)}>+ Add item</button></div>
                  </section>
                );
              })}
            </section>
          )}
        </main>
      </section>

      {editing && (
        <aside className="panel open">
          <form onSubmit={saveProject}>
            <div className="panel-head">
              <h2>{editing.id ? "Edit project" : "Add project"}</h2>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)}>×</button>
            </div>

            <label>Project name <input required value={editing.project} onChange={event => setEditing({ ...editing, project: event.target.value })} /></label>
            <label>Client / source <input value={editing.client || ""} onChange={event => setEditing({ ...editing, client: event.target.value })} /></label>

            <label>Group
              <select value={editing.project_group} onChange={event => setEditing({ ...editing, project_group: event.target.value })}>
                {GROUPS.map(group => <option key={group}>{group}</option>)}
              </select>
            </label>

            <label>Status
              <select value={editing.status} onChange={event => setEditing({ ...editing, status: event.target.value })}>
                {STATUSES.map(status => <option key={status}>{status}</option>)}
              </select>
            </label>

            <label>Priority
              <select value={editing.priority} onChange={event => setEditing({ ...editing, priority: event.target.value })}>
                {PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
              </select>
            </label>

            <label>Owner <input value={editing.owner || ""} onChange={event => setEditing({ ...editing, owner: event.target.value })} /></label>
            <label>Timeline <input value={editing.timeline || ""} onChange={event => setEditing({ ...editing, timeline: event.target.value })} /></label>
            <label>SharePoint URL <input value={editing.sharepoint_url || ""} onChange={event => setEditing({ ...editing, sharepoint_url: event.target.value })} /></label>
            <label>Notes <textarea value={editing.notes || ""} onChange={event => setEditing({ ...editing, notes: event.target.value })} /></label>

            <div className="panel-actions">
              {editing.id ? <button type="button" className="danger" onClick={deleteProject}><Trash2 size={16} /> Delete</button> : <span />}
              <div>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </form>
        </aside>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
