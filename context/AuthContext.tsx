import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/services/firebase";

export type UserRole = "customer" | "admin";

type User = {
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  loginCustomer: (user: Omit<User, "role">) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  login: (user: Omit<User, "role">) => Promise<void>;
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
  if (userData.role === "admin") return;

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

function canAccessAdmin(profile: AdminProfile | null) {
  if (!profile) return false;
  if (profile.disabled || profile.isActive === false) return false;
  return !profile.role || profile.role === "admin";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((val) => {
      if (val) setUser(JSON.parse(val));
      setIsLoading(false);
    });
  }, []);

  const persistUser = async (userData: User) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    saveUserToFirebase(userData).catch((error) => console.warn("Could not save user", error));
  };

  const loginCustomer = async (userData: Omit<User, "role">) => {
    await persistUser({ ...userData, role: "customer" });
  };

  const loginAdmin = async (emailInput: string, password: string) => {
    const email = normalizeEmail(emailInput);
    if (!email || !password) return false;
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error("Firebase is not configured for admin login.");
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const adminProfile = await getAdminProfile(credential.user.uid, email);

    if (!canAccessAdmin(adminProfile)) {
      await firebaseSignOut(auth).catch(() => undefined);
      return false;
    }

    await persistUser({
      name: adminProfile?.name || credential.user.displayName || "Krio Admin",
      phone: adminProfile?.phone || "admin",
      email,
      role: "admin",
    });
    return true;
  };

  const logout = async () => {
    if (auth) await firebaseSignOut(auth).catch(() => undefined);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginCustomer, loginAdmin, login: loginCustomer, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
