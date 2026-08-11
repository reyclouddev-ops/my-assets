const fs=require("fs");
const path=require("path");
const os=require("os");
const axios=require("axios");
const AdmZip=require("adm-zip");

const VERCEL_API="https://api.vercel.com";
const VERCEL_TOKEN=String(process.env.API_TOKEN||"").trim();
const VERCEL_DOMAIN=String(process.env.API_DOMAIN||"")
.replace(/^https?:///,"")
.replace(//+$/,"");

const MAX_FILE_SIZE=2010241024;

module.exports.config={
api:{
bodyParser:false
}
};

function headers(){
return{
Authorization:"Bearer ${VERCEL_TOKEN}",
Accept:"application/json",
"Content-Type":"application/json"
};
}

function send(res,data){
res.write("${JSON.stringify(data)}\n");
}

function cleanProjectName(name){
return String(name||"")
.trim()
.toLowerCase()
.replace(/.(zip|html?)$/i,"")
.replace(/[^a-z0-9-]/g,"-")
.replace(/-+/g,"-")
.replace(/^-|-$/g,"");
}

function validProjectName(name){
return /^[a-z0-9][a-z0-9-]{1,62}$/.test(name);
}

function extension(name){
return path.extname(name||"").toLowerCase();
}

function collectFiles(directory,base=directory){
const result=[];

if(!fs.existsSync(directory)){
return result;
}

for(const entry of fs.readdirSync(directory,{withFileTypes:true})){

const full=path.join(directory,entry.name);

if(entry.isDirectory()){
result.push(...collectFiles(full,base));
}else{
result.push({
filePath:full,
fileName:path.relative(base,full).replace(/\/g,"/")
});
}

}

return result;
}

function findFile(directory,filename){
const target=filename.toLowerCase();

return collectFiles(directory).find(
file=>file.fileName.toLowerCase()===target
);
}

function readJson(directory,filename){
const file=findFile(directory,filename);

if(!file){
return null;
}

try{
return JSON.parse(
fs.readFileSync(file.filePath,"utf8")
);
}catch{
return null;
}

}

function detectFramework(directory){

const pkg=readJson(directory,"package.json");
const vercel=readJson(directory,"vercel.json");

const dependencies={
...(pkg?.dependencies||{}),
...(pkg?.devDependencies||{})
};

const names=Object.keys(dependencies)
.map(name=>name.toLowerCase());

if(names.includes("next")){
return{
name:"Next.js",
preset:"nextjs"
};
}

if(names.includes("nuxt")){
return{
name:"Nuxt",
preset:"nuxtjs"
};
}

if(names.includes("astro")){
return{
name:"Astro",
preset:"astro"
};
}

if(names.includes("@sveltejs/kit")){
return{
name:"SvelteKit",
preset:"sveltekit"
};
}

if(names.includes("vite")){
return{
name:"Vite",
preset:"vite"
};
}

if(names.includes("react")){
return{
name:"React",
preset:"create-react-app"
};
}

if(names.includes("vue")){
return{
name:"Vue",
preset:"vue"
};
}

if(vercel){
return{
name:"Vercel Config",
preset:"vercel.json"
};
}

if(findFile(directory,"index.html")){
return{
name:"Static HTML",
preset:"static"
};
}

return{
name:"Static / Auto",
preset:"auto"
};

}

function normalizeProjectRoot(directory){

const entries=fs.readdirSync(directory,{
withFileTypes:true
});

if(
entries.length!==1||
!entries[0].isDirectory()
){
return directory;
}

const child=path.join(
directory,
entries[0].name
);

const childEntries=fs.readdirSync(child,{
withFileTypes:true
});

const hasProjectFile=childEntries.some(
entry=>
entry.name==="package.json"||
entry.name==="vercel.json"||
entry.name==="index.html"
);

return hasProjectFile?child:directory;

}

function parseMultipart(req){

return new Promise((resolve,reject)=>{

const contentType=req.headers["content-type"]||"";

const match=contentType.match(
/boundary=(?:"([^"]+)"|([^;]+))/
);

if(!match){
return reject(
new Error("Multipart boundary tidak ditemukan.")
);
}

const boundary=match[1]||match[2];
const chunks=[];
let received=0;

req.on("data",chunk=>{

received+=chunk.length;

if(received>MAX_FILE_SIZE+1024*1024){
req.destroy();

return reject(
new Error("Ukuran upload terlalu besar.")
);
}

chunks.push(chunk);

});

req.on("end",()=>{

try{

const buffer=Buffer.concat(chunks);
const marker=Buffer.from("--${boundary}");
const parts=[];
let start=0;

while(true){

const index=buffer.indexOf(marker,start);

if(index===-1){
break;
}

if(start!==0){
parts.push(buffer.slice(start,index));
}

start=index+marker.length;

}

const fields={};
let file=null;

for(const rawPart of parts){

let part=rawPart;

if(
part[0]===13&&
part[1]===10
){
part=part.slice(2);
}

const separator=Buffer.from("\r\n\r\n");
const headerEnd=part.indexOf(separator);

if(headerEnd===-1){
continue;
}

const header=part.slice(0,headerEnd).toString();
let content=part.slice(
headerEnd+separator.length
);

if(
content.length>=2&&
content[content.length-2]===13&&
content[content.length-1]===10
){
content=content.slice(0,-2);
}

const nameMatch=header.match(/name="([^"]+)"/);

if(!nameMatch){
continue;
}

const fieldName=nameMatch[1];
const filenameMatch=header.match(
/filename="([^"]*)"/
);

if(filenameMatch){

file={
filename:path.basename(filenameMatch[1]),
buffer:content
};

}else{

fields[fieldName]=content.toString();

}

}

resolve({
fields,
file
});

}catch(error){
reject(error);
}

});

req.on("error",reject);

});

}

