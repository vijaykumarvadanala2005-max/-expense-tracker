import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./App.css";

const API_URL = "http://localhost:3001/transactions";

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Salary",
  "Freelance",
  "Other",
];

const initialProfile = {
  name: "Vijay Kumar",
  email: "vijay@example.com",
  phone: "9876543210",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("expenseProfile")) || initialProfile;
    } catch {
      return initialProfile;
    }
  });

  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(profile);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const titleInputRef = useRef(null);

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Unable to fetch transactions");
        }

        const data = await response.json();
        setTransactions(data);
        setError("");
      } catch {
        const savedData = JSON.parse(
          localStorage.getItem("expenseTransactions") || "[]"
        );

        setTransactions(savedData);
        setError("API connection unavailable. Showing saved local data.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Save transactions in Local Storage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        "expenseTransactions",
        JSON.stringify(transactions)
      );
    }
  }, [transactions, loading]);

  // Save profile in Local Storage
  useEffect(() => {
    localStorage.setItem("expenseProfile", JSON.stringify(profile));
  }, [profile]);

  // Focus form field when editing
  useEffect(() => {
    if (editingId !== null) {
      titleInputRef.current?.focus();
    }
  }, [editingId]);

  // Calculate dashboard totals
  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  // Chart data
  const chartData = useMemo(() => {
    const income = totals.income;
    const expenses = totals.expenses;

    return [
      { name: "Income", amount: income },
      { name: "Expenses", amount: expenses },
    ];
  }, [totals]);

  const categoryData = useMemo(() => {
    const result = {};

    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        result[item.category] =
          (result[item.category] || 0) + Number(item.amount);
      });

    return Object.entries(result).map(([name, value]) => ({
      name,
      value,
    }));
  }, [transactions]);

  const formatAmount = (value) =>
    `₹${Number(value).toLocaleString("en-IN")}`;

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  // Reset transaction form
  const resetForm = useCallback(() => {
    setTitle("");
    setAmount("");
    setType("expense");
    setCategory("Food");
    setDate(new Date().toISOString().split("T")[0]);
    setEditingId(null);
  }, []);

  // Add or update transaction
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (title.trim().length < 2) {
      showMessage("Description must contain at least 2 characters.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showMessage("Please enter a valid amount.");
      return;
    }

    const transactionData = {
      title: title.trim(),
      amount: Number(amount),
      type,
      category,
      date,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        try {
          const response = await fetch(`${API_URL}/${editingId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(transactionData),
          });

          if (!response.ok) throw new Error("Update failed");

          const updatedData = await response.json();

          setTransactions((prev) =>
            prev.map((item) =>
              String(item.id) === String(editingId)
                ? updatedData
                : item
            )
          );
        } catch {
          setTransactions((prev) =>
            prev.map((item) =>
              String(item.id) === String(editingId)
                ? { ...item, ...transactionData }
                : item
            )
          );
        }

        showMessage("Transaction updated successfully!");
      } else {
        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(transactionData),
          });

          if (!response.ok) throw new Error("Add failed");

          const newData = await response.json();

          setTransactions((prev) => [...prev, newData]);
        } catch {
          const newData = {
            ...transactionData,
            id: Date.now(),
          };

          setTransactions((prev) => [...prev, newData]);
        }

        showMessage("Transaction added successfully!");
      }

      resetForm();
    } finally {
      setSaving(false);
    }
  };

  // Edit transaction
  const handleEdit = useCallback((item) => {
    setTitle(item.title);
    setAmount(item.amount);
    setType(item.type);
    setCategory(item.category);
    setDate(item.date);
    setEditingId(item.id);

    setActivePage("Manage");
  }, []);

  // Delete transaction
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");
    } catch {
      // Local state will still be updated below
    }

    setTransactions((prev) =>
      prev.filter((item) => String(item.id) !== String(id))
    );

    showMessage("Transaction deleted successfully!");
  };

  // Save profile
  const handleProfileSave = (e) => {
    e.preventDefault();

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      showMessage("Name and email are required.");
      return;
    }

    setProfile(profileForm);
    setEditProfile(false);

    showMessage("Profile updated successfully!");
  };

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const menuItems = [
    { name: "Dashboard", icon: "▦" },
    { name: "Transactions", icon: "⇄" },
    { name: "Reports", icon: "▥" },
    { name: "Manage", icon: "⚙" },
  ];

  const renderTransactions = (data) => (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Category</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="5" className="empty-state">
                No transactions found.
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                </td>

                <td>
                  <span className="category-badge">
                    {item.category}
                  </span>
                </td>

                <td>{formatDate(item.date)}</td>

                <td
                  className={
                    item.type === "income"
                      ? "income-text"
                      : "expense-text"
                  }
                >
                  {item.type === "income" ? "+" : "-"}
                  {formatAmount(item.amount)}
                </td>

                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">₹</div>
          <h2>Expense<span>Flow</span></h2>
        </div>

        <p className="menu-label">MAIN MENU</p>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={
                activePage === item.name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => {
                setActivePage(item.name);
                setError("");
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="avatar">
              {profile.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{profile.name}</strong>
              <small>Personal Account</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="welcome-text">Welcome back, {profile.name}!</p>
            <h1>{activePage}</h1>
          </div>

          <div className="topbar-date">
            {new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        {message && <div className="success-message">{message}</div>}

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : (
          <>
            {/* DASHBOARD PAGE */}
            {activePage === "Dashboard" && (
              <section className="page-content">
                <div className="summary-grid">
                  <div className="summary-card balance-card">
                    <div className="card-top">
                      <span>Total Balance</span>
                      <span className="card-icon">₹</span>
                    </div>
                    <h2>{formatAmount(totals.balance)}</h2>
                    <p>Your available balance</p>
                  </div>

                  <div className="summary-card income-card">
                    <div className="card-top">
                      <span>Total Income</span>
                      <span className="card-icon">↗</span>
                    </div>
                    <h2>{formatAmount(totals.income)}</h2>
                    <p>Your total earnings</p>
                  </div>

                  <div className="summary-card expense-card">
                    <div className="card-top">
                      <span>Total Expenses</span>
                      <span className="card-icon">↘</span>
                    </div>
                    <h2>{formatAmount(totals.expenses)}</h2>
                    <p>Your total spending</p>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-heading">
                    <div>
                      <h2>Recent Transactions</h2>
                      <p>Your latest financial activity</p>
                    </div>

                    <button
                      className="view-all-btn"
                      onClick={() => setActivePage("Transactions")}
                    >
                      View All →
                    </button>
                  </div>

                  {renderTransactions(recentTransactions)}
                </div>
              </section>
            )}

            {/* TRANSACTIONS PAGE */}
            {activePage === "Transactions" && (
              <section className="page-content">
                <div className="section-card">
                  <div className="section-heading">
                    <div>
                      <h2>All Transactions</h2>
                      <p>Manage all your income and expenses</p>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() => {
                        resetForm();
                        setActivePage("Manage");
                      }}
                    >
                      + Add Transaction
                    </button>
                  </div>

                  {renderTransactions(
                    [...transactions].sort(
                      (a, b) => new Date(b.date) - new Date(a.date)
                    )
                  )}
                </div>
              </section>
            )}

            {/* REPORTS PAGE */}
            {activePage === "Reports" && (
              <section className="page-content">
                <div className="reports-grid">
                  <div className="section-card chart-card">
                    <div className="section-heading">
                      <div>
                        <h2>Income vs Expenses</h2>
                        <p>Overall financial comparison</p>
                      </div>
                    </div>

                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatAmount(value)} />
                          <Legend />
                          <Bar
                            dataKey="amount"
                            name="Amount"
                            fill="#5b67e8"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="section-card chart-card">
                    <div className="section-heading">
                      <div>
                        <h2>Spending by Category</h2>
                        <p>Expense category breakdown</p>
                      </div>
                    </div>

                    <div className="chart-container">
                      {categoryData.length === 0 ? (
                        <div className="empty-chart">
                          No expense data available.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={105}
                              label
                            >
                              {categoryData.map((entry, index) => (
                                <Cell
                                  key={entry.name}
                                  fill={
                                    [
                                      "#5b67e8",
                                      "#20b486",
                                      "#f4a340",
                                      "#e56b83",
                                      "#8d72db",
                                      "#45a6d5",
                                      "#9baf45",
                                    ][index % 7]
                                  }
                                />
                              ))}
                            </Pie>

                            <Tooltip
                              formatter={(value) => formatAmount(value)}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                <div className="summary-grid report-summary">
                  <div className="summary-card income-card">
                    <span>Total Income</span>
                    <h2>{formatAmount(totals.income)}</h2>
                  </div>

                  <div className="summary-card expense-card">
                    <span>Total Expenses</span>
                    <h2>{formatAmount(totals.expenses)}</h2>
                  </div>

                  <div className="summary-card balance-card">
                    <span>Net Balance</span>
                    <h2>{formatAmount(totals.balance)}</h2>
                  </div>
                </div>
              </section>
            )}

            {/* MANAGE PAGE */}
            {activePage === "Manage" && (
              <section className="page-content manage-grid">
                {/* Profile Section */}
                <div className="section-card profile-card">
                  <div className="section-heading">
                    <div>
                      <h2>Profile Details</h2>
                      <p>Manage your personal information</p>
                    </div>

                    {!editProfile && (
                      <button
                        className="edit-profile-btn"
                        onClick={() => {
                          setProfileForm(profile);
                          setEditProfile(true);
                        }}
                      >
                        ✏ Edit Profile
                      </button>
                    )}
                  </div>

                  {editProfile ? (
                    <form
                      className="profile-form"
                      onSubmit={handleProfileSave}
                    >
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            name: e.target.value,
                          })
                        }
                        required
                      />

                      <label>Email Address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            email: e.target.value,
                          })
                        }
                        required
                      />

                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            phone: e.target.value,
                          })
                        }
                      />

                      <div className="form-actions">
                        <button type="submit" className="primary-btn">
                          Save Changes
                        </button>

                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={() => setEditProfile(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="profile-details">
                      <div className="large-avatar">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="profile-info">
                        <div>
                          <span>Full Name</span>
                          <strong>{profile.name}</strong>
                        </div>

                        <div>
                          <span>Email Address</span>
                          <strong>{profile.email}</strong>
                        </div>

                        <div>
                          <span>Phone Number</span>
                          <strong>{profile.phone || "Not added"}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction Form */}
                <div className="section-card transaction-form-card">
                  <div className="section-heading">
                    <div>
                      <h2>
                        {editingId !== null
                          ? "Edit Transaction"
                          : "Add New Transaction"}
                      </h2>

                      <p>
                        {editingId !== null
                          ? "Update your transaction details"
                          : "Enter your income or expense details"}
                      </p>
                    </div>
                  </div>

                  <form className="transaction-form" onSubmit={handleSubmit}>
                    <label>Description</label>

                    <input
                      ref={titleInputRef}
                      type="text"
                      placeholder="Enter description"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />

                    <label>Amount (₹)</label>

                    <input
                      type="number"
                      placeholder="Enter amount"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />

                    <label>Transaction Type</label>

                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>

                    <label>Category</label>

                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <label>Date</label>

                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={saving}
                      >
                        {saving
                          ? "Saving..."
                          : editingId !== null
                          ? "Update Transaction"
                          : "Add Transaction"}
                      </button>

                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={resetForm}
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;