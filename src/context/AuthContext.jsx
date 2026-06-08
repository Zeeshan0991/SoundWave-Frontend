import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "soundwave_token";
const USER_KEY  = "soundwave_user";
const API_BASE  = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [pendingRoleSelect, setPendingRoleSelect] = useState(false);

  const availTimers = useRef({});

  /* ── SESSION RESTORE ───────────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const params         = new URLSearchParams(window.location.search);
        const oauthToken     = params.get("token");
        const oauthUser      = params.get("user");
        const isNewOAuthUser = params.get("isNewOAuthUser");

        if (oauthToken && oauthUser) {
          const parsedUser = JSON.parse(decodeURIComponent(oauthUser));

          localStorage.setItem(TOKEN_KEY, oauthToken);
          localStorage.setItem(USER_KEY, JSON.stringify(parsedUser));

          if (isMounted) setUser(parsedUser);

          if (isNewOAuthUser === "true") {
            if (isMounted) setPendingRoleSelect(true);
          }

          window.history.replaceState({}, "", window.location.pathname);
          return;
        }

        const token      = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (!token || !storedUser) {
          if (isMounted) setLoading(false);
          return;
        }

        let res;
        try {
          res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          if (isMounted) setUser(JSON.parse(storedUser));
          return;
        }

        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          return;
        }

        const data      = await res.json();
        const freshUser = data.user;

        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));

        if (isMounted) {
          setUser(freshUser);

          if (freshUser.role === "pending") {
            setPendingRoleSelect(true);
          }
        }
      } catch (err) {
        console.error("[AuthContext] session restore:", err);

        try {
          const storedUser = localStorage.getItem(USER_KEY);
          if (storedUser && isMounted) {
            setUser(JSON.parse(storedUser));
          }
        } catch {}
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  /* ── Login ─────────────────────────────────────────────────────────── */
  const login = useCallback(async ({ identifier, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          field:   data.field,
          message: data.message || "Login failed",
        };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Signup ───────────────────────────────────────────────────────── */
  const signup = useCallback(async ({ username, email, password, role }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          role: role === "artist" ? "artist" : "user",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          field:   data.field,
          message: data.message || "Signup failed",
        };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Google OAuth ─────────────────────────────────────────────────── */
  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_BASE}/auth/google`;
  }, []);

  /* ── Confirm Role ─────────────────────────────────────────────────── */
  const confirmRole = useCallback(async (role) => {
    try {
      const res = await fetch(`${API_BASE}/auth/set-role`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || "Failed to set role" };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setUser(data.user);
      setPendingRoleSelect(false);

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Create Password ──────────────────────────────────────────────── */
  const createPassword = useCallback(async ({ newPassword }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/create-password`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          field:   data.field,
          message: data.message || "Failed to create password.",
        };
      }

      if (data.token && data.user) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
      }

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Logout ───────────────────────────────────────────────────────── */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setPendingRoleSelect(false);
  }, []);

  /* ── Update user (internal helper) ───────────────────────────────── */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const updated = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  /* ── Update profile ──────────────────────────────────────────────── */
  const updateProfile = useCallback(
    async ({ username, bio, genre }) => {
      try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
          method:  "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ username, bio, genre }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, message: data.message };
        }

        updateUser(data.user || { username });
        return { success: true };
      } catch {
        return { success: false, message: "Network error." };
      }
    },
    [updateUser]
  );

  /* ── Upload avatar ───────────────────────────────────────────────── */
  const uploadAvatar = useCallback(
    async (file) => {
      try {
        const formData = new FormData();
        formData.append("avatar", file);

        const res = await fetch(`${API_BASE}/auth/avatar`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body:    formData,
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, message: data.message };
        }

        updateUser({ avatar: data.avatarUrl });
        return { success: true, avatarUrl: data.avatarUrl };
      } catch {
        return { success: false, message: "Upload failed." };
      }
    },
    [updateUser]
  );

  /* ── Change password ───────────────────────────────────────────── */
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method:  "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message };
      }

      return { success: true };
    } catch {
      return { success: false, message: "Network error." };
    }
  }, []);

  /* ── Forgot password ───────────────────────────────────────────── */
  const forgotPassword = useCallback(async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || "Request failed" };
      }

      return {
        success:  true,
        field:    data.field    || null,
        devToken: data.devToken || null,
        resetUrl: data.resetUrl || null,
      };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Reset password ───────────────────────────────────────────── */
  const resetPassword = useCallback(async ({ token, newPassword }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, message: data.message || "Reset failed" };
      }

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Availability check ─────────────────────────────────────────── */
  const checkAvailability = useCallback((field, value) => {
    return new Promise((resolve) => {
      clearTimeout(availTimers.current[field]);

      availTimers.current[field] = setTimeout(async () => {
        if (!value || value.length < 2) {
          resolve({ available: null });
          return;
        }

        try {
          const res = await fetch(
            `${API_BASE}/auth/check-availability?${field}=${encodeURIComponent(value)}`
          );

          const data = await res.json();
          resolve({ available: data.available });
        } catch {
          resolve({ available: null });
        }
      }, 400);
    });
  }, []);

  /* ── ✅ PHASE 12: Send OTP ──────────────────────────────────────────
   * Centralises the sendOtp call into AuthContext so components don't
   * call fetch directly. AuthPage.jsx previously called the endpoint
   * inline inside handleSignup — that still works, but this method is
   * now available for any future component that needs to trigger OTP.
   *
   * Returns:
   *   { success: true,  devOtp: "123456" }   — code generated
   *   { success: false, field, message }       — validation/conflict error
  ─────────────────────────────────────────────────────────────────── */
  const sendOtp = useCallback(async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          field:   data.field   || null,
          message: data.message || "Failed to send verification code.",
        };
      }

      return { success: true, devOtp: data.devOtp || "" };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── ✅ PHASE 12: Verify OTP ────────────────────────────────────────
   * Centralises the verifyOtp call into AuthContext.
   *
   * Returns:
   *   { success: true }                        — verified, register is now unlocked
   *   { success: false, field, message }        — wrong code / expired / attempts
  ─────────────────────────────────────────────────────────────────── */
  const verifyOtp = useCallback(async (email, otp) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.verified) {
        return {
          success: false,
          field:   data.field   || null,
          message: data.message || "Verification failed.",
        };
      }

      return { success: true };
    } catch {
      return { success: false, message: "Network error. Please try again." };
    }
  }, []);

  /* ── Context value ──────────────────────────────────────────────── */
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user && user?.role !== "pending",
        isArtist: user?.role === "artist",
        pendingRoleSelect,

        login,
        signup,
        logout,
        loginWithGoogle,
        confirmRole,
        createPassword,

        updateUser,
        updateProfile,
        uploadAvatar,
        changePassword,
        forgotPassword,
        resetPassword,
        checkAvailability,

        // ✅ PHASE 12: OTP methods now in context
        sendOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}