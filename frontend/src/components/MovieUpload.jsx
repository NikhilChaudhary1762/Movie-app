
import { useState } from "react";
import api from "../services/api";

export default function MovieUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [watchUrl, setWatchUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  // Select video
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;

    setFile(selectedFile);
    setWatchUrl("");
    setProgress(0);
    setMessage("");
  };

  // Upload video
  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a video file");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    try {
      setLoading(true);
      setProgress(0);
      setMessage("");
      setWatchUrl("");

      const response = await api.post("/upload/movie", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round(
              (event.loaded * 100) / event.total
            );

            setProgress(percent);
          }
        },
      });

      setProgress(100);

      const url = response.data.watchUrl;

      setWatchUrl(url);
      setMessage("Video uploaded successfully!");

      if (onUploaded) {
        onUploaded(url);
      }
    } catch (error) {
      console.error("Video upload error:", error);

      setMessage(
        error.response?.data?.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Copy watch URL
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setMessage("Watch URL copied!");
    } catch {
      setMessage("Unable to copy URL");
    }
  };

  return (
    <div className="dashboard-panel">
      <h2>Upload Movie Video</h2>

      {/* Video Selection */}
      <input
        type="file"
        accept="video/*,.mp4,.mkv,.mov,.avi,.webm,.wmv,.mpeg,.mpg,.3gp,.m4v,.flv,.ts,.ogv"
        onChange={handleFileChange}
        disabled={loading}
      />

      {/* Selected Video */}
      {file && (
        <div>
          <p>Selected: {file.name}</p>
          <p>
            Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {loading && (
        <div style={{ marginTop: "15px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span>Uploading Video...</span>
            <span>{progress}%</span>
          </div>

          <div
            style={{
              width: "100%",
              height: "12px",
              background: "#333",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#e50914",
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        type="button"
        className="primary-btn"
        onClick={handleUpload}
        disabled={loading || !file}
      >
        {loading ? `Uploading ${progress}%` : "Upload Video"}
      </button>

      {/* Message */}
      {message && <p>{message}</p>}

      {/* Watch URL */}
      {watchUrl && (
        <div>
          <label>Generated Watch URL</label>

          <input
            readOnly
            value={watchUrl}
          />

          <button
            type="button"
            onClick={handleCopy}
          >
            Copy URL
          </button>
        </div>
      )}
    </div>
  );
}