async function createProject(projectName){

try{

const response=await axios.post(
"${VERCEL_API}/v9/projects",
{
name:projectName
},
{
headers:headers(),
timeout:30000
}
);

return response.data;

}catch(error){

if(error.response?.status===409){

const response=await axios.get(
"${VERCEL_API}/v9/projects/${encodeURIComponent(projectName)}",
{
headers:headers(),
timeout:30000
}
);

return response.data;

}

throw error;

}

}

async function deployFiles(
projectName,
directory
){

const files=collectFiles(directory);

if(!files.length){
throw new Error("Tidak ada file untuk dideploy.");
}

const payload=[];

for(const file of files){

const buffer=fs.readFileSync(file.filePath);

payload.push({
file:file.fileName,
data:buffer.toString("base64"),
encoding:"base64"
});

}

const response=await axios.post(
"${VERCEL_API}/v13/deployments",
{
name:projectName,
project:projectName,
files:payload
},
{
headers:headers(),
timeout:120000,
maxContentLength:5010241024,
maxBodyLength:5010241024
}
);

return response.data;

}

async function getDeployment(id){

const response=await axios.get(
"${VERCEL_API}/v13/deployments/${encodeURIComponent(id)}",
{
headers:headers(),
timeout:30000
}
);

return response.data;

}

async function waitDeployment(
id,
update
){

let lastState="";

for(let i=0;i<90;i++){

const deployment=await getDeployment(id);
const state=deployment.readyState||"UNKNOWN";

if(state!==lastState){

lastState=state;

await update(
state,
Math.min(90,80+i)
);

}

if(state==="READY"){
return deployment;
}

if(
state==="ERROR"||
state==="CANCELED"
){
throw new Error(
"Deployment ${state.toLowerCase()}."
);
}

await new Promise(
resolve=>setTimeout(resolve,2000)
);

}

throw new Error(
"Deployment terlalu lama diproses."
);

}

async function addCustomDomain(
projectName,
domain
){

try{

const response=await axios.post(
"${VERCEL_API}/v10/projects/${encodeURIComponent(projectName)}/domains",
{
name:domain
},
{
headers:headers(),
timeout:30000
}
);

return{
success:true,
data:response.data
};

}catch(error){

const data=error.response?.data;
const message=JSON.stringify(data||"").toLowerCase();

if(
error.response?.status===400||
error.response?.status===409
){

if(
message.includes("already")||
message.includes("exists")||
message.includes("assigned")
){

return{
success:true,
alreadyExists:true,
data
};

}

}

return{
success:false,
error:
data?.error?.message||
error.message
};

}

}

async function checkDomain(domain){

try{

const response=await axios.get(
"${VERCEL_API}/v4/domains/${encodeURIComponent(domain)}/config",
{
headers:headers(),
timeout:30000
}
);

return response.data;

}catch{
return null;
}

}

async function waitCustomDomain(
domain,
update
){

for(let i=0;i<30;i++){

const result=await checkDomain(domain);

if(result?.misconfigured===false){

await update(
100,
"Custom domain aktif"
);

return true;

}

const progress=90+Math.min(
9,
Math.floor(i/3)
);

await update(
progress,
"Menunggu konfigurasi custom domain..."
);

await new Promise(
resolve=>setTimeout(resolve,2000)
);

}

return false;

}

function prepareProject(
file,
workDir
){

const ext=extension(file.filename);
const sourcePath=path.join(
workDir,
file.filename
);

fs.writeFileSync(
sourcePath,
file.buffer
);

if(ext===".zip"){

const siteDir=path.join(
workDir,
"site"
);

fs.mkdirSync(
siteDir,
{
recursive:true
}
);

const zip=new AdmZip(sourcePath);

zip.extractAllTo(
siteDir,
true
);

return normalizeProjectRoot(siteDir);

}

if(
ext===".html"||
ext===".htm"
){

const siteDir=path.join(
workDir,
"site"
);

fs.mkdirSync(
siteDir,
{
recursive:true
}
);

fs.copyFileSync(
sourcePath,
path.join(siteDir,"index.html")
);

return siteDir;

}

throw new Error(
"Format tidak didukung."
);

}

