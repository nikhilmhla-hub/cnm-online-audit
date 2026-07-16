"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, RefreshCw, LogOut, Search, ShieldAlert, BarChart3, Clock, ClipboardList, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeadRow {
  Timestamp: string;
  "Submission ID": string;
  Source: string;
  Name: string;
  Phone: string;
  Class: string;
  Exam: string;
  "Overall Score": number;
  "Performance Tier": string;
  Archetype: string;
  "Primary Bottleneck": string;
  "Potential Score": number;
  "Potential Gain": number;
  "Lead Status": string;
}

interface BookingRow {
  Timestamp: string;
  "Booking ID": string;
  "Submission ID": string;
  "Queue Number": string;
  Name: string;
  Phone: string;
  Class: string;
  Exam: string;
  "Overall Score": number;
  Archetype: string;
  "Primary Bottleneck": string;
  "Potential Gain": number;
  "Booking Status": string;
  "WhatsApp Status"?: string;
  "WhatsApp Sent Time"?: string;
}

export default function AdminDashboardPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState("");
  const [authToken, setAuthToken] = React.useState("");
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  // Data state
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [bookings, setBookings] = React.useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dataError, setDataError] = React.useState("");

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [leadStatusFilter, setLeadStatusFilter] = React.useState("All");
  const [bookingStatusFilter, setBookingStatusFilter] = React.useState("All");
  const [bookingWhatsappFilter, setBookingWhatsappFilter] = React.useState("All");
  const [activeTab, setActiveTab] = React.useState<"queue" | "leads">("queue");

  // Status editing tracking
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  // Check sessionStorage for active credentials on mount
  React.useEffect(() => {
    const token = sessionStorage.getItem("cnm_admin_auth_token");
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
      fetchDashboardData(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        sessionStorage.setItem("cnm_admin_auth_token", data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        fetchDashboardData(data.token);
      } else {
        setAuthError(data.message || "Invalid credentials");
      }
    } catch {
      setAuthError("Failed to communicate with authentication server");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cnm_admin_auth_token");
    setIsAuthenticated(false);
    setAuthToken("");
    setLeads([]);
    setBookings([]);
  };

  const fetchDashboardData = async (token: string) => {
    setIsLoading(true);
    setDataError("");
    try {
      const response = await fetch("/api/admin/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.status === "success" || data.leads || data.bookings) {
        const rawLeads = data.leads || [];
        const rawBookings = data.bookings || [];

        const normalizedLeads = rawLeads.map((l: any) => {
          const rawDate = l["Created Date"] || "";
          const rawTime = l["Created Time"] || "";
          const ts = l.Timestamp || l["Created At"] || (rawDate && rawTime ? `${rawDate} ${rawTime}` : rawDate || "");
          return {
            ...l,
            "Submission ID": l["Submission ID"] || l["Queue Number"] || l.Phone || "",
            "Overall Score": l["Overall Score"] !== undefined ? l["Overall Score"] : (l.Score !== undefined ? Number(l.Score) : 0),
            "Lead Status": l["Lead Status"] || l.Status || "New",
            Timestamp: ts,
            Archetype: l.Archetype || l["Student Type"] || "",
            "Primary Bottleneck": l["Primary Bottleneck"] || l["Main Challenge"] || l.bottleneck || l.Bottleneck || "None"
          };
        });

        const normalizedBookings = rawBookings.map((b: any) => {
          const cleanPhone = String(b.Phone).replace(/['\s()-]/g, "");
          const assocLead = normalizedLeads.find((l: any) => String(l.Phone).replace(/['\s()-]/g, "") === cleanPhone);
          const rawDate = b["Created Date"] || "";
          const rawTime = b["Created Time"] || "";
          const ts = b.Timestamp || b["Created At"] || (rawDate && rawTime ? `${rawDate} ${rawTime}` : rawDate || "");

          return {
            ...b,
            Class: b.Class || (assocLead ? assocLead.Class : ""),
            Exam: b.Exam || (assocLead ? assocLead.Exam : ""),
            "Overall Score": b["Overall Score"] !== undefined ? b["Overall Score"] : (assocLead ? assocLead["Overall Score"] : 0),
            Archetype: b.Archetype || b["Student Type"] || (assocLead ? assocLead["Student Type"] || assocLead.Archetype : ""),
            "Primary Bottleneck": b["Primary Bottleneck"] || b["Main Challenge"] || (assocLead ? assocLead["Primary Bottleneck"] || assocLead.bottleneck || assocLead.Bottleneck || "None" : "None"),
            "Booking Status": b["Booking Status"] || b.status || b.bookingStatus || "Waiting",
            "WhatsApp Status": b["WhatsApp Status"] || b.whatsappStatus || "Pending",
            "WhatsApp Sent Time": b["WhatsApp Sent Time"] || b.whatsappSentTime || "",
            Timestamp: ts
          };
        });

        setLeads(normalizedLeads);
        setBookings(normalizedBookings);
      } else {
        throw new Error(data.message || "Failed to load reports queue");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection failure";
      setDataError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLeadStatus = async (submissionId: string, newStatus: string) => {
    setUpdatingId(submissionId);
    try {
      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: "update_lead",
          submissionId,
          leadStatus: newStatus,
        }),
      });

      if (!response.ok) throw new Error();

      const result = await response.json();
      if (result.status === "success") {
        setLeads((prev) =>
          prev.map((l) =>
            l["Submission ID"] === submissionId ? { ...l, "Lead Status": newStatus } : l
          )
        );
      } else {
        alert("Failed to update status on sheets");
      }
    } catch {
      alert("Network exception updating lead status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const response = await fetch("/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          action: "update_booking",
          bookingId,
          bookingStatus: newStatus,
        }),
      });

      if (!response.ok) throw new Error();

      const result = await response.json();
      if (result.status === "success") {
        setBookings((prev) =>
          prev.map((b) =>
            b["Booking ID"] === bookingId ? { ...b, "Booking Status": newStatus } : b
          )
        );
      } else {
        alert("Failed to update status on sheets");
      }
    } catch {
      alert("Network exception updating booking status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics (computed specifically for today local date matching)
  const stats = React.useMemo(() => {
    const todayStr = new Date().toDateString();
    
    const todayLeadsCount = leads.filter((l) => {
      try {
        return new Date(l.Timestamp).toDateString() === todayStr;
      } catch {
        return false;
      }
    }).length;

    const todayBookingsCount = bookings.filter((b) => {
      try {
        return new Date(b.Timestamp).toDateString() === todayStr;
      } catch {
        return false;
      }
    }).length;

    const conversionRate = todayLeadsCount > 0 ? Math.round((todayBookingsCount / todayLeadsCount) * 100) : 0;

    return {
      auditsToday: todayLeadsCount,
      bookingsToday: todayBookingsCount,
      conversion: conversionRate,
    };
  }, [leads, bookings]);

  // Filtering lists
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      const cleanPhone = String(b.Phone).replace(/^'/, "");
      const matchSearch =
        b.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cleanPhone.includes(searchQuery);

      const matchStatus = bookingStatusFilter === "All" || b["Booking Status"] === bookingStatusFilter;
      const matchWhatsApp = bookingWhatsappFilter === "All" || (b["WhatsApp Status"] || "Failed") === bookingWhatsappFilter;

      return matchSearch && matchStatus && matchWhatsApp;
    });
  }, [bookings, searchQuery, bookingStatusFilter, bookingWhatsappFilter]);

  const filteredLeads = React.useMemo(() => {
    return leads.filter((l) => {
      const cleanPhone = String(l.Phone).replace(/^'/, "");
      const matchSearch =
        l.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cleanPhone.includes(searchQuery);

      const matchStatus = leadStatusFilter === "All" || l["Lead Status"] === leadStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, leadStatusFilter]);

  // 1. Password Protection Gate View
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 w-full max-w-md mx-auto">
        <Card variant="glass" className="w-full relative p-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
          
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold font-sans text-white">Mentor Portal Gate</CardTitle>
              <p className="text-xs text-zinc-500 mt-1 font-light">
                Please authenticate using your CNM System Admin Credentials.
              </p>
            </div>
          </CardHeader>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-1">
                Kiosk Admin PIN
              </label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111111]/80 border border-border text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold transition-all font-sans text-sm min-h-[48px]"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-center text-xs text-red-400 font-mono flex items-center justify-center gap-1.5 animate-pulse">
                <ShieldAlert className="h-4 w-4" />
                {authError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isLoggingIn}
              className="w-full py-3.5 uppercase font-bold text-xs tracking-wider min-h-[48px] rounded-xl flex items-center justify-center"
            >
              {isLoggingIn ? "Verifying Keys..." : "Access Dashboard"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard Portal View
  return (
    <div className="w-full max-w-6xl py-4 space-y-6 animate-fade-in font-sans text-left">
      
      {/* Top Portal Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans">
            CNM Mentor Portal
          </h1>
          <p className="text-xs text-zinc-500 font-mono tracking-wide mt-0.5">
            LOCATION: GOPALPURA ROAD KIOSK TRACK
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchDashboardData(authToken)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors py-2.5 px-4 rounded-xl bg-card border border-border hover:border-zinc-700 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            {isLoading ? "Fetching..." : "Refresh"}
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors py-2.5 px-4 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/20 cursor-pointer min-h-[44px]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Lock
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" className="p-4 flex items-center gap-4 relative overflow-hidden border border-border/80">
          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gold" />
          <div className="h-10 w-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Audits Today</span>
            <div className="text-2xl font-black text-white font-mono">{stats.auditsToday}</div>
          </div>
        </Card>

        <Card variant="glass" className="p-4 flex items-center gap-4 relative overflow-hidden border border-border/80">
          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-blue-500" />
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Bookings Today</span>
            <div className="text-2xl font-black text-white font-mono">{stats.bookingsToday}</div>
          </div>
        </Card>

        <Card variant="glass" className="p-4 flex items-center gap-4 relative overflow-hidden border border-border/80">
          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-emerald-500" />
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Conversion Rate</span>
            <div className="text-2xl font-black text-white font-mono">{stats.conversion}%</div>
          </div>
        </Card>
      </div>

      {dataError && (
        <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/15 text-center text-xs text-red-400 font-mono flex items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {dataError}
        </div>
      )}

      {/* Tab Switcher & Search Section */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        {/* Tab selection buttons */}
        <div className="flex items-center gap-2 bg-[#121212] p-1.5 rounded-xl border border-border/60">
          <button
            onClick={() => setActiveTab("queue")}
            className={cn(
              "px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px]",
              activeTab === "queue"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                : "text-zinc-500 hover:text-white"
            )}
          >
            Session Bookings Queue ({filteredBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={cn(
              "px-5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px]",
              activeTab === "leads"
                ? "bg-gold text-black shadow-md shadow-gold/10"
                : "text-zinc-500 hover:text-white"
            )}
          >
            Leads Directory ({filteredLeads.length})
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by student name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-border text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold/30 transition-all font-sans text-xs min-h-[44px]"
          />
        </div>
      </div>

      {/* Dynamic Queue Tab content */}
      {activeTab === "queue" && (
        <Card variant="glass" className="border border-border/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/20">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Booked Counselor Desk Queue
            </span>

            {/* Status & WhatsApp filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-border/40">
                <span className="text-[8px] font-mono uppercase text-zinc-500 px-1.5">Booking:</span>
                {["All", "Waiting", "Called", "In Session", "Completed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setBookingStatusFilter(status)}
                    className={cn(
                      "px-2.5 py-1 rounded text-[9px] font-mono transition-all cursor-pointer",
                      bookingStatusFilter === status
                        ? "bg-blue-600 text-white"
                        : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-border/40">
                <span className="text-[8px] font-mono uppercase text-zinc-500 px-1.5">WhatsApp:</span>
                {["All", "Sent", "Failed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setBookingWhatsappFilter(status)}
                    className={cn(
                      "px-2.5 py-1 rounded text-[9px] font-mono transition-all cursor-pointer",
                      bookingWhatsappFilter === status
                        ? "bg-emerald-600 text-white"
                        : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-zinc-900/60 text-zinc-400 uppercase font-mono text-[9px] border-b border-border/40">
                  <th className="py-4 px-4">Queue #</th>
                  <th className="py-4 px-4">Student</th>
                  <th className="py-4 px-4">Track</th>
                  <th className="py-4 px-4">Score / Student Type</th>
                  <th className="py-4 px-4">Main Problem</th>
                  <th className="py-4 px-4 text-center">WhatsApp Alert</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-zinc-300">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((row) => {
                    const cleanPhone = String(row.Phone).replace(/^'/, "");
                    const isUpdating = updatingId === row["Booking ID"];

                    return (
                      <tr key={row["Booking ID"]} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-4 px-4 font-mono font-black text-blue-400 text-sm">{row["Queue Number"]}</td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{row.Name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{cleanPhone}</div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div>{row.Class}</div>
                          <div className="text-[9px] text-zinc-500">{row.Exam}</div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div className="font-bold text-white">{row["Overall Score"]}%</div>
                          <div className="text-[10px] text-gold">{row.Archetype}</div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          {row["Primary Bottleneck"] !== "None" ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                              {row["Primary Bottleneck"]}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                              None (Clear)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase",
                            row["WhatsApp Status"] === "Sent"
                              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border border-red-500/20 text-red-400"
                          )}>
                            {row["WhatsApp Status"] || "Failed"}
                          </span>
                          {row["WhatsApp Sent Time"] && (
                            <span className="block text-[8px] text-zinc-500 font-mono mt-1">
                              {(() => {
                                try {
                                  return new Date(row["WhatsApp Sent Time"]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } catch {
                                  return "";
                                }
                              })()}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <select
                            disabled={isUpdating}
                            value={row["Booking Status"]}
                            onChange={(e) => handleUpdateBookingStatus(row["Booking ID"], e.target.value)}
                            className={cn(
                              "bg-[#111] text-[10px] border px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 cursor-pointer font-mono font-bold",
                              row["Booking Status"] === "Completed" && "border-emerald-500/30 text-emerald-400",
                              row["Booking Status"] === "In Session" && "border-blue-500/30 text-blue-400",
                              row["Booking Status"] === "Called" && "border-amber-500/30 text-amber-400",
                              row["Booking Status"] === "Waiting" && "border-border text-zinc-400"
                            )}
                          >
                            <option value="Waiting">Waiting</option>
                            <option value="Called">Called</option>
                            <option value="In Session">In Session</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                      {isLoading ? "Syncing database queue..." : "No session bookings found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dynamic Leads Tab content */}
      {activeTab === "leads" && (
        <Card variant="glass" className="border border-border/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-zinc-950/20">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold" />
              Student Lead Records Directory
            </span>

            {/* Status filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "New", "Counseled", "Enrolled", "Follow Up", "Not Interested"].map((status) => (
                <button
                  key={status}
                  onClick={() => setLeadStatusFilter(status)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer",
                    leadStatusFilter === status
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border/60 text-zinc-500 hover:text-white hover:border-zinc-700"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-zinc-900/60 text-zinc-400 uppercase font-mono text-[9px] border-b border-border/40">
                  <th className="py-4 px-4">Student</th>
                  <th className="py-4 px-4">Source</th>
                  <th className="py-4 px-4">Track</th>
                  <th className="py-4 px-4">Score / Student Type</th>
                  <th className="py-4 px-4">Main Problem</th>
                  <th className="py-4 px-4">Projections</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-zinc-300">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((row) => {
                    const cleanPhone = String(row.Phone).replace(/^'/, "");
                    const isUpdating = updatingId === row["Submission ID"];

                    return (
                      <tr key={row["Submission ID"]} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{row.Name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{cleanPhone}</div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-400 text-[10px] font-bold">
                            {row.Source || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div>{row.Class}</div>
                          <div className="text-[9px] text-zinc-500">{row.Exam}</div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div className="font-bold text-white">{row["Overall Score"]}%</div>
                          <div className="text-[10px] text-gold">{row.Archetype}</div>
                        </td>
                        <td className="py-4 px-4 font-mono">
                          {row["Primary Bottleneck"] !== "None" ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                              {row["Primary Bottleneck"]}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                              None
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono">
                          <div>Target: {row["Potential Score"]}%</div>
                          <div className="text-[10px] text-emerald-400">+{row["Potential Gain"]} Marks</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <select
                            disabled={isUpdating}
                            value={row["Lead Status"] || "New"}
                            onChange={(e) => handleUpdateLeadStatus(row["Submission ID"], e.target.value)}
                            className={cn(
                              "bg-[#111] text-[10px] border px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 cursor-pointer font-mono font-bold",
                              row["Lead Status"] === "Enrolled" && "border-emerald-500/30 text-emerald-400",
                              row["Lead Status"] === "Counseled" && "border-blue-500/30 text-blue-400",
                              row["Lead Status"] === "Follow Up" && "border-amber-500/30 text-amber-400",
                              row["Lead Status"] === "Not Interested" && "border-red-500/35 text-red-400",
                              (row["Lead Status"] === "New" || !row["Lead Status"]) && "border-border text-zinc-400"
                            )}
                          >
                            <option value="New">New</option>
                            <option value="Counseled">Counseled</option>
                            <option value="Follow Up">Follow Up</option>
                            <option value="Enrolled">Enrolled</option>
                            <option value="Not Interested">Not Interested</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                      {isLoading ? "Syncing database leads..." : "No leads found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Back to Kiosk trigger */}
      <div className="pt-2 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to Kiosk Terminal
        </Link>
      </div>

    </div>
  );
}
