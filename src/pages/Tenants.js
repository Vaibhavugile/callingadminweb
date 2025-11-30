// src/pages/Tenants.jsx
import React, { useEffect, useState } from "react";
import useUserProfile from "../hooks/useUserProfile";
import { db } from "../firebase";
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
import "./Tenants.css";

export default function TenantsPage() {
  // ---------- hooks must always be declared at top ----------
  const { profile } = useUserProfile();

  // tenants state
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // form state for add/edit
  const [tenantIdField, setTenantIdField] = useState("");
  const [displayNameField, setDisplayNameField] = useState("");
  const [emailField, setEmailField] = useState("");
  const [editingId, setEditingId] = useState(null); // tenantId being edited

  // subscribe tenants collection
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "tenants"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // sort by createdAt (if available) else id
        arr.sort((a, b) => {
          if (a.createdAt && b.createdAt && a.createdAt.seconds && b.createdAt.seconds) {
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

  // ---------- security / early returns AFTER hooks ----------
  if (!profile) return <div className="p-6">Loading profile…</div>;
  if (profile.role !== "admin") return <div className="p-6">Access denied</div>;

  // helper to clear form
  const clearForm = () => {
    setTenantIdField("");
    setDisplayNameField("");
    setEmailField("");
    setEditingId(null);
  };

  // add new tenant (also create userprofiles/{tenantId})
  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    const tenantId = (tenantIdField || "").trim();
    const displayName = (displayNameField || "").trim();
    const email = (emailField || "").trim().toLowerCase();

    if (!tenantId) {
      alert("tenantId is required");
      return;
    }

    try {
      // create/update tenants/{tenantId}
      const tenantRef = doc(db, "tenants", tenantId);
      const tenantPayload = {
        displayName: displayName || null,
        email: email || null,
        tenantId,
        updatedAt: serverTimestamp(),
      };

      // if adding new, also set createdAt
      if (!editingId) {
        await setDoc(tenantRef, {
          ...tenantPayload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(tenantRef, tenantPayload);
      }

      // create/update userprofiles/{tenantId}
      const profileRef = doc(db, "userProfiles", tenantId);
      const profilePayload = {
        displayName: displayName || null,
        email: email || null,
        tenantId,
        role: "tenant",
        updatedAt: serverTimestamp(),
      };

      if (!editingId) {
        await setDoc(profileRef, {
          ...profilePayload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(profileRef, profilePayload);
      }

      clearForm();
    } catch (err) {
      console.error("Failed to add/update tenant", err);
      alert("Failed to add/update tenant — see console for details.");
    }
  };

  // start editing
  const handleEdit = (t) => {
    setEditingId(t.id);
    setTenantIdField(t.id);
    setDisplayNameField(t.displayName || "");
    setEmailField(t.email || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // delete tenant (confirm) — use parameter name properly
  const handleDelete = async (tenantIdToDelete) => {
    if (!window.confirm(`Delete tenant "${tenantIdToDelete}" and its userprofile? This is destructive.`)) return;
    try {
      await deleteDoc(doc(db, "tenants", tenantIdToDelete));
      // also attempt to delete userprofiles/{tenantId}
      await deleteDoc(doc(db, "userProfiles", tenantIdToDelete));
    } catch (err) {
      console.error("Failed to delete tenant", err);
      alert("Failed to delete tenant — see console for details.");
    }
  };

  return (
    <div className="tenants-page">
      <div className="tenants-inner">
        <header className="tenants-header">
          <div>
            <h2 className="tenants-title">Tenants</h2>
            <div className="tenants-sub">Create, edit or remove tenant entries. Each tenant will also create/update a <code>userProfiles/{`{tenantId}`}</code> document.</div>
          </div>

          <div className="meta-pill">{loading ? "Loading…" : `${tenants.length} tenants`}</div>
        </header>

        <form className="tenant-form" onSubmit={handleAddOrUpdate}>
          <div className="form-row">
            <label className="form-label">Tenant ID</label>
            <input
              className="form-input"
              placeholder="unique-tenant-id (e.g. vaibhavv)"
              value={tenantIdField}
              onChange={(e) => setTenantIdField(e.target.value)}
              disabled={!!editingId} // don't allow changing ID when editing
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Display name</label>
            <input className="form-input" placeholder="Vaibhav" value={displayNameField} onChange={(e) => setDisplayNameField(e.target.value)} />
          </div>

          <div className="form-row">
            <label className="form-label">Email</label>
            <input className="form-input" placeholder="vaibhav@example.com" value={emailField} onChange={(e) => setEmailField(e.target.value)} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">{editingId ? "Update tenant" : "Add tenant"}</button>
            <button type="button" className="btn-ghost" onClick={clearForm}>Clear</button>
          </div>
        </form>

        <section className="tenants-list">
          {tenants.map((t) => (
            <article key={t.id} className="tenant-card">
              <div className="tenant-left">
                <div className="tenant-avatar">{(t.displayName || t.id || "?").toString().charAt(0).toUpperCase()}</div>
                <div className="tenant-info">
                  <div className="tenant-name">{t.displayName || "—"}</div>
                  <div className="tenant-meta">tenantId: <span className="mono">{t.id}</span></div>
                </div>
              </div>

              <div className="tenant-mid">
                <div><strong>Email</strong></div>
                <div className="muted">{t.email || "—"}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                  {t.createdAt && t.createdAt.seconds ? `Created: ${new Date(t.createdAt.seconds * 1000).toLocaleString()}` : null}
                </div>
              </div>

              <div className="tenant-actions">
                <button className="btn" onClick={() => handleEdit(t)}>Edit</button>
                <button className="btn danger" onClick={() => handleDelete(t.id)}>Delete</button>
              </div>
            </article>
          ))}
        </section>

        {error ? <div className="error-note">Error: {String(error)}</div> : null}
      </div>
    </div>
  );
}
