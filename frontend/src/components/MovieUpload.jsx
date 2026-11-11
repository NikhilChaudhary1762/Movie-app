
import { useState } from "react";
import { uploadVideoChunks } from "../services/chunkUpload";

export default function MovieUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [watchUrl, setWatchUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;

    setWatchUrl("");
    setProgress(0);
    setMessage("");

    if (!selected) {
      setFile(null);
      return;
    }

    const isMp4 =
      selected.name.toLowerCase().endsWith(".mp4") &&
      (!selected.type || selected.type === "video/mp4");

    if (!isMp4) {
      setFile(null);
      e.target.value = "";
      setMessage(
        "Only converted MP4 videos are allowed. First run prepare-video.ps1."
      );
      return;
    }

    setFile(selected);
    setMessage("MP4 selected. Ready to upload.");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a converted MP4 video.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".mp4")) {
      setMessage("Only MP4 videos are allowed.");
      return;
    }

    setLoading(true);
    setProgress(0);
    setMessage("Starting resumable B2 upload...");
    setWatchUrl("");

    try {
      const result = await uploadVideoChunks(file, {
        onProgress: setProgress,
        onMessage: setMessage,
      });

      const url = result.watchUrl || result.videoUrl;

      if (!url) {
        throw new Error("Upload completed but video URL was not returned.");
      }

      setWatchUrl(url);
      setMessage("MP4 uploaded successfully!");
      onUploaded?.(url);
    } catch (error) {
      console.error("Movie upload error:", error);

      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Upload failed. Select the same file again to resume."
      );
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setMessage("Watch URL copied!");
    } catch {
      setMessage("Unable to copy URL.");
    }
  };

  return (
    <div className="dashboard-panel">
      <h2>Upload Movie Video (MP4 + Chunk Resume)</h2>

      <div style={{ marginBottom: 12 }}>
        <p>
          Before uploading, convert your video using
          <strong> prepare-video.ps1</strong>.
        </p>

        <p style={{ fontSize: 12, opacity: 0.75 }}>
          Required format: MP4 container, H.264 video, yuv420p,
          AAC audio.
        </p>
      </div>

      <input
        type="file"
        accept=".mp4,video/mp4,mkv,video/x-matroska,webm,video/webm"
        onChange={handleFileChange}
        disabled={loading}
      />

      {file && (
        <div>
          <p>Selected: {file.name}</p>
          <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 15 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span>B2 chunk upload</span>
            <span>{progress}%</span>
          </div>

          <div
            style={{
              width: "100%",
              height: 12,
              background: "#333",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#e50914",
                transition: "width .2s",
              }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="primary-btn"
        onClick={handleUpload}
        disabled={loading || !file}
      >
        {loading ? `Uploading ${progress}%` : "Upload MP4 Video"}
      </button>

      {message && <p>{message}</p>}

      {watchUrl && (
        <div>
          <label>Generated Watch URL</label>
          <input readOnly value={watchUrl} />

          <button type="button" onClick={copy}>
            Copy URL
          </button>
        </div>
      )}

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        Resume: If the network disconnects, select the exact same file
        again. Already uploaded chunks will be skipped.
      </p>
    </div>
  );
}
