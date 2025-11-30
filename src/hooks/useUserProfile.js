// src/hooks/useUserProfile.js
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function useUserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setProfile(null);
      setLoading(true);

      if (u) {
        const ref = doc(db, 'userProfiles', u.uid);
        unsubProfile = onSnapshot(ref, snap => {
          if (snap.exists()) setProfile(snap.data());
          else setProfile({ email: u.email, role: 'user' });
          setLoading(false);
        }, err => {
          console.error('profile snapshot', err);
          setLoading(false);
        });
      } else {
        if (unsubProfile) { unsubProfile(); unsubProfile = null; }
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return { user, profile, loading };
}
