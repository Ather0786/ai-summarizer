
import { useState, useEffect } from "react";
import "./App.css";

function App() {
  // Authentication states
  const [user, setUser] = useState(null);
  const [checkingLogin, setCheckingLogin] = useState(true);

  // Summarizer states
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Check whether the user is logged in
  useEffect(() => {
    const checkUser = async () => {
      console.log("Checking login status...");

      try {
        const response = await fetch(
          "http://localhost:5000/auth/user",
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();

          console.log("User is logged in:", data.user);
          setUser(data.user);
        } else {
          console.log("No logged-in user found");
          setUser(null);
        }
      } catch (error) {
        console.error("Login check failed:", error);
        setUser(null);
      } finally {
        setCheckingLogin(false);
      }
    };

    checkUser();
  }, []);
  // fetch their previous history when they log in.
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // Google login
  const handleGoogleLogin = () => {
    console.log("Starting Google login...");

    window.location.href =
      "http://localhost:5000/auth/google";
  };

  // Logout
  const handleLogout = async () => {
    console.log("Logging out...");

    try {
      const response = await fetch(
        "http://localhost:5000/auth/logout",
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        console.log("Logout successful");
        setUser(null);
      } else {
        console.error("Logout request failed");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Handle text input
  const handleTextChange = (e) => {
    setText(e.target.value);
    setError("");
    setSummary("");
  };
  // Creating a function to fetch history
  const fetchHistory = async () => {
    try {
      console.log("Fetching summary history...");

      setLoadingHistory(true);

      const response = await fetch(
        "http://localhost:5000/api/history",
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch history");
      }

      console.log("History received:", data.summaries.length);

      setHistory(data.summaries);

    } catch (error) {
      console.error("History fetching error:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Generate summary
  const handleSummarize = async () => {
    console.log("Summarize button clicked");

    if (!text.trim()) {
      setError("Please enter some text to summarize.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");

    try {
      console.log("Sending text to backend...");
      console.log("Text length:", text.length);

      const response = await fetch(
        "http://localhost:5000/api/summarize",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: text,
          }),
        }
      );

      console.log("Backend response status:", response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate summary."
        );
      }

      console.log("Summary received successfully");

      setSummary(data.summary);
      await fetchHistory();

    } catch (error) {
      console.error("Summarization error:", error);

      setError(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      console.log("Summarization process completed");
      setLoading(false);
    }
  };
  //Adding the delete function in App.jsx
  const handleDelete = async (id) => {
    try {
      console.log("Deleting summary:", id);

      const response = await fetch(
        `http://localhost:5000/api/history/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete summary");
      }

      console.log("Summary deleted successfully:", id);

      // Refresh history after deletion
      await fetchHistory();

    } catch (error) {
      console.error("Summary deletion error:", error);
      setError(error.message);
    }
  };

  // Word and character count
  const wordCount = text.trim()
    ? text.trim().split(/\s+/).length
    : 0;

  const characterCount = text.length;

  // Show loading screen while checking authentication
  if (checkingLogin) {
    return (
      <div className="app">
        <div className="container">
          <h2>Checking login...</h2>
        </div>
      </div>
    );
  }

  // Show Google login page if user is not logged in
  if (!user) {
    return (
      <div className="app">
        <div className="container">
          <h1>AI Summarizer</h1>

          <p className="subtitle">
            Sign in to summarize your text using AI.
          </p>

          <button onClick={handleGoogleLogin}>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // Main summarizer application

  return (
    <div className="app">
      <div className="container">

        {/* User profile section */}
        <div className="user-header">
          <div className="user-info">
            {user.picture && (
              <img
                src={user.picture}
                alt="Profile"
                className="profile-picture"
              />
            )}

            <div>
              <p className="welcome-text">
                Welcome, {user.name}
              </p>

              <p className="user-email">
                {user.email}
              </p>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        <h1>AI Summarizer</h1>

        <p className="subtitle">
          Turn long text into clear and concise summaries.
        </p>

        {/* Text input */}
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Paste your text here..."
          rows="10"
        />

        {/* Word and character count */}
        <div className="info">
          <span>Words: {wordCount}</span>
          <span>Characters: {characterCount}</span>
        </div>

        {/* Summarize button */}
        <button
          onClick={handleSummarize}
          disabled={loading || !text.trim()}
        >
          {loading ? "Summarizing..." : "Summarize Text"}
        </button>

        {/* Error message */}
        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {/* Generated summary */}
        {summary && (
          <div className="summary-box">
            <h2>Summary</h2>
            <p>{summary}</p>
          </div>
        )}

        {/* Summary History */}
        <div className="history-section">
          <h2>Summary History</h2>

          {loadingHistory && <p>Loading history...</p>}

          {!loadingHistory && history.length === 0 && (
            <p>No previous summaries found.</p>
          )}

          {history.map((item) => (
            <div className="history-card" key={item._id}>

              <p className="history-date">
                {new Date(item.createdAt).toLocaleString()}
              </p>

              <h3>Original Text</h3>
              <p>{item.originalText}</p>

              <h3>Generated Summary</h3>
              <p>{item.summary}</p>

              <button
                onClick={() => {
                  setText(item.originalText);
                  setSummary(item.summary);

                  console.log(
                    "Previous summary opened:",
                    item._id
                  );
                }}
              >
                View Summary
              </button>
              <button
                onClick={() => handleDelete(item._id)}
              >
                Delete Summary
              </button>

            </div>
          ))}
        </div>

      </div>
    </div>
  );

}

export default App;