function errorMessage(error){

return(
error.response?.data?.error?.message||
error.response?.data?.message||
error.message||
"Deployment gagal."
);

}

module.exports=async function(req,res){

if(req.method!=="POST"){

return res.status(405).json({
success:false,
error:"Method tidak diizinkan."
});

}

if(!VERCEL_TOKEN){

return res.status(500).json({
success:false,
error:"API_TOKEN belum dikonfigurasi di Vercel."
});

}

res.setHeader(
"Content-Type",
"application/x-ndjson; charset=utf-8"
);

res.setHeader(
"Cache-Control",
"no-cache, no-transform"
);

res.setHeader(
"Connection",
"keep-alive"
);

res.flushHeaders?.();

let workDir=null;

const progress=async(
percent,
stage,
message,
extra={}
)=>{

send(res,{
success:true,
type:"progress",
progress:percent,
stage,
message,
...extra
});

};

try{

await progress(
0,
"prepare",
"Menyiapkan deployment..."
);

const body=await parseMultipart(req);

const projectName=cleanProjectName(
body.fields.projectName
);

if(!validProjectName(projectName)){

throw new Error(
"Hostname tidak valid. Gunakan huruf kecil, angka, dan tanda -."
);

}

if(!body.file){

throw new Error(
"File project belum dikirim."
);

}

const fileName=body.file.filename||"project.zip";
const ext=extension(fileName);

if(
![".zip",".html",".htm"].includes(ext)
){

throw new Error(
"Format file harus ZIP, HTML, atau HTM."
);

}

if(body.file.buffer.length>MAX_FILE_SIZE){

throw new Error(
"Ukuran file maksimal 20 MB."
);

}

workDir=fs.mkdtempSync(
path.join(
os.tmpdir(),
"reycloud-deploy-"
)
);

await progress(
8,
"upload",
"File diterima.",
{
fileName,
fileSize:body.file.buffer.length
}
);

const siteDir=prepareProject(
body.file,
workDir
);

await progress(
22,
"extract",
ext===".zip"
?"ZIP berhasil diekstrak."
:"HTML berhasil diproses."
);

const framework=detectFramework(siteDir);

const siteFiles=collectFiles(siteDir);

if(!siteFiles.length){

throw new Error(
"Project tidak mempunyai file."
);

}

await progress(
35,
"detect",
"Framework berhasil dideteksi.",
{
framework:framework.name,
preset:framework.preset,
files:siteFiles.length
}
);

await progress(
45,
"project",
"Membuat project Vercel..."
);

await createProject(projectName);

await progress(
55,
"upload",
"Mengupload project ke Vercel...",
{
projectName
}
);

const deployment=await deployFiles(
projectName,
siteDir
);

await progress(
68,
"building",
"Project diterima Vercel. Memulai build...",
{
deploymentId:deployment.id
}
);

const ready=await waitDeployment(
deployment.id,
async(state,percent)=>{

await progress(
percent,
"building",
"Vercel status: ${state}",
{
deploymentId:deployment.id,
vercelState:state
}
);

}
);

const vercelUrl=ready.url
?"https://${ready.url}"
:"https://${projectName}.vercel.app";

await progress(
90,
"domain",
"Deployment berhasil. Menyiapkan custom domain...",
{
vercelUrl
}
);

let customDomain=null;
let domainReady=false;

if(VERCEL_DOMAIN){

customDomain=
"${projectName}.${VERCEL_DOMAIN}";

const result=await addCustomDomain(
projectName,
customDomain
);

if(result.success){

domainReady=await waitCustomDomain(
customDomain,
async(percent,message)=>{

await progress(
percent,
"domain",
message,
{
customDomain:"https://${customDomain}"
}
);

}
);

}

}

await progress(
100,
"complete",
"Deployment selesai!",
{
projectName,
framework:framework.name,
files:siteFiles.length,
deploymentId:deployment.id,
vercelUrl,
customDomain:
customDomain
?"https://${customDomain}"
:null,
domainReady
});

send(res,{
success:true,
type:"complete",
progress:100,
message:"Deployment selesai!",
projectName,
fileName,
framework:framework.name,
preset:framework.preset,
files:siteFiles.length,
deploymentId:deployment.id,
vercelUrl,
customDomain:
customDomain
?"https://${customDomain}"
:null,
domainReady
});

res.end();

}catch(error){

console.error(
"[REYCLOUD DEPLOY]",
error.response?.data||
error.message||
error
);

send(res,{
success:false,
type:"error",
progress:0,
stage:"error",
message:errorMessage(error)
});

res.end();

}finally{

if(
workDir&&
fs.existsSync(workDir)
){

try{

fs.rmSync(
workDir,
{
recursive:true,
force:true
}
);

}catch{}

}

}

};
