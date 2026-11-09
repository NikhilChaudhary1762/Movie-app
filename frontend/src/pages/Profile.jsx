
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import {
  UserRound,
  Mail,
  ShieldCheck,
  Pencil,
  Save,
  X,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Heart,
  ArrowLeft,
  Clapperboard,
  Sparkles,
  KeyRound,
  Settings,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b0c10] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10";

const PasswordInput = ({
  label,
  value,
  onChange,
  visible,
  toggle,
  placeholder,
  autoComplete,
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-zinc-300">
      {label}
    </label>

    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} pr-12`}
      />

      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

export default function Profile() {
  const { user, setUser } = useAuth();

  // Profile States
  const [name, setName] = useState(user?.name || "");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Profile Photo States
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");

  const profileImage = user?.profileImage || "";

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // User Initials
  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  // Upload / Change Profile Photo
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Validate Image
    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image");
      e.target.value = "";
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must be less than 5MB");
      e.target.value = "";
      return;
    }

    try {
      setImageLoading(true);
      setImageError("");

      const formData = new FormData();
      formData.append("profileImage", file);

      const { data } = await api.put(
        "/auth/profile/photo",
        formData
      );

      setUser(data.user);
    } catch (err) {
      setImageError(
        err.response?.data?.message ||
          "Profile photo upload failed"
      );
    } finally {
      setImageLoading(false);
      e.target.value = "";
    }
  };

  // Remove Profile Photo
  const handleRemovePhoto = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to remove your profile photo?"
    );

    if (!confirmed) return;

    try {
      setImageLoading(true);
      setImageError("");

      const { data } = await api.delete(
        "/auth/profile/photo"
      );

      setUser(data.user);
    } catch (err) {
      setImageError(
        err.response?.data?.message ||
          "Profile photo removal failed"
      );
    } finally {
      setImageLoading(false);
    }
  };

  // Update Profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { data } = await api.put("/auth/profile", {
        name: name.trim(),
      });

      setUser(data.user);
      setEditing(false);
      setMessage("Profile updated successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Profile update failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "New password must be at least 6 characters"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    try {
      setPasswordLoading(true);

      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage("Password changed successfully!");
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          "Password change failed"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-white">

      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-red-600/10 blur-[120px]" />
        <div className="absolute -right-40 top-96 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <main className="relative mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to Home
          </Link>

          <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-red-500">
            <Clapperboard size={20} />
            MOVIEFLEX
          </div>

        </div>

        {/* Page Heading */}
        <div className="mb-10">

          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-red-400">
            <Sparkles size={16} />
            ACCOUNT CENTER
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            My Profile
          </h1>

          <p className="mt-3 text-sm text-zinc-400 md:text-base">
            Manage your personal information and account security.
          </p>

        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

          {/* Left Profile Card */}
          <div className="space-y-6">

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111217]">

              {/* Cover */}
              <div className="relative h-32 bg-linear-to-br from-red-950 via-[#281016] to-[#111217]">

                <div className="absolute inset-0 bg-linear-to-t from-[#111217] to-transparent" />

                <div className="absolute right-5 top-5 rounded-lg border border-white/10 bg-black/20 p-2 backdrop-blur">
                  <Clapperboard size={20} className="text-red-400" />
                </div>

              </div>

              {/* Avatar */}
              <div className="px-6 pb-6">

                <div className="relative -mt-12 mb-5 h-24 w-24">

                  {/* Avatar Image / Initials */}
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-4 border-[#111217] bg-linear-to-br from-red-500 to-red-800 text-3xl font-black shadow-xl shadow-red-500/20">

                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}

                  </div>

                  {/* Camera Button */}
                  <label
                    htmlFor="profile-photo"
                    title="Change profile photo"
                    className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-4 border-[#111217] bg-red-600 text-white shadow-lg transition hover:bg-red-700"
                  >
                    <Camera size={17} />
                  </label>

                </div>

                {/* Change / Remove Buttons */}
                <div className="mb-5 flex flex-wrap gap-2">

                  <label
                    htmlFor="profile-photo"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-semibold transition hover:bg-red-700"
                  >
                    <Upload size={15} />
                    Change Photo
                  </label>

                  {profileImage && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={imageLoading}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Remove Photo
                    </button>
                  )}

                  {/* Hidden File Input */}
                  <input
                    id="profile-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                </div>

                {/* Upload Loading */}
                {imageLoading && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-red-400">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    Uploading photo...
                  </div>
                )}

                {/* Upload Error */}
                {imageError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {imageError}
                  </div>
                )}

                <h2 className="text-2xl font-bold">
                  {user?.name || "MovieFlex User"}
                </h2>

                <p className="mt-2 break-all text-sm text-zinc-400">
                  {user?.email || "Email unavailable"}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400">
                  <CheckCircle size={14} />
                  Active Account
                </div>

                <div className="mt-6 border-t border-white/5 pt-5">

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Account Role</span>

                    <span className="rounded-md bg-white/5 px-3 py-1 font-medium capitalize text-zinc-200">
                      {user?.role || "user"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Membership</span>

                    <span className="font-medium text-red-400">
                      MovieFlex Member
                    </span>
                  </div>

                </div>

              </div>

            </div>

            {/* Watchlist Card */}
            <Link
              to="/watchlist"
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#111217] p-5 transition hover:border-red-500/30 hover:bg-[#151116]"
            >

              <div className="flex items-center gap-4">

                <div className="rounded-xl bg-red-500/10 p-3 text-red-400 transition group-hover:bg-red-500/20">
                  <Heart size={22} />
                </div>

                <div>
                  <h3 className="font-semibold">My Watchlist</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Your saved movies and series
                  </p>
                </div>

              </div>

              <ArrowLeft
                size={18}
                className="rotate-180 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white"
              />

            </Link>

          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Personal Information */}
            <section className="rounded-2xl border border-white/10 bg-[#111217] p-6 md:p-8">

              <div className="mb-7 flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                    <UserRound size={21} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      Personal Information
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Your account details
                    </p>
                  </div>

                </div>

                {!editing && (
                  <button
                    onClick={() => {
                      setName(user?.name || "");
                      setEditing(true);
                      setMessage("");
                      setError("");
                    }}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                )}

              </div>

              {!editing ? (

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-xl border border-white/5 bg-[#0b0c10] p-5">

                    <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                      <UserRound size={15} />
                      FULL NAME
                    </div>

                    <p className="wrap-break-word font-medium">
                      {user?.name || "Not available"}
                    </p>

                  </div>

                  <div className="rounded-xl border border-white/5 bg-[#0b0c10] p-5">

                    <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                      <Mail size={15} />
                      EMAIL ADDRESS
                    </div>

                    <p className="break-all font-medium">
                      {user?.email || "Not available"}
                    </p>

                  </div>

                  <div className="rounded-xl border border-white/5 bg-[#0b0c10] p-5 sm:col-span-2">

                    <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                      <ShieldCheck size={15} />
                      ACCOUNT ROLE
                    </div>

                    <p className="font-medium capitalize">
                      {user?.role || "user"}
                    </p>

                  </div>

                </div>

              ) : (

                <form onSubmit={handleUpdateProfile} className="space-y-5">

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-300">
                      Update Full Name
                    </label>

                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <Save size={17} />
                      {loading ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setName(user?.name || "");
                        setError("");
                      }}
                      className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/5"
                    >
                      <X size={17} />
                      Cancel
                    </button>

                  </div>

                </form>

              )}

              {/* Profile Messages */}
              {message && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
                  <CheckCircle size={18} />
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

            </section>

            {/* Password Security */}
            <section className="rounded-2xl border border-white/10 bg-[#111217] p-6 md:p-8">

              <div className="mb-7 flex items-center gap-3">

                <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
                  <LockKeyhole size={21} />
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Security & Password
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Keep your account secure
                  </p>
                </div>

              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">

                <PasswordInput
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  visible={showCurrent}
                  toggle={() => setShowCurrent(!showCurrent)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />

                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  visible={showNew}
                  toggle={() => setShowNew(!showNew)}
                  placeholder="Enter new password (minimum 6 characters)"
                  autoComplete="new-password"
                />

                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  visible={showConfirm}
                  toggle={() => setShowConfirm(!showConfirm)}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                />

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <KeyRound size={15} />
                  Password must contain at least 6 characters.
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-red-700 px-5 py-3.5 text-sm font-semibold transition hover:from-red-500 hover:to-red-600 disabled:opacity-50 sm:w-auto"
                >
                  <LockKeyhole size={17} />
                  {passwordLoading
                    ? "Updating Password..."
                    : "Update Password"}
                </button>

              </form>

              {passwordMessage && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
                  <CheckCircle size={18} />
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  <AlertCircle size={18} />
                  {passwordError}
                </div>
              )}

            </section>

            {/* Account Settings */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#111217] p-5">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-white/5 p-3 text-zinc-400">
                  <Settings size={20} />
                </div>

                <div>
                  <h3 className="font-semibold">Account Settings</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Manage your MovieFlex account
                  </p>
                </div>

              </div>

              <span className="text-xs text-zinc-500">
                MovieFlex
              </span>

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-zinc-600">
          <p>MovieFlex • Your entertainment, your world.</p>
        </div>

      </main>

    </div>
  );
}
