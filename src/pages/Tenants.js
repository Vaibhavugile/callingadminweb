// src/pages/Tenants.jsx
import React, { useEffect, useState } from "react";
import useUserProfile from "../hooks/useUserProfile";
import { db, functions } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import "./Tenants.css";

export default function TenantsPage() {
  // ---------- hooks ----------
  const { user, profile } = useUserProfile();

  // tenants state
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // form state for add/edit
  const [tenantIdField, setTenantIdField] = useState("");
  const [displayNameField, setDisplayNameField] = useState("");
  const [emailField, setEmailField] = useState("");
  const [passwordField, setPasswordField] = useState(""); // used only for Auth + function
  const [editingId, setEditingId] = useState(null); // tenantId being edited
  const [saving, setSaving] = useState(false);

  // subscribe tenants collection
  useEffect(() => {
    setLoading(true);
    const qTenants = query(collection(db, "tenants"));
    const unsub = onSnapshot(
      qTenants,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => {
          if (
            a.createdAt &&
            b.createdAt &&
            a.createdAt.seconds &&
            b.createdAt.seconds
          ) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return a.id.localeCompare(b.id);
        });
        setTenants(arr);
        setLoading(false);
      },
      (err) => {
        console.error("tenants onSnapshot error:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ---------- security ----------
  if (!profile) return <div className="p-6">Loading profile…</div>;
  if (profile.role !== "admin") return <div className="p-6">Access denied</div>;

  // ---------- helpers ----------
  const connectedTenants =
    (profile && Array.isArray(profile.connectedTenants)
      ? profile.connectedTenants
      : []) || [];

  const isConnected = (tenantId) => connectedTenants.includes(tenantId);

  const clearForm = () => {
    setTenantIdField("");
    setDisplayNameField("");
    setEmailField("");
    setPasswordField("");
    setEditingId(null);
  };

  // ---------- ADD / UPDATE TENANT ----------
  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    const tenantId = (tenantIdField || "").trim();
    const displayName = (displayNameField || "").trim();
    const email = (emailField || "").trim().toLowerCase();
    const password = (passwordField || "").trim();

    if (!tenantId) {
      alert("tenantId is required");
      return;
    }

    // For NEW tenants, require email + password
    if (!editingId) {
      if (!email) {
        alert("Email is required for new tenant.");
        return;
      }
      if (!password || password.length < 6) {
        alert("Password must be at least 6 characters for new tenant.");
        return;
      }
    }

    if (!user || !user.uid) {
      alert("Missing current admin user (auth).");
      return;
    }

    setSaving(true);

    try {
      // 1) Create/update tenants/{tenantId}
      const tenantRef = doc(db, "tenants", tenantId);
      const tenantPayload = {
        displayName: displayName || null,
        email: email || null,
        tenantId,
        updatedAt: serverTimestamp(),
      };

      // mark which admin created it
      tenantPayload.createdByAdminUid = user.uid;
      tenantPayload.createdByAdminEmail = user.email || null;

      if (!editingId) {
        await setDoc(tenantRef, {
          ...tenantPayload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(tenantRef, tenantPayload);
      }

      // 2) For NEW tenants, call Cloud Function to create Auth user + userProfiles/{uid}
      if (!editingId) {
        const createTenantUser = httpsCallable(functions, "createTenantUser");
        const result = await createTenantUser({
          tenantId,
          email,
          password,
          displayName,
        });

        console.log("createTenantUser result:", result?.data);
        alert("Tenant created and Auth user + userProfile created.");
      } else {
        // editing existing tenant: we are NOT updating Auth password/email here
        // (you can add another function for that later if needed)
        alert("Tenant updated (no Auth changes).");
      }

      clearForm();
    } catch (err) {
      console.error("Failed to add/update tenant", err);
      alert(
        err?.message ||
          "Failed to add/update tenant — see console for details."
      );
    } finally {
      setSaving(false);
    }
  };

  // start editing
  const handleEdit = (t) => {
    setEditingId(t.id);
    setTenantIdField(t.id);
    setDisplayNameField(t.displayName || "");
    setEmailField(t.email || "");
    setPasswordField(""); // do not show / reuse old password
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // delete tenant (confirm)
  const handleDelete = async (tenantIdToDelete) => {
    if (
      !window.confirm(
        `Delete tenant "${tenantIdToDelete}" and its Firestore userProfile? This does NOT delete the Auth user.`
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "tenants", tenantIdToDelete));
      await deleteDoc(doc(db, "userProfiles", tenantIdToDelete)); // LEGACY doc if exists
      alert("Tenant + legacy userProfile doc deleted (Auth user not deleted).");
    } catch (err) {
      console.error("Failed to delete tenant", err);
      alert("Failed to delete tenant — see console for details.");
    }
  };

  // ---------- CONNECT / DISCONNECT TENANT TO ADMIN ----------
  const handleToggleConnect = async (tenantId) => {
    const adminProfileDocId = user?.uid;

    if (!adminProfileDocId) {
      alert(
        "Cannot determine your userProfile for connect (missing auth user UID)."
      );
      return;
    }

    try {
      const profileRef = doc(db, "userProfiles", adminProfileDocId);
      const current = Array.isArray(profile.connectedTenants)
        ? profile.connectedTenants
        : [];

      let next;
      if (current.includes(tenantId)) {
        next = current.filter((t) => t !== tenantId);
      } else {
        next = [...current, tenantId];
      }

      await setDoc(
        profileRef,
        {
          connectedTenants: next,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to toggle tenant connection", err);
      alert("Failed to connect/disconnect tenant — see console for details.");
    }
  };

  // Show ONLY tenants created by this admin
  const visibleTenants = tenants.filter(
    (t) => t.createdByAdminUid === user?.uid
  );

  return (
    <div className="tenants-page">
      <div className="tenants-inner">
        <header className="tenants-header">
          <div>
            <h2 className="tenants-title">Tenants</h2>
            <div className="tenants-sub">
              Create, edit or remove tenant entries.
              <br />
              For NEW tenants we create:
              <ul>
                <li>Firestore: <code>tenants/"tenantId"</code></li>
                <li>Auth user (email + password)</li>
                <li>
                  Firestore: <code>userProfiles/"uid"</code> with role
                  "tenant"
                </li>
              </ul>
              You only see tenants that <strong>you created</strong>.
            </div>
          </div>

          <div className="meta-pill">
            {loading ? "Loading…" : `${visibleTenants.length} tenants`}
          </div>
        </header>

        {/* Form to add / edit tenant */}
        <form className="tenant-form" onSubmit={handleAddOrUpdate}>
          <div className="form-row">
            <label className="form-label">Tenant ID</label>
            <input
              className="form-input"
              placeholder="unique-tenant-id (e.g. vaibhavv)"
              value={tenantIdField}
              onChange={(e) => setTenantIdField(e.target.value)}
              disabled={!!editingId}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Display name</label>
            <input
              className="form-input"
              placeholder="Vaibhav"
              value={displayNameField}
              onChange={(e) => setDisplayNameField(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Email (tenant login)</label>
            <input
              className="form-input"
              type="email"
              placeholder="tenant@example.com"
              value={emailField}
              onChange={(e) => setEmailField(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="form-label">
              Password (used for Auth, not stored in Firestore)
            </label>
            <input
              className="form-input"
              type="password"
              placeholder={
                editingId
                  ? "Leave blank to keep existing password"
                  : "min 6 characters"
              }
              value={passwordField}
              onChange={(e) => setPasswordField(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? "Saving…"
                : editingId
                ? "Update tenant"
                : "Add tenant"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={clearForm}
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </form>

        {/* List of tenants with connect buttons (only created by you) */}
        <section className="tenants-list">
          {visibleTenants.map((t) => {
            const connected = isConnected(t.id);
            return (
              <article key={t.id} className="tenant-card">
                <div className="tenant-left">
                  <div className="tenant-avatar">
                    {(t.displayName || t.id || "?")
                      .toString()
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="tenant-info">
                    <div className="tenant-name">
                      {t.displayName || "—"}
                    </div>
                    <div className="tenant-meta">
                      tenantId: <span className="mono">{t.id}</span>
                    </div>
                    <div className="tenant-meta small">
                      Created by:{" "}
                      <span className="mono">
                        {t.createdByAdminEmail ||
                          t.createdByAdminUid ||
                          "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="tenant-mid">
                  <div>
                    <strong>Email</strong>
                  </div>
                  <div className="muted">{t.email || "—"}</div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "var(--muted)",
                    }}
                  >
                    {t.createdAt && t.createdAt.seconds
                      ? `Created: ${new Date(
                          t.createdAt.seconds * 1000
                        ).toLocaleString()}`
                      : null}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <strong>Connected to you:</strong>{" "}
                    {connected ? "Yes" : "No"}
                  </div>
                </div>

                <div className="tenant-actions">
                  <button
                    className={connected ? "btn-secondary" : "btn"}
                    type="button"
                    onClick={() => handleToggleConnect(t.id)}
                  >
                    {connected ? "Disconnect" : "Connect to me"}
                  </button>

                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleEdit(t)}
                  >
                    Edit
                  </button>

                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => handleDelete(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {error ? (
          <div className="error-note">Error: {String(error)}</div>
        ) : null}
      </div>
    </div>
  );
}
