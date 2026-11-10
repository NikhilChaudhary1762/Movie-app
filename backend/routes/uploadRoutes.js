const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { uploadVideo, b2Enabled } = require('../config/b2Storage');
const router = express.Router();

const tempDir = path.resolve(process.env.UPLOAD_TEMP_DIR || path.join(__dirname, '../temp-uploads'));
const chunkDir = path.join(tempDir, 'chunks');
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(chunkDir, { recursive: true });

const CHUNK_SIZE = Number(process.env.UPLOAD_CHUNK_SIZE || 8 * 1024 * 1024);
const MAX_SIZE = Number(process.env.MAX_VIDEO_SIZE || 53687091200);
const allowedFormats = ['.mp4','.mkv','.mov','.avi','.webm','.wmv','.mpeg','.mpg','.3gp','.m4v','.flv','.ts','.ogv','.m2ts','.mts','.vob','.divx','.xvid'];

const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>cb(null,tempDir),
  filename: (_req,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({ storage, fileFilter: (_req,file,cb)=>allowedFormats.includes(path.extname(file.originalname).toLowerCase()) ? cb(null,true) : cb(new Error('Unsupported video format. Choose a supported video file.')), limits: { fileSize: MAX_SIZE, files: 1 } });
const chunkUpload = multer({ storage: multer.diskStorage({
  destination: (req,_file,cb)=>{ const dir=path.join(chunkDir,req.params.uploadId); fs.mkdirSync(dir,{recursive:true}); cb(null,dir); },
  filename: (req,_file,cb)=>cb(null,`${req.params.index}.part`)
}), limits:{fileSize:CHUNK_SIZE,files:1} });

function validId(id){ return /^[a-f0-9-]{20,80}$/i.test(id || ''); }
function uploadPath(id){ if(!validId(id)) throw new Error('Invalid upload ID'); return path.join(chunkDir,id); }
function metaPath(id){ return path.join(uploadPath(id),'meta.json'); }
async function readMeta(id){ try{return JSON.parse(await fsp.readFile(metaPath(id),'utf8'));}catch{return null;} }
async function handleVideo(req,res,type){
  let local;
  try {
    if (!req.file) return res.status(400).json({success:false,message:'Please select a video file'});
    local=req.file.path;
    const url=await uploadVideo(local,req.file.originalname);
    const payload={success:true,message:'Video uploaded to Backblaze B2',filename:req.file.originalname,size:req.file.size};
    if(type==='movie'){payload.watchUrl=url;payload.downloadUrl=url;} else {payload.videoUrl=url;payload.downloadUrl=url;}
    return res.status(201).json(payload);
  } catch(err){ console.error('B2 video upload:',err); return res.status(500).json({success:false,message:err.message||'Video upload failed'}); }
  finally { if(local) fsp.unlink(local).catch(()=>{}); }
}

// Start/resume a chunked upload session. Client supplies a stable uploadId to resume.
router.post('/chunk/init', async (req,res)=>{
  try {
    const { uploadId, name, size, type } = req.body || {};
    if(!name || !Number.isFinite(Number(size)) || Number(size)<=0 || Number(size)>MAX_SIZE) return res.status(400).json({success:false,message:'Invalid file name/size'});
    const ext=path.extname(name).toLowerCase();
    if(!allowedFormats.includes(ext)) return res.status(400).json({success:false,message:'Unsupported video format'});
    const id=uploadId || crypto.randomUUID();
    const dir=uploadPath(id); await fsp.mkdir(dir,{recursive:true});
    let meta=await readMeta(id);
    if(meta && (meta.name!==name || meta.size!==Number(size))) return res.status(409).json({success:false,message:'Upload ID belongs to another file'});
    if(!meta){meta={uploadId:id,name,size:Number(size),type:type||'video/*',chunkSize:CHUNK_SIZE,createdAt:new Date().toISOString()}; await fsp.writeFile(metaPath(id),JSON.stringify(meta));}
    const received=[];
    for(let i=0;i<Math.ceil(meta.size/CHUNK_SIZE);i++) if(fs.existsSync(path.join(dir,`${i}.part`))) received.push(i);
    res.json({success:true,uploadId:id,chunkSize:CHUNK_SIZE,totalChunks:Math.ceil(meta.size/CHUNK_SIZE),receivedChunks:received});
  }catch(e){res.status(400).json({success:false,message:e.message});}
});
router.get('/chunk/:uploadId/status',async(req,res)=>{
  try{const id=req.params.uploadId;const meta=await readMeta(id);if(!meta)return res.status(404).json({success:false,message:'Upload session not found'});
    const received=[];for(let i=0;i<Math.ceil(meta.size/meta.chunkSize);i++)if(fs.existsSync(path.join(uploadPath(id),`${i}.part`)))received.push(i);
    res.json({success:true,uploadId:id,chunkSize:meta.chunkSize,totalChunks:Math.ceil(meta.size/meta.chunkSize),receivedChunks:received});
  }catch(e){res.status(400).json({success:false,message:e.message});}
});
router.post('/chunk/:uploadId/:index', (req,res,next)=>{
  if(!validId(req.params.uploadId)||!/^\\d+$/.test(req.params.index))return res.status(400).json({success:false,message:'Invalid chunk path'});
  chunkUpload.single('chunk')(req,res,async(err)=>{
    if(err)return res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({success:false,message:err.message});
    try{const meta=await readMeta(req.params.uploadId);if(!meta)return res.status(404).json({success:false,message:'Upload session not found'});
      const index=Number(req.params.index);if(index>=Math.ceil(meta.size/meta.chunkSize))return res.status(400).json({success:false,message:'Chunk index out of range'});
      if(!req.file)return res.status(400).json({success:false,message:'Chunk missing'});
      const expected=Math.min(meta.chunkSize,meta.size-index*meta.chunkSize);
      if(req.file.size!==expected){await fsp.unlink(req.file.path).catch(()=>{});return res.status(400).json({success:false,message:`Invalid chunk size; expected ${expected} bytes`});}
      res.json({success:true,index,received:true});
    }catch(e){res.status(400).json({success:false,message:e.message});}
  });
});
router.post('/chunk/:uploadId/complete',async(req,res)=>{
  let merged;
  try{
    const id=req.params.uploadId, meta=await readMeta(id);if(!meta)return res.status(404).json({success:false,message:'Upload session not found'});
    const dir=uploadPath(id), total=Math.ceil(meta.size/meta.chunkSize);
    for(let i=0;i<total;i++)if(!fs.existsSync(path.join(dir,`${i}.part`)))return res.status(409).json({success:false,message:`Missing chunk ${i}`,missingChunk:i});
    merged=path.join(tempDir,`${id}${path.extname(meta.name).toLowerCase()}`);
    const out=fs.createWriteStream(merged);
    for(let i=0;i<total;i++){await new Promise((resolve,reject)=>{const input=fs.createReadStream(path.join(dir,`${i}.part`));input.on('error',reject);input.on('end',resolve);input.pipe(out,{end:false});});}
    await new Promise((resolve,reject)=>out.end(resolve).on('error',reject));
    const stat=await fsp.stat(merged);if(stat.size!==meta.size)throw new Error('Merged file size mismatch');
    const url=await uploadVideo(merged,meta.name);
    await fsp.rm(dir,{recursive:true,force:true});
    res.status(201).json({success:true,message:'Chunk upload completed and stored in B2',filename:meta.name,size:meta.size,watchUrl:url,videoUrl:url,downloadUrl:url});
  }catch(e){console.error('Chunk completion error:',e);res.status(500).json({success:false,message:e.message||'Chunk completion failed'});}
  finally{if(merged)fsp.unlink(merged).catch(()=>{});}
});
router.delete('/chunk/:uploadId',async(req,res)=>{try{await fsp.rm(uploadPath(req.params.uploadId),{recursive:true,force:true});res.json({success:true,message:'Upload session cancelled'});}catch(e){res.status(400).json({success:false,message:e.message});}});
router.post('/movie',upload.single('video'),(req,res)=>handleVideo(req,res,'movie'));
router.post('/episode',upload.single('video'),(req,res)=>handleVideo(req,res,'episode'));
router.get('/status',(req,res)=>res.json({success:true,storage:b2Enabled?'Backblaze B2':'local (B2 not configured)',b2Configured:b2Enabled,chunkSize:CHUNK_SIZE}));
router.use((err,req,res,next)=>{if(err instanceof multer.MulterError)return res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({success:false,message:err.message});if(err)return res.status(400).json({success:false,message:err.message});next();});
module.exports=router;
