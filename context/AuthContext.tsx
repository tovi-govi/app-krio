import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/services/firebase";

export type UserRole = "admin" | "delivery";

type User = {
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  loginAdmin: (email: string, password: string) => Promise<UserRole | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = "krio_user";

const normalizePhoneId = (phone: string) => phone.replace(/\D/g, "") || phone;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

type AdminProfile = {
  name?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  disabled?: boolean;
};

async function saveUserToFirebase(userData: User) {
  if (!isFirebaseConfigured || !db) return;
  if (userData.role === "admin" || userData.role === "delivery") return;

  await setDoc(doc(db, "users", normalizePhoneId(userData.phone)), {
    ...userData,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

async function getAdminProfile(uid: string, email: string) {
  if (!db) return null;

  const uidSnap = await getDoc(doc(db, "admins", uid));
  if (uidSnap.exists()) return uidSnap.data() as AdminProfile;

  const emailSnap = await getDoc(doc(db, "admins", email));
  if (emailSnap.exists()) return emailSnap.data() as AdminProfile;

  return null;
}

function canAccessStaff(profile: AdminProfile | null) {
  if (!profile) return false;
  if (profile.disabled || profile.isActive === false) return false;
  const normalizedRole = profile.role?.trim().toLowerCase();
  return !normalizedRole || normalizedRole === "admin" || normalizedRole === "delivery";
}

function getStaffRole(profile: AdminProfile | null): UserRole {
  const normalizedRole = profile?.role?.trim().toLowerCase();
  return normalizedRole === "delivery" ? "delivery" : "admin";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((val) => {
        if (val) setUser(JSON.parse(val));
      })
      .catch((error) => {
        console.warn("Auth user storage load error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const persistUser = async (userData: User) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    saveUserToFirebase(userData).catch((error) => console.warn("Could not save user", error));
  };

  const loginAdmin = async (emailInput: string, password: string) => {
    const email = normalizeEmail(emailInput);
    if (!email || !password) return null;
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error("Firebase is not configured for staff login.");
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const adminProfile = await getAdminProfile(credential.user.uid, email);

      if (!canAccessStaff(adminProfile)) {
        await firebaseSignOut(auth).catch(() => undefined);
        return null;
      }

      const role = getStaffRole(adminProfile);
      await persistUser({
        name: adminProfile?.name || credential.user.displayName || (role === "delivery" ? "Krio Delivery" : "Krio Admin"),
        phone: adminProfile?.phone || role,
        email,
        role,
      });
      return role;
    } catch (err: any) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        throw new Error("Invalid staff email or password. Please check your login credentials.");
      }
      if (err.code === "auth/too-many-requests") {
        throw new Error("Access temporarily blocked due to multiple failed login attempts. Please try again later.");
      }
      if (err.code === "auth/network-request-failed") {
        throw new Error("Network connection error. Please check your internet connection and try again.");
      }
      throw err;
    }
  };

  const logout = async () => {
    if (auth) await firebaseSignOut(auth).catch(() => undefined);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = React.useMemo(
    () => ({ user, isLoading, loginAdmin, logout }),
    [user, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
