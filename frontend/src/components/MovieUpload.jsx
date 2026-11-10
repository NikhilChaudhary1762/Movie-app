import { useState } from "react";
import api from "../services/api";
import { uploadVideoChunks } from "../services/chunkUpload";

export default function MovieUpload({ onUploaded }) {
  const [file,setFile]=useState(null), [watchUrl,setWatchUrl]=useState("");
  const [loading,setLoading]=useState(false), [progress,setProgress]=useState(0), [message,setMessage]=useState("");
  const handleUpload=async()=>{
    if(!file){setMessage("Please select a video file");return;}
    setLoading(true);setProgress(0);setMessage("Starting resumable upload…");setWatchUrl("");
    try{
      const result=await uploadVideoChunks(file,{onProgress:setProgress,onMessage:setMessage});
      const url=result.watchUrl||result.videoUrl;setWatchUrl(url);setMessage("Video uploaded successfully!");
      onUploaded?.(url);
    }catch(error){console.error(error);setMessage(error.response?.data?.message||error.message||"Upload failed. Select same file and retry to resume.");}
    finally{setLoading(false);}
  };
  const copy=async()=>{try{await navigator.clipboard.writeText(watchUrl);setMessage("Watch URL copied!");}catch{setMessage("Unable to copy URL");}};
  return <div className="dashboard-panel">
    <h2>Upload Movie Video (Chunk + Resume)</h2>
    <input type="file" accept="video/*,.mp4,.mkv,.mov,.avi,.webm,.wmv,.mpeg,.mpg,.3gp,.m4v,.flv,.ts,.ogv,.m2ts,.mts,.vob,.divx,.xvid" onChange={e=>{setFile(e.target.files?.[0]||null);setWatchUrl("");setProgress(0);setMessage("");}} disabled={loading}/>
    {file&&<div><p>Selected: {file.name}</p><p>Size: {(file.size/1024/1024).toFixed(2)} MB</p></div>}
    {loading&&<div style={{marginTop:15}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span>Chunk upload / B2 transfer</span><span>{progress}%</span></div><div style={{width:"100%",height:12,background:"#333",borderRadius:10,overflow:"hidden"}}><div style={{width:`${progress}%`,height:"100%",background:"#e50914",transition:"width .2s"}}/></div></div>}
    <button type="button" className="primary-btn" onClick={handleUpload} disabled={loading||!file}>{loading?`Uploading ${progress}%`:"Upload Video (8 MB chunks)"}</button>
    {message&&<p>{message}</p>}
    {watchUrl&&<div><label>Generated Watch URL</label><input readOnly value={watchUrl}/><button type="button" onClick={copy}>Copy URL</button></div>}
    <p style={{fontSize:12,opacity:.7}}>Resume: upload same file again after network interruption. Already received chunks are skipped.</p>
  </div>;
}
